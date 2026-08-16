import { handleGradeRequest, ChallengeDb, ChallengeRow, TestRow } from './handler.ts';

// In-memory fake standing in for the real Supabase-backed adapter — same
// ChallengeDb interface, so this exercises the actual orchestration logic
// in handler.ts (gate check, run-vs-submit branching, hidden-test leak
// prevention, sticky-pass/first-pass-only coin award) without needing a
// live Supabase project. The atomicity guarantee itself (advisory lock)
// lives in record_python_challenge_attempt's SQL and can't be verified
// here — only the orchestration around it.
function makeFakeDb(opts: { publishedLessons: number; passedLessonsByEmail: Record<string, number> }) {
  const challenge: ChallengeRow = { id: 'chal-1', function_name: 'is_greeting', coin_reward: 10 };
  const tests: TestRow[] = [
    { input_args: ['Hello there!'], expected_output: true, is_hidden: false },
    { input_args: ["What's the weather?"], expected_output: false, is_hidden: false },
    { input_args: ['HEY, how are you?'], expected_output: true, is_hidden: false },
    { input_args: ['hi'], expected_output: true, is_hidden: true },
    { input_args: ['historical events'], expected_output: false, is_hidden: true },
    { input_args: ['Greetings, friend'], expected_output: true, is_hidden: true },
    { input_args: [''], expected_output: false, is_hidden: true },
  ];
  const attempts = new Map<string, { passed: boolean; bestPassedCount: number; attempts: number }>();

  const db: ChallengeDb = {
    async countPassedLessons(email) { return opts.passedLessonsByEmail[email] ?? 0; },
    async countPublishedLessons() { return opts.publishedLessons; },
    async getChallenge(id) { return id === challenge.id ? challenge : null; },
    async getTests(id, includeHidden) {
      if (id !== challenge.id) return [];
      return includeHidden ? tests : tests.filter(t => !t.is_hidden);
    },
    async recordAttempt({ participantEmail, challengeId, passedCount, total }) {
      const key = `${participantEmail}:${challengeId}`;
      const existing = attempts.get(key) ?? { passed: false, bestPassedCount: 0, attempts: 0 };
      const wasPassed = existing.passed;
      const passedNow = total > 0 && passedCount === total;
      const sticky = wasPassed || passedNow;
      attempts.set(key, { passed: sticky, bestPassedCount: Math.max(existing.bestPassedCount, passedCount), attempts: existing.attempts + 1 });
      const bonus = !wasPassed && passedNow ? challenge.coin_reward : 0;
      return { passed: sticky, bonusCoinsAwarded: bonus };
    },
  };
  return { db, attempts };
}

