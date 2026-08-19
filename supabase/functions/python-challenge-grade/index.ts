import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { handleGradeRequest, ChallengeDb, ChallengeRow, TestRow } from "./handler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Real adapter for handler.ts's ChallengeDb interface — service-role client
// (bypasses RLS, and is the only caller allowed to reach
// record_python_challenge_attempt, see that migration's comment on why it
// has no anon/authenticated grant).
function makeSupabaseChallengeDb(supabase: ReturnType<typeof createClient>): ChallengeDb {
  return {
    async verifyOrMintDeviceToken(participantEmail: string, deviceToken: string | null) {
      const { data, error } = await supabase.rpc("verify_or_mint_device_token", {
        p_participant_email: participantEmail,
        p_device_token: deviceToken,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { ok: !!row?.ok, message: row?.message ?? undefined, newDeviceToken: row?.new_device_token ?? null };
    },
    async countPassedLessons(participantEmail: string): Promise<number> {
      const { count, error } = await supabase
        .from("lesson_progress")
        .select("*", { count: "exact", head: true })
        .eq("participant_email", participantEmail)
        .eq("passed", true);
      if (error) throw error;
      return count ?? 0;
    },
    async countPublishedLessons(): Promise<number> {
      const { count, error } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true);
      if (error) throw error;
      return count ?? 0;
    },
    async getChallenge(challengeId: string): Promise<ChallengeRow | null> {
      const { data, error } = await supabase
        .from("python_challenges")
        .select("id, function_name, coin_reward")
        .eq("id", challengeId)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data as ChallengeRow | null;
    },
    async getTests(challengeId: string, includeHidden: boolean): Promise<TestRow[]> {
      let query = supabase
        .from("python_challenge_tests")
        .select("input_args, expected_output, is_hidden")
        .eq("challenge_id", challengeId)
        .order("order_index", { ascending: true });
      if (!includeHidden) query = query.eq("is_hidden", false);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TestRow[];
    },
    async recordAttempt(args) {
      const { data, error } = await supabase.rpc("record_python_challenge_attempt", {
        p_participant_email: args.participantEmail,
        p_challenge_id: args.challengeId,
        p_passed_count: args.passedCount,
        p_total: args.total,
        p_code: args.code,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { passed: !!row?.passed, bonusCoinsAwarded: row?.bonus_coins_awarded ?? 0 };
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const body = await req.json();
    const { status, body: responseBody } = await handleGradeRequest(makeSupabaseChallengeDb(supabase), body);
    return json(responseBody, status);
  } catch (e) {
    console.error("python-challenge-grade error:", e);
    return json({ ok: false, errorType: "runtime_error", errorMessage: "Something went wrong grading this submission." }, 500);
  }
});
