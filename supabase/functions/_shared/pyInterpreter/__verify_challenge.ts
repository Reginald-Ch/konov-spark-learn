import { gradeAgainstTests } from './index.ts';

const referenceSolution = `
def is_greeting(message):
    words = message.lower().replace(",", " ").replace("!", " ").replace("?", " ").split()
    greetings = ["hi", "hello", "hey", "greetings"]
    for w in words:
        if w in greetings:
            return True
    return False
`;

// The "historical events" case is the whole point: a naive
// "hi" in message.lower() check (no word-boundary awareness) passes every
// visible test but fails this hidden one — real evidence the hidden-test
// mechanism actually catches the shortcut it's designed to catch.
const naiveShortcut = `
def is_greeting(message):
    m = message.lower()
    return "hi" in m or "hello" in m or "hey" in m or "greetings" in m
`;

const tests = [
  { input_args: ['Hello there!'], expected_output: true },
  { input_args: ["What's the weather?"], expected_output: false },
  { input_args: ['HEY, how are you?'], expected_output: true },
  { input_args: ['hi'], expected_output: true },
  { input_args: ['historical events'], expected_output: false },
  { input_args: ['Greetings, friend'], expected_output: true },
  { input_args: [''], expected_output: false },
];

const refResult = gradeAgainstTests(referenceSolution, 'is_greeting', tests);
console.log('Reference solution:', refResult.hadError ? `ERROR: ${refResult.errorMessage}` : `${refResult.passedCount}/${refResult.total}`);
if (!refResult.hadError) refResult.results.forEach(r => console.log(`  ${r.passed ? 'ok' : 'FAIL'} input=${JSON.stringify(r.input)} expected=${JSON.stringify(r.expected)} actual=${JSON.stringify(r.actual)}`));

const naiveResult = gradeAgainstTests(naiveShortcut, 'is_greeting', tests);
console.log('\nNaive substring shortcut:', naiveResult.hadError ? `ERROR: ${naiveResult.errorMessage}` : `${naiveResult.passedCount}/${naiveResult.total}`);
if (!naiveResult.hadError) naiveResult.results.forEach(r => console.log(`  ${r.passed ? 'ok' : 'FAIL'} input=${JSON.stringify(r.input)} expected=${JSON.stringify(r.expected)} actual=${JSON.stringify(r.actual)}`));

const refOk = !refResult.hadError && refResult.passedCount === refResult.total;
const naiveTrapWorks = !naiveResult.hadError && naiveResult.passedCount < naiveResult.total;
console.log(`\nReference solution passes all tests: ${refOk}`);
console.log(`Naive shortcut is correctly caught by a hidden test: ${naiveTrapWorks}`);
process.exit(refOk && naiveTrapWorks ? 0 : 1);
