import { tryRealPythonReply } from './realPythonReply.ts';
import type { AiGenerateFn } from '../_shared/pyInterpreter/evaluator.ts';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`, JSON.stringify(detail)); }
}

{
  const r = await tryRealPythonReply('', 'hi', []);
  check('empty studentCode -> handled: false', r.handled === false, r);
}

{
  const r = await tryRealPythonReply('   \n  ', 'hi', []);
  check('whitespace-only studentCode -> handled: false', r.handled === false, r);
}

{
  const code = `
def other_function(x):
    return x
`;
  const r = await tryRealPythonReply(code, 'hi', []);
  check('no respond() defined -> handled: true with error', r.handled === true && 'error' in r && !!r.error.message, r);
}

{
  const code = `
def respond(message, history):
    if "hello" in message.lower():
        return "Hi there!"
    return None
`;
  const r1 = await tryRealPythonReply(code, 'Hello!', []);
  check('respond() returns a real string -> handled: true with reply', r1.handled === true && 'reply' in r1 && r1.reply === 'Hi there!', r1);

  const r2 = await tryRealPythonReply(code, 'what is the weather', []);
  check('respond() returns None -> handled: false (defer to AI)', r2.handled === false, r2);
}

{
  const code = `
def respond(message, history):
    return ""
`;
  const r = await tryRealPythonReply(code, 'hi', []);
  check('respond() returns empty string -> handled: false (defer to AI)', r.handled === false, r);
}

{
  const code = `
def respond(message, history):
    return 42
`;
  const r = await tryRealPythonReply(code, 'hi', []);
  check('respond() returns a non-string, non-None value -> error', r.handled === true && 'error' in r && r.error.type === 'invalid_return', r);
}

{
  const code = `
def respond(message, history):
    return 1 / 0
`;
  const r = await tryRealPythonReply(code, 'hi', []);
  check('respond() that raises -> error, not a crash', r.handled === true && 'error' in r && r.error.type === 'runtime_error', r);
}

{
  const code = `
def respond(message, history):
    while True:
        pass
`;
  const start = Date.now();
  const r = await tryRealPythonReply(code, 'hi', []);
  const elapsed = Date.now() - start;
  check('respond() that hangs -> timeout, not a hang', r.handled === true && 'error' in r && r.error.type === 'timeout' && elapsed < 25000, { ...r, elapsed });
}

{
  const code = `
def respond(message, history):
    if len(history) == 0:
        return "This is our first message!"
    return f"We've exchanged {len(history)} messages so far."
`;
  const r1 = await tryRealPythonReply(code, 'hi', []);
  check('respond() sees empty history correctly', r1.handled === true && 'reply' in r1 && r1.reply === 'This is our first message!', r1);

  const r2 = await tryRealPythonReply(code, 'hi again', [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello!' }]);
  check('respond() receives real conversation history as list-of-dicts', r2.handled === true && 'reply' in r2 && r2.reply === "We've exchanged 2 messages so far.", r2);
}

{
  const code = `
import os
def respond(message, history):
    return "hi"
`;
  const r = await tryRealPythonReply(code, 'hi', []);
  check('unsupported syntax in main.py -> clean error, not a crash', r.handled === true && 'error' in r && r.error.type === 'unsupported_syntax', r);
}

// ── ai_generate integration boundary ──

{
  // No aiGenerate callback passed at all (matches every call site before
  // this milestone, and any call site that never wires one in) — ai_generate
  // must be a plain NameError, not a crash or a silently-different behavior.
  const code = `
def respond(message, history):
    return ai_generate("hello")
`;
  const r = await tryRealPythonReply(code, 'hi', []);
  check('no aiGenerate callback passed -> ai_generate() is a plain NameError, surfaced as an error', r.handled === true && 'error' in r && r.error.type === 'runtime_error' && /ai_generate/.test(r.error.message), r);
}

{
  const fakeAiGenerate: AiGenerateFn = async (prompt) => ({ ok: true, text: `AI reply to: ${prompt}` });
  const code = `
def respond(message, history):
    fact = "water covers 71% of Earth"
    return ai_generate(f"Phrase this nicely: {fact}")
`;
  const r = await tryRealPythonReply(code, 'tell me a fact', [], fakeAiGenerate);
  check('aiGenerate callback threaded through -> respond() can use its real reply', r.handled === true && 'reply' in r && r.reply === 'AI reply to: Phrase this nicely: water covers 71% of Earth', r);
}

{
  // A student blending hardcoded logic with an AI-assisted fallback within
  // the same turn — the actual capability this milestone adds.
  const fakeAiGenerate: AiGenerateFn = async (prompt) => ({ ok: true, text: `[ai] ${prompt}` });
  const code = `
def respond(message, history):
    m = message.lower()
    if "hi" in m:
        return "Hey! Ask me about water pollution."
    return ai_generate(message)
`;
  const r1 = await tryRealPythonReply(code, 'hi', [], fakeAiGenerate);
  check('hardcoded branch still wins over ai_generate when it matches', r1.handled === true && 'reply' in r1 && r1.reply === 'Hey! Ask me about water pollution.', r1);

  const r2 = await tryRealPythonReply(code, 'what is the capital of France', [], fakeAiGenerate);
  check('unmatched branch falls through to ai_generate for a real generated reply', r2.handled === true && 'reply' in r2 && r2.reply === '[ai] what is the capital of France', r2);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
