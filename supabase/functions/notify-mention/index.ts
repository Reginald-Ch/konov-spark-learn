import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Narrowly scoped and callable directly by anon (participants trigger this
// right after sending a message that mentions someone) — unlike a raw
// send-push-notification call, this never accepts client-supplied
// title/body/target. It only ever notifies about a message that genuinely
// exists, using content fetched fresh from the database, which bounds the
// abuse surface to "re-notify someone about a real message that already
// mentioned them" rather than an open push-relay anyone could spam through.
const MENTION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { message_id } = await req.json();
    if (!message_id) throw new Error("message_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: message, error } = await supabase
      .from("community_messages")
      .select("id, content, sender_name, sender_email, created_at, edited_at, community_channels(name)")
      .eq("id", message_id)
      .maybeSingle();
    if (error || !message) throw new Error("Message not found");

    // Only ever act on a message sent/edited in the last couple of minutes
    // — closes off replaying the same message_id over and over to re-spam
    // whoever it mentions long after the fact. Checking edited_at too
    // (not just created_at) matters now that editing a message to ADD a
    // mention also calls this — without it, editing an older message to
    // mention someone would always fail this freshness check and silently
    // never notify, even though the edit itself is a genuine, ownership-
    // gated action, not a free replay of an old message_id.
    const referenceTime = message.edited_at && new Date(message.edited_at) > new Date(message.created_at)
      ? message.edited_at
      : message.created_at;
    const ageMs = Date.now() - new Date(referenceTime).getTime();
    if (ageMs > 2 * 60 * 1000) {
      return new Response(JSON.stringify({ ok: true, notified: 0, reason: "message too old" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emails = new Set<string>();
    for (const match of message.content.matchAll(MENTION_RE)) {
      const email = match[2]?.trim().toLowerCase();
      if (email && email !== message.sender_email) emails.add(email);
    }

    const channelName = (message as any).community_channels?.name || "community";
    let notified = 0;
    for (const email of emails) {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({
            title: `💬 ${message.sender_name} mentioned you`,
            body: message.content.replace(MENTION_RE, "@$1").slice(0, 120),
            participant_email: email,
            url: "/hackathons",
          }),
        });
        if (resp.ok) notified++;
      } catch (e) {
        console.error(`notify-mention: push failed for ${email}:`, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, notified, channel: channelName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
