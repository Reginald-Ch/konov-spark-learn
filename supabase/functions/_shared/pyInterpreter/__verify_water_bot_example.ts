import { runFunction } from './evaluator.ts';

const code = `
import random

FACTS = {
    "plastic": "Every year, about 8 million tons of plastic enter our oceans — like dumping a garbage truck of plastic into the sea every minute.",
    "microplastic": "Microplastics are tiny plastic fragments under 5mm — they've been found in tap water, sea salt, and even human blood.",
    "oil spill": "A single liter of oil can contaminate up to 1 million liters of water, making it undrinkable and deadly for aquatic life.",
    "agriculture": "Fertilizer runoff from farms causes algae blooms that suck oxygen out of lakes and rivers, killing fish.",
    "sewage": "Untreated sewage dumped into rivers spreads disease and destroys aquatic ecosystems.",
}

GREETINGS = ["hi", "hello", "hey", "sup"]

def respond(message, history):
    text = message.lower().strip()

    if len(history) == 0:
        return "Hi! I'm the Water Pollution Bot. Ask me about plastic, microplastics, oil spills, agriculture runoff, or sewage!"

    words = text.replace("!", " ").replace("?", " ").split()
    for word in words:
        if word in GREETINGS:
            return "Hey there! Ask me anything about water pollution."

    for topic, fact in FACTS.items():
        if topic in text:
            return fact

    return None
`;

function run(message: string, history: { role: string; content: string }[]) {
  const r = runFunction(code, 'respond', [message, history]);
  console.log(`  in:  "${message}" (history len ${history.length})`);
  console.log(`  out: ${r.ok ? JSON.stringify(r.result) : `ERROR(${r.errorType}): ${r.errorMessage}`}`);
  console.log();
}

console.log('1. First message ever (empty history) -> should get the intro:');
run('anything', []);

const afterIntro = [{ role: 'assistant', content: 'intro' }];

console.log('2. A greeting after the intro:');
run('Hey!', afterIntro);

console.log('3. A real question matching a keyword:');
run('What do microplastics do to us?', afterIntro);

console.log('4. Another keyword, different phrasing:');
run('Tell me about oil spill damage', afterIntro);

console.log('5. Something totally unrelated -> should defer to AI (None):');
run('What is the capital of France?', afterIntro);
