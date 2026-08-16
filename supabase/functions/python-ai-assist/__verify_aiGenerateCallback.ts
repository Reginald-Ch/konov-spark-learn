// Isolated test of the real fetch/slot logic, independent of any live
// Supabase project or Deno runtime — fakes acquireSlot/releaseSlot and
// monkey-patches global fetch, the same isolation approach used for every
// other pure-logic module this session.
import { makeAiGenerateCallback } from './aiGenerateCallback.ts';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`, JSON.stringify(detail)); }
}

const realFetch = globalThis.fetch;
function withFetch<T>(fakeFetch: typeof fetch, run: () => Promise<T>): Promise<T> {
  (globalThis as any).fetch = fakeFetch;
  return run().finally(() => { globalThis.fetch = realFetch; });
}

function fakeSlots() {
  const acquired: number[] = [];
  const released: number[] = [];
  let nextId = 1;
  return {
    acquireSlot: async (_ttl: number) => { const id = nextId++; acquired.push(id); return id; },
    releaseSlot: async (id: number) => { released.push(id); },
    acquired, released,
  };
}

// ── Happy path ──
await withFetch(
  (async (_url: any, _opts: any) => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: 'a real generated reply' } }] }),
  })) as any,
  async () => {
    const { acquireSlot, releaseSlot, acquired, released } = fakeSlots();
    const cb = makeAiGenerateCallback('fake-key', acquireSlot, releaseSlot);
    const outcome = await cb('hello', 10000);
    check('successful call returns ok:true with the gateway text', outcome.ok === true && outcome.text === 'a real generated reply', outcome);
    check('a slot was acquired and released exactly once', acquired.length === 1 && released.length === 1 && acquired[0] === released[0], { acquired, released });
  },
);

// ── No slot available ──
await (async () => {
  const acquireSlot = async (_ttl: number) => null;
  const releaseSlot = async (_id: number) => { throw new Error('should never be called — no slot was acquired'); };
  const cb = makeAiGenerateCallback('fake-key', acquireSlot, releaseSlot);
  const outcome = await cb('hello', 10000);
  check('no slot available -> ok:false, reason: error, no release attempted', !outcome.ok && outcome.reason === 'error', outcome);
})();

// ── Gateway returns non-2xx ──
await withFetch(
  (async () => ({ ok: false, status: 500, json: async () => ({}) })) as any,
  async () => {
    const { acquireSlot, releaseSlot, released } = fakeSlots();
    const cb = makeAiGenerateCallback('fake-key', acquireSlot, releaseSlot);
    const outcome = await cb('hello', 10000);
    check('non-2xx gateway response -> ok:false, reason: error, mentions status', !outcome.ok && outcome.reason === 'error' && /500/.test(outcome.message), outcome);
    check('slot still released on a gateway error', released.length === 1, released);
  },
);

// ── Gateway returns malformed content ──
await withFetch(
  (async () => ({ ok: true, json: async () => ({ choices: [] }) })) as any,
  async () => {
    const { acquireSlot, releaseSlot } = fakeSlots();
    const cb = makeAiGenerateCallback('fake-key', acquireSlot, releaseSlot);
    const outcome = await cb('hello', 10000);
    check('missing content in gateway response -> ok:false, reason: error', !outcome.ok && outcome.reason === 'error', outcome);
  },
);

// ── Budget already exhausted before even trying ──
await (async () => {
  const acquireSlot = async (_ttl: number) => { throw new Error('should never be called — budget was already exhausted'); };
  const releaseSlot = async (_id: number) => {};
  const cb = makeAiGenerateCallback('fake-key', acquireSlot, releaseSlot);
  const outcome = await cb('hello', 200); // less than the 400ms safety margin
  check('remainingMs below the safety margin -> ok:false, reason: timeout, no slot attempted', !outcome.ok && outcome.reason === 'timeout', outcome);
})();

// ── Fetch aborts because the budget ran out mid-flight ──
await withFetch(
  ((_url: any, opts: any) => new Promise((_resolve, reject) => {
    opts.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  })) as any,
  async () => {
    const { acquireSlot, releaseSlot, released } = fakeSlots();
    const cb = makeAiGenerateCallback('fake-key', acquireSlot, releaseSlot);
    const outcome = await cb('hello', 500); // budgetMs = 100ms after the safety margin -> aborts quickly
    check('a fetch that hangs past its budget aborts as ok:false, reason: timeout', !outcome.ok && outcome.reason === 'timeout', outcome);
    check('slot still released after an abort', released.length === 1, released);
  },
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
