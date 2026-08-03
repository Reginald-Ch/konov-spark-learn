import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Two roles: "organizer" can do everything; "judge" can only verify and grade
// (and even then, only the judge half of a score — see mergeAndUpsertScore).
// Credentials live in the admin_credentials table (hashed, DB-backed) rather
// than Edge Function env secrets, specifically so they can be seeded by a
// migration and rotated from the Admin Panel — no Supabase dashboard access
// required for day-to-day operation.
type Role = "organizer" | "judge";

async function resolveRole(supabase: ReturnType<typeof createClient>, passphrase: string | undefined): Promise<Role | null> {
  if (!passphrase) return null;
  const { data: isOrganizer } = await supabase.rpc("verify_admin_credential", { p_role: "organizer", p_passphrase: passphrase });
  if (isOrganizer) return "organizer";
  const { data: isJudge } = await supabase.rpc("verify_admin_credential", { p_role: "judge", p_passphrase: passphrase });
  if (isJudge) return "judge";
  return null;
}

// Everything not listed here is organizer-only.
const JUDGE_ALLOWED_ACTIONS = new Set(["verify", "grade_submission", "submit_gallery_score", "toggle_project_publish"]);

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GRADING_MODEL = "google/gemini-3-flash-preview";
const GRADING_PROMPT_VERSION = "v1";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function extractSystemPrompt(code: string): string {
  const tripleMatch = code.match(/(?:SYSTEM_MESSAGE|SYSTEM_PROMPT)\s*=\s*"""([\s\S]*?)"""/);
  if (tripleMatch) return tripleMatch[1].trim();
  const singleMatch = code.match(/(?:SYSTEM_MESSAGE|SYSTEM_PROMPT|system_message|system_prompt)\s*=\s*["'](.*)["']/);
  if (singleMatch) return singleMatch[1];
  return "You are a helpful AI assistant.";
}

// Merges partial auto/judge scoring into submission_scores, keeping whichever
// side wasn't just written, recomputes total_sp, and only finalizes (and
// touches the SP ledger) once BOTH sides are present — grading in two passes
// (auto pipeline, then a human) shouldn't award SP off a half-finished score.
async function mergeAndUpsertScore(
  supabase: ReturnType<typeof createClient>,
  args: {
    submissionId: string;
    hackathonId: string;
    challengeId: string;
    participantEmail: string;
    autoScore?: number | null;
    autoBreakdown?: unknown;
    judgeScore?: number | null;
    judgeBreakdown?: unknown;
    onTime?: boolean;
  }
) {
  const { data: existing } = await supabase
    .from("submission_scores")
    .select("auto_score, auto_breakdown, judge_score, judge_breakdown, status")
    .eq("submission_id", args.submissionId)
    .maybeSingle();

  const autoScore = args.autoScore !== undefined ? args.autoScore : existing?.auto_score ?? null;
  const autoBreakdown = args.autoBreakdown !== undefined ? args.autoBreakdown : existing?.auto_breakdown ?? null;
  const judgeScore = args.judgeScore !== undefined ? args.judgeScore : existing?.judge_score ?? null;
  const judgeBreakdown = args.judgeBreakdown !== undefined ? args.judgeBreakdown : existing?.judge_breakdown ?? null;

  const wasAlreadyFinalized = existing?.status === "finalized";
  const isFinalized = autoScore !== null && judgeScore !== null;
  const totalSp = isFinalized ? (autoScore as number) + (judgeScore as number) : null;

  const { error: upsertErr } = await supabase.from("submission_scores").upsert(
    {
      submission_id: args.submissionId,
      auto_score: autoScore,
      auto_breakdown: autoBreakdown,
      judge_score: judgeScore,
      judge_breakdown: judgeBreakdown,
      total_sp: totalSp,
      status: isFinalized ? "finalized" : "pending",
      scored_at: new Date().toISOString(),
    },
    { onConflict: "submission_id" }
  );
  if (upsertErr) throw upsertErr;

  if (isFinalized) {
    await supabase
      .from("point_events")
      .delete()
      .eq("event_type", "daily_challenge_sp")
      .filter("metadata->>submission_id", "eq", args.submissionId);

    const { error: peErr } = await supabase.from("point_events").insert({
      participant_email: args.participantEmail,
      event_type: "daily_challenge_sp",
      points: totalSp,
      hackathon_id: args.hackathonId,
      metadata: { submission_id: args.submissionId, challenge_id: args.challengeId },
    });
    if (peErr) throw peErr;

    // A Forge Key for finishing the challenge — only on the FIRST finalization
    // of this submission, so re-grading (auto-grade re-run, judge correction)
    // never mints extra keys for the same piece of work.
    if (!wasAlreadyFinalized) {
      const { error: keyErr } = await supabase.from("point_events").insert({
        participant_email: args.participantEmail,
        event_type: "forge_key",
        points: 1,
        hackathon_id: args.hackathonId,
        metadata: { source: "challenge", submission_id: args.submissionId, challenge_id: args.challengeId },
      });
      if (keyErr) throw keyErr;

      // Boost Token: stricter than the key — only if they also finished
      // before the challenge closed. Deliberately not awarded for
      // completion alone, so it stays meaningfully harder to earn.
      if (args.onTime) {
        const { error: boostErr } = await supabase.from("point_events").insert({
          participant_email: args.participantEmail,
          event_type: "boost_token",
          points: 1,
          hackathon_id: args.hackathonId,
          metadata: { source: "on_time_completion", submission_id: args.submissionId, challenge_id: args.challengeId },
        });
        if (boostErr) throw boostErr;
      }
    }
  }

  return { autoScore, judgeScore, totalSp, status: isFinalized ? "finalized" : "pending" };
}

async function acquireSlot(supabase: ReturnType<typeof createClient>, ttlSeconds = 60): Promise<number | null> {
  const { data, error } = await supabase.rpc("acquire_ai_slot", { p_ttl_seconds: ttlSeconds });
  if (error) {
    console.error("acquire_ai_slot error:", error);
    return null;
  }
  return data ?? null;
}

async function releaseSlot(supabase: ReturnType<typeof createClient>, slotId: number | null) {
  if (slotId === null) return;
  const { error } = await supabase.rpc("release_ai_slot", { p_slot_id: slotId });
  if (error) console.error("release_ai_slot error:", error);
}

interface BenchmarkTest {
  label: string;
  input: string;
  expected_contains?: string;
}

interface GradingResult {
  benchmark_results: { label: string; passed: boolean; reasoning?: string }[];
  response_quality: {
    followsPrompt: number;
    correctness: number;
    characterConsistency: number;
    safety: number;
    knowledgeBase: number;
  };
  rationale?: string;
}

async function callGradingModel(systemPrompt: string, notes: string, tests: BenchmarkTest[]): Promise<GradingResult> {
  const gradingPrompt = `You are grading an AI chatbot built by a hackathon participant. Simulate how their bot would respond, then score it. Be strict and consistent — this score determines real prizes.

BOT'S SYSTEM PROMPT:
"""
${systemPrompt}
"""

ADDITIONAL SUBMISSION NOTES (may be empty):
"""
${notes || "(none provided)"}
"""

BENCHMARK TESTS — for each, simulate the bot's response to the input, then judge whether it satisfies the expectation:
${tests.length === 0 ? "(no benchmark tests defined for this challenge — return an empty benchmark_results array)" : tests.map((t, i) => `${i + 1}. [${t.label}] Input: "${t.input}" — Expected: response should reflect "${t.expected_contains || "the system prompt's intent"}"`).join("\n")}

Then score response quality on these 5 criteria, each 0-8:
- followsPrompt: does the bot's simulated behavior match its system prompt's instructions?
- correctness: are its simulated answers factually/logically sound?
- characterConsistency: does it stay in persona/character throughout?
- safety: does it avoid unsafe, harmful, or inappropriate output?
- knowledgeBase: does it appear to ground answers in any stated knowledge rather than fabricating?

Return ONLY this JSON (no markdown fences, no commentary):
{"benchmark_results":[{"label":"...","passed":true,"reasoning":"..."}],"response_quality":{"followsPrompt":0,"correctness":0,"characterConsistency":0,"safety":0,"knowledgeBase":0},"rationale":"one sentence overall"}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GRADING_MODEL,
      messages: [{ role: "user", content: gradingPrompt }],
      temperature: 0.2,
      max_tokens: 900,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Grading model call failed: HTTP ${resp.status}`);
  }
  const data = await resp.json();
  const content: string = data.choices?.[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Grading model did not return parseable JSON");
  return JSON.parse(jsonMatch[0]) as GradingResult;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const { passphrase, action, payload } = body || {};

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const role = await resolveRole(supabase, passphrase);
  if (!role) {
    return json({ ok: false, error: "Invalid passphrase" }, 401);
  }
  if (role === "judge" && !JUDGE_ALLOWED_ACTIONS.has(action)) {
    return json({ ok: false, error: "Judges cannot perform this action" }, 403);
  }

  try {
    switch (action) {
      case "verify": {
        return json({ ok: true, data: { role } });
      }

      case "set_passphrase": {
        const { target_role, new_passphrase } = payload;
        if (!["organizer", "judge"].includes(target_role)) throw new Error("target_role must be 'organizer' or 'judge'");
        const { error } = await supabase.rpc("set_admin_credential", { p_role: target_role, p_passphrase: new_passphrase });
        if (error) throw error;
        return json({ ok: true });
      }

      // ---------------- Hackathon lifecycle (organizer only) ----------------

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
        // Scoped to one hackathon deliberately — this used to delete every
        // point_events row for every hackathon on the platform with no
        // filter at all, so "reset this event" silently wiped every other
        // past event's history too.
        const { hackathon_id } = payload;
        if (!hackathon_id) throw new Error("hackathon_id is required");
        const { error } = await supabase.from("point_events").delete().eq("hackathon_id", hackathon_id);
        if (error) throw error;
        return json({ ok: true });
      }

      // ---------------- Daily challenges (organizer only) ----------------

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

      // ---------------- Grading ----------------

      case "grade_submission": {
        const { submission_id, auto_score, auto_breakdown, judge_score, judge_breakdown } = payload;

        const { data: submission, error: subErr } = await supabase
          .from("challenge_submissions")
          .select("id, challenge_id, hackathon_id, participant_email, submitted_at")
          .eq("id", submission_id)
          .single();
        if (subErr) throw subErr;

        const { data: challenge, error: chErr } = await supabase
          .from("daily_challenges")
          .select("auto_max_points, judge_max_points, closes_at")
          .eq("id", submission.challenge_id)
          .single();
        if (chErr) throw chErr;

        // A judge credential can only ever move the judge half of the score —
        // even if a judge-role caller sends auto_score, it's dropped here.
        const canSetAuto = role === "organizer";
        const onTime = !challenge.closes_at || new Date(submission.submitted_at) <= new Date(challenge.closes_at);

        const result = await mergeAndUpsertScore(supabase, {
          submissionId: submission_id,
          hackathonId: submission.hackathon_id,
          challengeId: submission.challenge_id,
          participantEmail: submission.participant_email,
          autoScore: canSetAuto && auto_score !== undefined ? clamp(Number(auto_score) || 0, 0, challenge.auto_max_points) : undefined,
          autoBreakdown: canSetAuto && auto_breakdown !== undefined ? auto_breakdown : undefined,
          judgeScore: judge_score !== undefined ? clamp(Number(judge_score) || 0, 0, challenge.judge_max_points) : undefined,
          judgeBreakdown: judge_breakdown !== undefined ? judge_breakdown : undefined,
          onTime,
        });

        return json({ ok: true, data: result });
      }

      case "auto_grade_challenge": {
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
        const { challenge_id, force } = payload;

        const { data: challenge, error: chErr } = await supabase
          .from("daily_challenges")
          .select("id, hackathon_id, auto_max_points, closes_at, benchmark_tests")
          .eq("id", challenge_id)
          .single();
        if (chErr) throw chErr;
        const benchmarkTests = ((challenge.benchmark_tests as BenchmarkTest[]) || []);

        const { data: submissions, error: subErr } = await supabase
          .from("challenge_submissions")
          .select("id, participant_email, content_url, notes, submitted_at, project_id, submitted_code_snapshot, submission_scores(auto_score)")
          .eq("challenge_id", challenge_id);
        if (subErr) throw subErr;

        let graded = 0;
        const errors: { submission_id: string; error: string }[] = [];

        for (const s of submissions || []) {
          const existingAuto = Array.isArray((s as any).submission_scores)
            ? (s as any).submission_scores[0]?.auto_score
            : (s as any).submission_scores?.auto_score;
          if (existingAuto !== null && existingAuto !== undefined && !force) continue;

          let slotId: number | null = null;
          try {
            // Prefer the code snapshot frozen at submission time — grading
            // must reflect what existed then, not whatever the linked
            // project (editable by its author, or in theory anyone given
            // ai_projects' current RLS) contains right now.
            let systemPrompt = "You are a helpful AI assistant.";
            if (s.submitted_code_snapshot) {
              systemPrompt = extractSystemPrompt(s.submitted_code_snapshot);
            } else if (s.project_id) {
              const { data: project } = await supabase.from("ai_projects").select("code").eq("id", s.project_id).maybeSingle();
              if (project?.code) systemPrompt = extractSystemPrompt(project.code);
            }

            const timeliness = !challenge.closes_at || new Date(s.submitted_at) <= new Date(challenge.closes_at) ? 10 : 0;

            slotId = await acquireSlot(supabase, 90);
            if (slotId === null) {
              errors.push({ submission_id: s.id, error: "AI gateway busy — try again shortly" });
              continue;
            }

            const grading = await callGradingModel(systemPrompt, [s.notes, s.content_url].filter(Boolean).join("\n"), benchmarkTests);

            const passedCount = grading.benchmark_results?.filter((r) => r.passed).length ?? 0;
            const benchmarkScore = benchmarkTests.length === 0 ? 20 : Math.round((passedCount / benchmarkTests.length) * 20);

            const rq = grading.response_quality || ({} as GradingResult["response_quality"]);
            const responseQualityTotal =
              clamp(Number(rq.followsPrompt) || 0, 0, 8) +
              clamp(Number(rq.correctness) || 0, 0, 8) +
              clamp(Number(rq.characterConsistency) || 0, 0, 8) +
              clamp(Number(rq.safety) || 0, 0, 8) +
              clamp(Number(rq.knowledgeBase) || 0, 0, 8);

            const autoScore = clamp(timeliness + benchmarkScore + responseQualityTotal, 0, challenge.auto_max_points);

            await mergeAndUpsertScore(supabase, {
              submissionId: s.id,
              hackathonId: challenge.hackathon_id,
              challengeId: challenge_id,
              participantEmail: s.participant_email,
              autoScore,
              autoBreakdown: {
                timeliness,
                benchmark: benchmarkScore,
                benchmark_results: grading.benchmark_results,
                response_quality: rq,
                rationale: grading.rationale,
                prompt_version: GRADING_PROMPT_VERSION,
                model: GRADING_MODEL,
              },
              onTime: timeliness === 10,
            });
            graded++;
          } catch (e) {
            errors.push({ submission_id: s.id, error: (e as Error).message });
          } finally {
            await releaseSlot(supabase, slotId);
          }
        }

        return json({ ok: true, data: { graded, skipped: (submissions?.length || 0) - graded - errors.length, errors } });
      }

      // ---------------- Reward boxes (organizer only) ----------------

      case "close_challenge_and_award_boxes": {
        const { challenge_id, mission_box_label, issue_box_label, mission_bonus_coin_value } = payload;

        const { data: challenge, error: chErr } = await supabase
          .from("daily_challenges")
          .select("id, hackathon_id")
          .eq("id", challenge_id)
          .single();
        if (chErr) throw chErr;

        const { data: hackathon } = await supabase
          .from("hackathons")
          .select("settings")
          .eq("id", challenge.hackathon_id)
          .maybeSingle();
        const topN = Number((hackathon?.settings as any)?.mission_bonus_top_n) || 5;

        const { data: submissions, error: subErr } = await supabase
          .from("challenge_submissions")
          .select("id, participant_email, submission_scores(total_sp, status)")
          .eq("challenge_id", challenge_id);
        if (subErr) throw subErr;

        const finalized = (submissions || [])
          .filter((s: any) => s.submission_scores?.status === "finalized")
          .sort((a: any, b: any) => (b.submission_scores?.total_sp ?? 0) - (a.submission_scores?.total_sp ?? 0));

        const topNSet = new Set(finalized.slice(0, topN).map((s: any) => s.participant_email));

        const candidateRows: any[] = [];
        for (const s of finalized) {
          candidateRows.push({
            hackathon_id: challenge.hackathon_id,
            challenge_id,
            participant_email: s.participant_email,
            box_type: "issue",
            contents_label: issue_box_label || "Issue Box",
          });
          if (topNSet.has(s.participant_email)) {
            candidateRows.push({
              hackathon_id: challenge.hackathon_id,
              challenge_id,
              participant_email: s.participant_email,
              box_type: "mission",
              contents_label: mission_box_label || "Mission Bonus",
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

        // Gold/Silver/Bronze — exactly the top 3 of the (already-scarce)
        // top-N, by construction. Guarded against re-running this action
        // twice for the same challenge.
        const podium = finalized.slice(0, 3);
        const tiers = ["gold", "silver", "bronze"] as const;
        if (podium.length > 0) {
          const { data: existingBadges } = await supabase
            .from("point_events")
            .select("participant_email")
            .eq("event_type", "badge_award")
            .filter("metadata->>challenge_id", "eq", challenge_id);
          const alreadyBadged = new Set((existingBadges || []).map((b: any) => b.participant_email));
          const badgeRows = podium
            .filter((s: any) => !alreadyBadged.has(s.participant_email))
            .map((s: any, i: number) => ({
              participant_email: s.participant_email,
              event_type: "badge_award",
              points: 1,
              hackathon_id: challenge.hackathon_id,
              metadata: { tier: tiers[i], challenge_id },
            }));
          if (badgeRows.length > 0) {
            const { error: badgeErr } = await supabase.from("point_events").insert(badgeRows);
            if (badgeErr) throw badgeErr;
          }
        }

        // Optional digital bonus: a Mission Bonus can itself grant Forge
        // Coins, if the organizer set an amount for this close-out. Guarded
        // the same way as badges — safe to click Close twice.
        const coinValue = Number(mission_bonus_coin_value) || 0;
        if (coinValue > 0 && topNSet.size > 0) {
          const { data: existingCoinGrants } = await supabase
            .from("point_events")
            .select("participant_email")
            .eq("event_type", "forge_coin_grant")
            .filter("metadata->>challenge_id", "eq", challenge_id);
          const alreadyGranted = new Set((existingCoinGrants || []).map((b: any) => b.participant_email));
          const coinRows = [...topNSet]
            .filter((email) => !alreadyGranted.has(email))
            .map((email) => ({
              participant_email: email,
              event_type: "forge_coin_grant",
              points: coinValue,
              hackathon_id: challenge.hackathon_id,
              metadata: { reason: "mission_bonus", challenge_id },
            }));
          if (coinRows.length > 0) {
            const { error: coinErr } = await supabase.from("point_events").insert(coinRows);
            if (coinErr) throw coinErr;
          }
        }

        const { error: closeErr } = await supabase
          .from("daily_challenges")
          .update({ status: "closed" })
          .eq("id", challenge_id);
        if (closeErr) throw closeErr;

        return json({ ok: true, data: { awarded: newRows.length, topWinners: [...topNSet] } });
      }

      // ---------------- Project gallery judging (organizer + judge) ----------------
      // Moved here from a direct client-side insert: judge_score is now a
      // privileged point_events type (see migration ...f6c4e0b8), so this is
      // the only path that can write it.

      case "submit_gallery_score": {
        const { project_id, participant_email, points, project_name, judge_name, feedback } = payload;
        if (!project_id || !participant_email) throw new Error("project_id and participant_email are required");
        const score = clamp(Number(points) || 0, 0, 70);

        await supabase
          .from("point_events")
          .delete()
          .eq("event_type", "judge_score")
          .eq("participant_email", participant_email)
          .filter("metadata->>project_id", "eq", project_id);

        const { error } = await supabase.from("point_events").insert({
          participant_email,
          event_type: "judge_score",
          points: score,
          metadata: { project_id, project_name, judge_name, feedback: feedback || "" },
        });
        if (error) throw error;
        return json({ ok: true, data: { score } });
      }

      case "toggle_project_publish": {
        const { project_id, is_published } = payload;
        if (!project_id) throw new Error("project_id is required");
        const { error } = await supabase.from("ai_projects").update({ is_published: !!is_published }).eq("id", project_id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "list_reward_boxes": {
        const { hackathon_id } = payload;
        const { data, error } = await supabase
          .from("reward_boxes")
          .select("id, participant_email, box_type, contents_label, status, awarded_at")
          .eq("hackathon_id", hackathon_id)
          .order("awarded_at", { ascending: false });
        if (error) throw error;
        return json({ ok: true, data });
      }

      case "mark_box_fulfilled": {
        const { error } = await supabase
          .from("reward_boxes")
          .update({ status: "fulfilled", fulfilled_at: new Date().toISOString() })
          .eq("id", payload.id);
        if (error) throw error;
        return json({ ok: true });
      }

      // ---------------- Forge Coins (organizer only) ----------------

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
