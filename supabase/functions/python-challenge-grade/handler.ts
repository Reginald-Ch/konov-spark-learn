// Request-handling logic, deliberately separated from index.ts's Deno-
// specific HTTP plumbing (serve, Response, Deno.env) so it can be verified
// directly under Node/tsx. Database access is injected via ChallengeDb
// rather than importing a Supabase client directly here — that's what lets
// the orchestration logic (gate check, run-vs-submit branching, hidden-test
// leak prevention) be tested with an in-memory fake, independent of having
// a live Supabase project to talk to. index.ts wires in the real adapter.
import { gradeAgainstTests } from '../_shared/pyInterpreter/index.ts';

export interface ChallengeRow {
  id: string;
  function_name: string;
  coin_reward: number;
}

export interface TestRow {
  input_args: unknown[];
  expected_output: unknown;
  is_hidden: boolean;
}

export interface ChallengeDb {
  countPassedLessons(participantEmail: string): Promise<number>;
  countPublishedLessons(): Promise<number>;
  getChallenge(challengeId: string): Promise<ChallengeRow | null>;
  getTests(challengeId: string, includeHidden: boolean): Promise<TestRow[]>;
  // Delegates to the record_python_challenge_attempt RPC in the real
  // adapter — atomic (advisory-locked) sticky-pass + first-pass-only coin
  // award, mirroring submit_lesson_quiz. Only called in 'submit' mode.
  recordAttempt(args: { participantEmail: string; challengeId: string; passedCount: number; total: number; code: string }): Promise<{ passed: boolean; bonusCoinsAwarded: number }>;
}

export interface GradeRequestBody {
  participant_email?: unknown;
  challenge_id?: unknown;
  code?: unknown;
  mode?: unknown;
}

export interface VisibleTestResult {
  index: number;
  passed: boolean;
  input: unknown[];
  expected: unknown;
  actual?: unknown;
}

export interface GradeResponse {
  ok: boolean;
  passedCount?: number;
  total?: number;
  results?: VisibleTestResult[];
  bonusCoinsAwarded?: number;
  passed?: boolean;
  errorType?: string;
  errorMessage?: string;
}

export async function handleGradeRequest(db: ChallengeDb, body: GradeRequestBody): Promise<{ status: number; body: GradeResponse }> {
  const { participant_email, challenge_id, code, mode } = body;

  if (typeof participant_email !== 'string' || !participant_email.trim()) {
    return { status: 400, body: { ok: false, errorType: 'runtime_error', errorMessage: 'participant_email is required.' } };
  }
  if (typeof challenge_id !== 'string' || !challenge_id) {
    return { status: 400, body: { ok: false, errorType: 'runtime_error', errorMessage: 'challenge_id is required.' } };
  }
  if (typeof code !== 'string' || !code.trim()) {
    return { status: 400, body: { ok: false, errorType: 'syntax_error', errorMessage: 'No code was submitted.' } };
  }
  if (mode !== 'run' && mode !== 'submit') {
    return { status: 400, body: { ok: false, errorType: 'runtime_error', errorMessage: 'mode must be "run" or "submit".' } };
  }

  const email = participant_email.trim().toLowerCase();

  // Server-side re-verification of the "finished all lessons" gate — never
  // trust the client's belief that this track is unlocked, same discipline
  // as submit_lesson_quiz re-checking v_was_passed IS NULL server-side
  // instead of trusting the frontend's own unlock check.
  const [passedLessons, publishedLessons] = await Promise.all([
    db.countPassedLessons(email),
    db.countPublishedLessons(),
  ]);
  if (publishedLessons === 0 || passedLessons < publishedLessons) {
    return { status: 403, body: { ok: false, errorType: 'runtime_error', errorMessage: 'Finish all lessons to unlock Python Challenges.' } };
  }

  const challenge = await db.getChallenge(challenge_id);
  if (!challenge) {
    return { status: 404, body: { ok: false, errorType: 'runtime_error', errorMessage: 'Challenge not found.' } };
  }

  const tests = await db.getTests(challenge_id, mode === 'submit');
  if (tests.length === 0) {
    return { status: 500, body: { ok: false, errorType: 'runtime_error', errorMessage: 'This challenge has no test cases configured yet.' } };
  }

  const grade = gradeAgainstTests(code, challenge.function_name, tests, { timeoutMs: 5000, maxSteps: 200000 });

  if (grade.hadError) {
    return { status: 200, body: { ok: false, errorType: grade.errorType, errorMessage: grade.errorMessage } };
  }

  if (mode === 'run') {
    // Visible-only tests were fetched, so every result here is safe to
    // return in full — no persistence, "Run" doesn't count as an attempt.
    return { status: 200, body: { ok: true, passedCount: grade.passedCount, total: grade.total, results: grade.results } };
  }

  const { passed, bonusCoinsAwarded } = await db.recordAttempt({
    participantEmail: email,
    challengeId: challenge_id,
    passedCount: grade.passedCount,
    total: grade.total,
    code,
  });

  // submit mode: only the VISIBLE subset of results goes back to the
  // client — hidden inputs/expected values never leave the server, same
  // "don't leak the answer key" discipline as get_quiz_questions omitting
  // correct_index.
  const visibleResults = grade.results.filter((_, i) => !tests[i].is_hidden);

  // bonusCoinsAwarded is already exactly 0 from the RPC unless this
  // specific submission was a genuine first pass. `passed` here is sticky
  // status (stays true on a later failed retry), not "passed this attempt".
  return {
    status: 200,
    body: { ok: true, passedCount: grade.passedCount, total: grade.total, results: visibleResults, bonusCoinsAwarded, passed },
  };
}
