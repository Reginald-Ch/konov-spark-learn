import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

const TOKEN_COLORS = ['#5865F2', '#F7941D', '#00B894', '#C70110', '#9B59B6', '#3498DB'];

// Splits into runs of letters, runs of digits, runs of whitespace, or single
// non-alphanumeric characters (punctuation, emoji, anything else) — those
// four classes cover every possible character, so nothing from the input is
// ever dropped or reordered. Any letter-run longer than 4 characters is then
// further chopped into ~4-character pieces, a deliberately simplified stand-
// in for how real subword tokenizers behave: short, common words stay whole,
// longer or rarer words get split into multiple pieces. It is NOT a real
// tokenizer (no trained vocabulary, no merge rules) — the widget says so
// directly — but it makes that one core idea something a student can poke at
// instead of only reading a description of it.
function approximateTokenize(text: string): string[] {
  const segments = text.match(/[A-Za-z]+|[0-9]+|\s+|[^\sA-Za-z0-9]/g) || [];
  const tokens: string[] = [];
  for (const seg of segments) {
    if (/^[A-Za-z]+$/.test(seg) && seg.length > 4) {
      for (let i = 0; i < seg.length; i += 4) tokens.push(seg.slice(i, i + 4));
    } else {
      tokens.push(seg);
    }
  }
  return tokens;
}

export const TokenizerExplorer = () => {
  const [text, setText] = useState('Type your own sentence here, like "unbelievable"!');
  const tokens = useMemo(() => approximateTokenize(text), [text]);
  const tokenCount = tokens.filter(t => t.trim().length > 0).length;

  return (
    <div className="rounded-lg p-3 border bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">Try it: tokenize your own text</p>
        <span className="text-[10px] font-bold text-[hsl(var(--discord-blurple))]">{tokenCount} token{tokenCount === 1 ? '' : 's'}</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 200))}
        rows={2}
        className="w-full rounded-md bg-[#0d0d0d] border border-white/10 p-2 text-sm text-white font-mono resize-none focus:outline-none focus:border-[hsl(var(--discord-blurple)/0.5)]"
        placeholder="Type something..."
      />
      <div className="mt-2 flex flex-wrap gap-1 leading-loose min-h-[32px]">
        {tokens.map((t, i) => {
          if (t.trim().length === 0) return <span key={i} className="inline-block w-2" />;
          const color = TOKEN_COLORS[i % TOKEN_COLORS.length];
          return (
            <motion.span
              key={`${i}-${t}`}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
              className="inline-block px-1.5 py-0.5 rounded text-xs font-mono text-white"
              style={{ backgroundColor: `${color}40`, border: `1px solid ${color}` }}
            >
              {t}
            </motion.span>
          );
        })}
      </div>
      <p className="text-[10px] text-white/40 mt-2 italic">
        A simplified illustration, not a real tokenizer — but the core idea is the same: short, common words stay whole, and longer or unusual words get split into multiple pieces.
      </p>
    </div>
  );
};
