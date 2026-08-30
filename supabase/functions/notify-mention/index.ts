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

    const rawEmails = new Set<string>();
    for (const match of message.content.matchAll(MENTION_RE)) {
      const email = match[2]?.trim().toLowerCase();
      if (email && email !== message.sender_email) rawEmails.add(email);
    }

    // The @[Name](email) sanitization (stripping ], ), newlines) only ever
    // runs when a mention is chosen from the composer's autocomplete —
    // nothing stops someone from hand-typing this markup directly with an
    // arbitrary email that was never actually offered as a candidate.
    // Cosmetically harmless (a plain, non-clickable span, no XSS/redirect
    // path), but it let anyone with the anon key trigger a real push
    // notification toward any address just by mentioning it, whether or
    // not that address ever participated in this chat. Only notifying
    // emails that are genuine known identities here (sent a message here
    // before, or a real staff account) closes that off without touching
    // legitimate mentions, since every real autocomplete candidate is
    // necessarily already one of these.
    const emails = new Set<string>();
    if (rawEmails.size > 0) {
      const candidates = Array.from(rawEmails);
      const [{ data: knownParticipants }, { data: knownStaff }] = await Promise.all([
        supabase.from("participant_device_tokens").select("participant_email").in("participant_email", candidates),
        supabase.from("community_staff").select("participant_email").in("participant_email", candidates),
      ]);
      const known = new Set<string>([
        ...(knownParticipants || []).map((r: any) => r.participant_email),
        ...(knownStaff || []).map((r: any) => r.participant_email),
      ]);
      for (const email of rawEmails) {
        if (known.has(email)) emails.add(email);
      }
    }

    const channelName = (message as any).community_channels?.name || "community";
    let notified = 0;
    for (const email of emails) {
      // Idempotency, not just the freshness check above — without this, the
      // same message_id can be replayed against this endpoint as many times
      // as a caller likes within the freshness window (and that window
      // itself gets extended indefinitely by the message's own author
      // re-editing it, see the migration comment), turning one real mention
      // into unlimited push spam toward a real person. The PRIMARY KEY on
      // (message_id, participant_email) means only the first caller for a
      // given pair can ever insert; every later call — genuine retry or
      // replay alike — hits a unique violation and is skipped here. Any
      // OTHER error fails safe (skip, don't send) rather than double-notify
      // on an unconfirmed insert.
      const { error: dedupErr } = await supabase
        .from("community_mention_notifications")
        .insert({ message_id, participant_email: email });
      if (dedupErr) {
        if (dedupErr.code !== "23505") console.error(`notify-mention: dedup insert failed for ${email}:`, dedupErr);
        continue;
      }

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
