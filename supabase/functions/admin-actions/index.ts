import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_PASSPHRASE = Deno.env.get("ADMIN_PASSPHRASE");

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!ADMIN_PASSPHRASE) {
    return json({ ok: false, error: "Admin panel is not configured (ADMIN_PASSPHRASE secret missing)." }, 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const { passphrase, action, payload } = body || {};
  if (passphrase !== ADMIN_PASSPHRASE) {
    return json({ ok: false, error: "Invalid passphrase" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    switch (action) {
      case "verify": {
        return json({ ok: true });
      }

      // ---------------- Hackathon lifecycle ----------------

      case "create_hackathon": {
        const { data, error } = await supabase.from("hackathons").insert(payload).select().single();
        if (error) throw error;
        return json({ ok: true, data });
      }

      case "update_hackathon": {
        const { id, ...fields } = payload;
        const { data, error } = await supabase.from("hackathons").update(fields).eq("id", id).select().single();
        if (error) throw error;
        return json({ ok: true, data });
      }

      case "delete_hackathon": {
        const { error } = await supabase.from("hackathons").delete().eq("id", payload.id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "set_hackathon_status": {
        const { id, status } = payload;
        if (!["upcoming", "live", "ended"].includes(status)) throw new Error("Invalid status");
        const update: Record<string, unknown> = { status };
        if (status === "live") {
          const { data: hackathon, error: fetchErr } = await supabase
            .from("hackathons")
            .select("start_date, end_date")
            .eq("id", id)
            .single();
          if (fetchErr) throw fetchErr;
          const durationMs = new Date(hackathon.end_date).getTime() - new Date(hackathon.start_date).getTime();
          const now = new Date();
          update.start_date = now.toISOString();
          update.end_date = new Date(now.getTime() + durationMs).toISOString();
        }
        const { data, error } = await supabase.from("hackathons").update(update).eq("id", id).select().single();
        if (error) throw error;
        return json({ ok: true, data });
      }

      case "reset_leaderboard": {
        const { error } = await supabase.from("point_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw error;
        return json({ ok: true });
      }

      // ---------------- Daily challenges ----------------

      case "create_challenge": {
        const { data, error } = await supabase.from("daily_challenges").insert(payload).select().single();
        if (error) throw error;
        return json({ ok: true, data });
      }

      case "update_challenge": {
        const { id, ...fields } = payload;
        const { data, error } = await supabase.from("daily_challenges").update(fields).eq("id", id).select().single();
        if (error) throw error;
        return json({ ok: true, data });
      }

      // ---------------- Grading (70 automated + 30 judge) ----------------

      case "grade_submission": {
        const { submission_id, auto_score, auto_breakdown, judge_score, judge_breakdown } = payload;

        const { data: submission, error: subErr } = await supabase
          .from("challenge_submissions")
          .select("id, challenge_id, hackathon_id, participant_email")
          .eq("id", submission_id)
          .single();
        if (subErr) throw subErr;

        const { data: challenge, error: chErr } = await supabase
          .from("daily_challenges")
          .select("auto_max_points, judge_max_points")
          .eq("id", submission.challenge_id)
          .single();
        if (chErr) throw chErr;

        const autoScore = clamp(Number(auto_score) || 0, 0, challenge.auto_max_points);
        const judgeScore = clamp(Number(judge_score) || 0, 0, challenge.judge_max_points);
        const total = autoScore + judgeScore;

        const { error: upsertErr } = await supabase.from("submission_scores").upsert(
          {
            submission_id,
            auto_score: autoScore,
            auto_breakdown: auto_breakdown ?? null,
            judge_score: judgeScore,
            judge_breakdown: judge_breakdown ?? null,
            total_sp: total,
            status: "finalized",
            scored_at: new Date().toISOString(),
          },
          { onConflict: "submission_id" }
        );
        if (upsertErr) throw upsertErr;

        // Replace any prior SP ledger entry for this submission (prevents duplicate/inflated totals on re-grade).
        await supabase
          .from("point_events")
          .delete()
          .eq("event_type", "daily_challenge_sp")
          .filter("metadata->>submission_id", "eq", submission_id);

        const { error: peErr } = await supabase.from("point_events").insert({
          participant_email: submission.participant_email,
          event_type: "daily_challenge_sp",
          points: total,
          hackathon_id: submission.hackathon_id,
          metadata: { submission_id, challenge_id: submission.challenge_id },
        });
        if (peErr) throw peErr;

        return json({ ok: true, data: { total_sp: total } });
      }

      // ---------------- Reward boxes ----------------

      case "close_challenge_and_award_boxes": {
        const { challenge_id, magic_box_label, issue_box_label } = payload;

        const { data: challenge, error: chErr } = await supabase
          .from("daily_challenges")
          .select("id, hackathon_id")
          .eq("id", challenge_id)
          .single();
        if (chErr) throw chErr;

        const { data: submissions, error: subErr } = await supabase
          .from("challenge_submissions")
          .select("id, participant_email, submission_scores(total_sp, status)")
          .eq("challenge_id", challenge_id);
        if (subErr) throw subErr;

        const finalized = (submissions || [])
          .filter((s: any) => s.submission_scores?.status === "finalized")
          .sort((a: any, b: any) => (b.submission_scores?.total_sp ?? 0) - (a.submission_scores?.total_sp ?? 0));

        const topThree = new Set(finalized.slice(0, 3).map((s: any) => s.participant_email));

        const candidateRows: any[] = [];
        for (const s of finalized) {
          candidateRows.push({
            hackathon_id: challenge.hackathon_id,
            challenge_id,
            participant_email: s.participant_email,
            box_type: "issue",
            contents_label: issue_box_label || "Issue Box",
          });
          if (topThree.has(s.participant_email)) {
            candidateRows.push({
              hackathon_id: challenge.hackathon_id,
              challenge_id,
              participant_email: s.participant_email,
              box_type: "magic",
              contents_label: magic_box_label || "Magic Box",
            });
          }
        }

        const { data: existingBoxes } = await supabase
          .from("reward_boxes")
          .select("participant_email, box_type")
          .eq("challenge_id", challenge_id);
        const existingKeys = new Set((existingBoxes || []).map((b: any) => `${b.participant_email}:${b.box_type}`));
        const newRows = candidateRows.filter((r) => !existingKeys.has(`${r.participant_email}:${r.box_type}`));

        if (newRows.length > 0) {
          const { error: insErr } = await supabase.from("reward_boxes").insert(newRows);
          if (insErr) throw insErr;
        }

        const { error: closeErr } = await supabase
          .from("daily_challenges")
          .update({ status: "closed" })
          .eq("id", challenge_id);
        if (closeErr) throw closeErr;

        return json({ ok: true, data: { awarded: newRows.length, top3: [...topThree] } });
      }

      case "mark_box_fulfilled": {
        const { error } = await supabase
          .from("reward_boxes")
          .update({ status: "fulfilled", fulfilled_at: new Date().toISOString() })
          .eq("id", payload.id);
        if (error) throw error;
        return json({ ok: true });
      }

      // ---------------- Forge Coins ----------------

      case "adjust_coins": {
        const { participant_email, hackathon_id, amount, reason } = payload;
        if (!participant_email || !Number.isFinite(Number(amount))) {
          throw new Error("participant_email and a numeric amount are required");
        }
        const { error } = await supabase.from("point_events").insert({
          participant_email,
          event_type: "forge_coin_adjust",
          points: Number(amount),
          hackathon_id: hackathon_id || null,
          metadata: { reason: reason || "manual_adjustment" },
        });
        if (error) throw error;
        return json({ ok: true });
      }

      default:
        return json({ ok: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("admin-actions error:", err);
    return json({ ok: false, error: (err as Error).message }, 500);
  }
});
