import { tryRealPythonReply } from './realPythonReply.ts';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`, JSON.stringify(detail)); }
}

{
  const r = tryRealPythonReply('', 'hi', []);
  check('empty studentCode -> handled: false', r.handled === false, r);
}

{
  const r = tryRealPythonReply('   \n  ', 'hi', []);
  check('whitespace-only studentCode -> handled: false', r.handled === false, r);
}

{
  const code = `
def other_function(x):
    return x
`;
  const r = tryRealPythonReply(code, 'hi', []);
  check('no respond() defined -> handled: true with error', r.handled === true && 'error' in r && !!r.error.message, r);
}

{
  const code = `
def respond(message, history):
    if "hello" in message.lower():
        return "Hi there!"
    return None
`;
  const r1 = tryRealPythonReply(code, 'Hello!', []);
  check('respond() returns a real string -> handled: true with reply', r1.handled === true && 'reply' in r1 && r1.reply === 'Hi there!', r1);

  const r2 = tryRealPythonReply(code, 'what is the weather', []);
  check('respond() returns None -> handled: false (defer to AI)', r2.handled === false, r2);
}

{
  const code = `
def respond(message, history):
    return ""
`;
  const r = tryRealPythonReply(code, 'hi', []);
  check('respond() returns empty string -> handled: false (defer to AI)', r.handled === false, r);
}

{
  const code = `
def respond(message, history):
    return 42
`;
  const r = tryRealPythonReply(code, 'hi', []);
  check('respond() returns a non-string, non-None value -> error', r.handled === true && 'error' in r && r.error.type === 'invalid_return', r);
}

{
  const code = `
def respond(message, history):
    return 1 / 0
`;
  const r = tryRealPythonReply(code, 'hi', []);
  check('respond() that raises -> error, not a crash', r.handled === true && 'error' in r && r.error.type === 'runtime_error', r);
}

{
  const code = `
def respond(message, history):
    while True:
        pass
`;
  const start = Date.now();
  const r = tryRealPythonReply(code, 'hi', []);
  const elapsed = Date.now() - start;
  check('respond() that hangs -> timeout, not a hang', r.handled === true && 'error' in r && r.error.type === 'timeout' && elapsed < 8000, { ...r, elapsed });
}

{
  const code = `
def respond(message, history):
    if len(history) == 0:
        return "This is our first message!"
    return f"We've exchanged {len(history)} messages so far."
`;
  const r1 = tryRealPythonReply(code, 'hi', []);
  check('respond() sees empty history correctly', r1.handled === true && 'reply' in r1 && r1.reply === 'This is our first message!', r1);

  const r2 = tryRealPythonReply(code, 'hi again', [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello!' }]);
  check('respond() receives real conversation history as list-of-dicts', r2.handled === true && 'reply' in r2 && r2.reply === "We've exchanged 2 messages so far.", r2);
}

{
  const code = `
import os
def respond(message, history):
    return "hi"
`;
  const r = tryRealPythonReply(code, 'hi', []);
  check('unsupported syntax in main.py -> clean error, not a crash', r.handled === true && 'error' in r && r.error.type === 'unsupported_syntax', r);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