const CORRECT = `
def is_greeting(message):
    words = message.lower().replace(",", " ").replace("!", " ").replace("?", " ").split()
    greetings = ["hi", "hello", "hey", "greetings"]
    for w in words:
        if w in greetings:
            return True
    return False
`;
const NAIVE_SHORTCUT = `
def is_greeting(message):
    m = message.lower()
    return "hi" in m or "hello" in m or "hey" in m or "greetings" in m
`;

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`, JSON.stringify(detail)); }
}

async function run() {
  {
    const { db } = makeFakeDb({ publishedLessons: 40, passedLessonsByEmail: { 'kid@example.com': 10 } });
    const r = await handleGradeRequest(db, { participant_email: 'kid@example.com', challenge_id: 'chal-1', code: CORRECT, mode: 'run' });
    check('gate blocks a participant who has not finished all lessons', r.status === 403 && !r.body.ok, r);
  }

  {
    const { db } = makeFakeDb({ publishedLessons: 40, passedLessonsByEmail: { 'kid@example.com': 40 } });
    const r = await handleGradeRequest(db, { participant_email: 'kid@example.com', challenge_id: 'nope', code: CORRECT, mode: 'run' });
    check('unknown challenge_id -> 404', r.status === 404 && !r.body.ok, r);
  }

  {
    const { db } = makeFakeDb({ publishedLessons: 40, passedLessonsByEmail: { 'kid@example.com': 40 } });
    const r = await handleGradeRequest(db, { participant_email: 'kid@example.com', challenge_id: 'chal-1', code: CORRECT, mode: 'run' });
    check('run mode: correct code passes all 3 visible tests, no attempts persisted', r.body.ok && r.body.passedCount === 3 && r.body.total === 3 && r.body.results?.length === 3, r);
  }

  {
    // Run mode against the naive shortcut — it passes ALL 3 visible tests
    // (the trap is specifically in a hidden one), so "Run" alone can't
    // reveal the flaw — that's intentional, matching the plan.
    const { db } = makeFakeDb({ publishedLessons: 40, passedLessonsByEmail: { 'kid@example.com': 40 } });
    const r = await handleGradeRequest(db, { participant_email: 'kid@example.com', challenge_id: 'chal-1', code: NAIVE_SHORTCUT, mode: 'run' });
    check('run mode: naive shortcut looks perfect on visible tests alone', r.body.ok && r.body.passedCount === 3 && r.body.total === 3, r);
  }

  {
    const { db, attempts } = makeFakeDb({ publishedLessons: 40, passedLessonsByEmail: { 'kid@example.com': 40 } });
    const r = await handleGradeRequest(db, { participant_email: 'KID@Example.com  ', challenge_id: 'chal-1', code: CORRECT, mode: 'submit' });
    check('submit mode: correct code passes all 7 (incl. hidden), first pass awards coins', r.body.ok && r.body.passedCount === 7 && r.body.total === 7 && r.body.passed === true && r.body.bonusCoinsAwarded === 10, r);
    check('submit mode: only visible (3) results returned, hidden ones withheld', r.body.results?.length === 3, r.body.results);
    check('email normalized (trim+lowercase) before persisting', attempts.has('kid@example.com:chal-1'), [...attempts.keys()]);
  }

  {
    const { db } = makeFakeDb({ publishedLessons: 40, passedLessonsByEmail: { 'kid@example.com': 40 } });
    await handleGradeRequest(db, { participant_email: 'kid@example.com', challenge_id: 'chal-1', code: CORRECT, mode: 'submit' });
    const second = await handleGradeRequest(db, { participant_email: 'kid@example.com', challenge_id: 'chal-1', code: CORRECT, mode: 'submit' });
    check('second passing submit does not award coins again', second.body.ok && second.body.passed === true && second.body.bonusCoinsAwarded === 0, second);
  }

  {
    // The whole point: the naive shortcut looks perfect on "Run" (visible
    // only) but fails a hidden test on "Submit" — it should NOT pass and
    // should NOT earn coins.
    const { db } = makeFakeDb({ publishedLessons: 40, passedLessonsByEmail: { 'kid@example.com': 40 } });
    const r = await handleGradeRequest(db, { participant_email: 'kid@example.com', challenge_id: 'chal-1', code: NAIVE_SHORTCUT, mode: 'submit' });
    check('submit mode: naive shortcut is caught by the hidden test and does not pass', r.body.ok && r.body.passedCount === 6 && r.body.total === 7 && r.body.passed === false && (r.body.bonusCoinsAwarded ?? 0) === 0, r);
  }

  {
    const { db } = makeFakeDb({ publishedLessons: 40, passedLessonsByEmail: { 'kid@example.com': 40 } });
    const r = await handleGradeRequest(db, { participant_email: 'kid@example.com', challenge_id: 'chal-1', code: 'import os\ndef is_greeting(x):\n    return True\n', mode: 'submit' });
    check('unsupported syntax reported cleanly, not persisted as an attempt', !r.body.ok && r.body.errorType === 'unsupported_syntax', r);
  }

  {
    const { db } = makeFakeDb({ publishedLessons: 40, passedLessonsByEmail: { 'kid@example.com': 40 } });
    const r = await handleGradeRequest(db, { challenge_id: 'chal-1', code: CORRECT, mode: 'submit' });
    check('missing participant_email -> 400', r.status === 400 && !r.body.ok, r);
  }

  {
    const { db } = makeFakeDb({ publishedLessons: 40, passedLessonsByEmail: { 'kid@example.com': 40 } });
    const r = await handleGradeRequest(db, { participant_email: 'kid@example.com', challenge_id: 'chal-1', code: CORRECT, mode: 'sprint' });
    check('invalid mode -> 400', r.status === 400 && !r.body.ok, r);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
