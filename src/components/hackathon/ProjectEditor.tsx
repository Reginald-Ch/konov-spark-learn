import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PublishModal } from './PublishModal';
import { LevelBadge, AchievementGrid, getForgeLevel } from './AchievementBadges';
import { ForgeWalkthrough, MilestoneCelebration } from './ForgeWalkthrough';
import { supabase } from '@/integrations/supabase/client';
import { fetchAIEndpoint } from '@/lib/aiFetch';
import { isSafeExternalUrl } from '@/lib/utils';
import {
  Code, Play, Send, X, Copy, Check, Trash2,
  Rocket, Loader2, Save, Bot, Brain, Clock,
  MessageSquare, Lightbulb, Settings, FileCode, FileJson, FileText,
  Circle, TestTube, Terminal, ChevronUp, ChevronDown, Eye,
  PanelRightClose, PanelRightOpen, HelpCircle, Database, Palette, Plus, Minus,
  Download, Upload, Undo2, Redo2, RotateCcw, Mic, Volume2, VolumeX, Radio, Lock,
  Search, Replace, ArrowUp, ArrowDown, AlertTriangle, Zap, GraduationCap, XCircle, Printer
} from 'lucide-react';
import { toast } from 'sonner';
// Client-side execution of main.py's top-level code, for a live "what does
// my code print" console — see the plan for why this is safe to run in the
// browser (a personal, non-graded preview, not a trust boundary) and how
// the prior objection to this exact idea (raised in CodeEditor.tsx, over
// the interpreter folder being outside the frontend's type-checked scope)
// is resolved: tsconfig.app.json now includes it directly, closing that gap
// instead of avoiding it.
import { runModule } from '../../../supabase/functions/_shared/pyInterpreter/evaluator';
import { useIsMobile } from '@/hooks/use-mobile';

import { ProjectType, PROJECT_SCAFFOLDS, PROJECT_SCAFFOLDS_BLANK } from './projectScaffolds';
import { computeLineDiffs, lintPython, getAutocompleteItems, findAllMatches, findLineForVariable, CHATBOT_TUTORIAL_STEPS, tokenizeLine, TOKEN_COLORS, type LintError, type AutocompleteItem, type SearchMatch, type Token } from './editorFeatures';
export type { ProjectType } from './projectScaffolds';

interface ProjectEditorProps {
  initialType?: ProjectType;
  initialCode?: string;
  hackathonStartDate?: string | null;
  hackathonStatus?: 'upcoming' | 'live' | 'ended' | null;
  hasLiveEvent?: boolean;
  // hackathons.settings.blank_start_mode — when true, a fresh script scaffold
  // starts empty (comments/instructions only, no pre-filled answers) instead
  // of the guided pre-filled version. Only affects freshly-seeded main.py
  // content (new project, explicit type switch, "reset to template") — never
  // an already-saved project (initialCode always wins when present).
  blankStartMode?: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  _id?: number;
  // Set when main.py's real respond() actually answered this message
  // (vs. the AI) — the one visible signal that real Python is genuinely
  // running, not just accepted and ignored.
  usedRealPython?: boolean;
}

interface QAPair {
  // Local-only React key, never written to or read from the generated
  // code (the write-sync effect only ever emits q/a) — fixes deleting a
  // middle Q&A pair jumping focus to the wrong input, since array-index
  // keys made React reuse/reassign DOM nodes across a shifted list
  // instead of tracking each pair by its own identity.
  id: string;
  q: string;
  a: string;
}

// Shared helper for Response Tone challenge validation
const isResponseToneCustomized = (
  responseTone: string,
  responseToneConditional: Record<string, string>,
  defaultResponseToneConditional: Record<string, string>
): boolean => {
  const condKeys = Object.keys(responseToneConditional);
  if (condKeys.length === 0 && responseTone) return true;
  return condKeys.some(k => responseToneConditional[k] !== defaultResponseToneConditional[k]);
};

// Shared helper for Fallback Function challenge validation (Challenge 25)
const isFallbackMessageCustomized = (fallbackMessage: string, defaultFallbackMessage: string): boolean => {
  if (!fallbackMessage) return false;
  return fallbackMessage !== defaultFallbackMessage;
};

// Scaffolds imported from ./projectScaffolds

// Theme options for student customization
const THEMES = [
  { id: 'default', name: 'Default', accent: '#5865F2', bg: '#0d1117', chat: '#161b22' },
  { id: 'ocean', name: 'Ocean', accent: '#00B4D8', bg: '#0a1628', chat: '#0f2035' },
  { id: 'forest', name: 'Forest', accent: '#22C55E', bg: '#0a1a0f', chat: '#0f2614' },
  { id: 'sunset', name: 'Sunset', accent: '#F97316', bg: '#1a0f0a', chat: '#26140f' },
  { id: 'purple', name: 'Neon', accent: '#A855F7', bg: '#0f0a1a', chat: '#140f26' },
  { id: 'rose', name: 'Rose', accent: '#F43F5E', bg: '#1a0a0f', chat: '#260f14' },
];

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Every challenge's teaching comment shows an example value BEFORE the
// real code (e.g. "#   RULES = [...]" as documentation, then the actual
// `RULES = []` a few lines later) — every extractor below does a plain
// text-search match, with no notion of "this is inside a # comment," so
// it was matching the commented EXAMPLE first, not the student's real
// answer. A completely untouched starter file would already read as
// "done" for RULES, CATCHPHRASES, etc. Stripping comments first (reusing
// the same tokenizer + multi-line-string tracking the syntax highlighter
// already uses, so a "#" inside a triple-quoted string isn't mistaken for
// a comment) fixes every existing and new extractor in this function at
// once, since they all close over `code` from this scope.
const stripComments = (raw: string): string => {
  const lines = raw.split('\n');
  let inMultiLineString = false;
  let multiLineDelim = '"""';
  return lines.map((line) => {
    if (inMultiLineString) {
      const closeIdx = line.indexOf(multiLineDelim);
      if (closeIdx === -1) return line;
      inMultiLineString = false;
      const stringPart = line.slice(0, closeIdx + multiLineDelim.length);
      const rest = line.slice(closeIdx + multiLineDelim.length);
      const restStripped = tokenizeLine(rest).filter(t => t.type !== 'comment').map(t => t.value).join('');
      return stringPart + restStripped;
    }
    // Counted on the COMMENT-STRIPPED line, not the raw one — a "'''" or
    // '"""' that only ever appears inside a # comment (e.g. a teaching
    // comment showing `#   SYSTEM_MESSAGE = """` as documentation) must
    // never flip this into multi-line-string mode. Counting on the raw
    // line was the bug: it treated every comment line mentioning a triple
    // quote as if it opened a real string.
    const strippedLine = tokenizeLine(line).filter(t => t.type !== 'comment').map(t => t.value).join('');
    const tripleDoubleCount = (strippedLine.match(/"""/g) || []).length;
    const tripleSingleCount = (strippedLine.match(/'''/g) || []).length;
    if (tripleDoubleCount % 2 !== 0) { inMultiLineString = true; multiLineDelim = '"""'; }
    else if (tripleSingleCount % 2 !== 0) { inMultiLineString = true; multiLineDelim = "'''"; }
    return strippedLine;
  }).join('\n');
};

// Comment-aware find-and-replace for the sidebar<->code sync effects below
// (Knowledge Base, Q&A, System Prompt, Theme). Every FORGE scaffold shows a
// teaching example of the real assignment inside a `#` comment BEFORE the
// actual variable — e.g. the chatbot template's Challenge 5 comment shows
// `#   SYSTEM_MESSAGE = """..."""` right above the real
// `SYSTEM_MESSAGE = "..."` line. A plain regex.replace(code, ...) matches
// whichever occurrence comes first — the comment — and either reads garbled
// comment text into the sidebar, or (worse) rewrites the comment in place
// while leaving the real variable untouched, so the student's edit
// silently "doesn't stick." This locates the match against comment-stripped
// text first, then replaces starting from that line in the original code —
// so an earlier comment occurrence is structurally excluded, since the
// slice searched for the replace no longer contains it.
const replaceOutsideComments = (code: string, regex: RegExp, replacement: string): string | null => {
  const stripped = stripComments(code);
  const m = stripped.match(regex);
  if (!m || m.index === undefined) return null;
  const startLine = stripped.slice(0, m.index).split('\n').length - 1;
  const rawLines = code.split('\n');
  const before = rawLines.slice(0, startLine).join('\n');
  const from = rawLines.slice(startLine).join('\n');
  if (!regex.test(from)) return null;
  const replaced = from.replace(regex, replacement);
  return (startLine > 0 ? before + '\n' : '') + replaced;
};

// Locates the `[`/`{` immediately after `fromIndex` and its correctly-
// matching closing bracket, skipping over the contents of quoted strings —
// used by the list/dict extractors below instead of a lazy `\[...\]` regex,
// which stops at the FIRST literal `]`/`}` anywhere, including one sitting
// inside an item's own text (e.g. RULES = ["Use [brackets] carefully"]),
// silently truncating or entirely emptying the extracted list/dict.
const findBalancedBracket = (text: string, openChar: string, closeChar: string, fromIndex: number): { start: number; end: number } | null => {
  const openIdx = text.indexOf(openChar, fromIndex);
  if (openIdx === -1) return null;
  let depth = 0;
  let i = openIdx;
  let inString: string | null = null;
  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === inString) inString = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") { inString = ch; i++; continue; }
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return { start: openIdx, end: i };
    }
    i++;
  }
  return null;
};

const unescapeQuoted = (s: string) => s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

// Extract all config variables from the student's Python code
// Supports both SCREAMING_CASE and snake_case variable names — pure function at module scope
export const extractConfigFromCode = (rawCode: string) => {
  const code = stripComments(rawCode);
  const extract = (fallback: string, ...varNames: string[]) => {
    for (const name of varNames) {
      const tripleMatch = code.match(new RegExp(`${name}\\s*=\\s*"""([\\s\\S]*?)"""`));
      if (tripleMatch) return tripleMatch[1].trim();
      const tripleMatch2 = code.match(new RegExp(`${name}\\s*=\\s*'''([\\s\\S]*?)'''`));
      if (tripleMatch2) return tripleMatch2[1].trim();
      const match = code.match(new RegExp(`${name}\\s*=\\s*["'](.*)["']`));
      if (match) return match[1];
    }
    return fallback;
  };
  const extractNumber = (fallback: number, ...varNames: string[]) => {
    for (const name of varNames) {
      // Optional surrounding quotes and scientific notation — a student who
      // quoted a numeric value (TEMPERATURE = "0.9", easy to do by muscle
      // memory from every OTHER field being a string) used to fail this
      // match entirely and silently fall through to `fallback`, with
      // nothing to indicate their real value was ignored.
      const match = code.match(new RegExp(`${name}\\s*=\\s*["']?(-?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?)["']?`));
      if (match) return parseFloat(match[1]);
    }
    return fallback;
  };
  const extractBool = (fallback: boolean, ...varNames: string[]) => {
    for (const name of varNames) {
      // Case-insensitive — a student writing lowercase `true`/`false` (easy
      // muscle memory from JS/most other languages) used to match nothing
      // and silently fall back to the default with no signal the toggle
      // didn't take effect.
      const match = code.match(new RegExp(`${name}\\s*=\\s*(True|False)`, 'i'));
      if (match) return match[1].toLowerCase() === 'true';
    }
    return fallback;
  };
  // Quote-aware string matching: `"([^"]+)"|'([^']+)'` instead of a single
  // `["']([^"']+)["']` — the latter excludes BOTH quote characters
  // regardless of which one actually opened the string, so a double-quoted
  // item containing an apostrophe ("let's go") gets truncated at the
  // apostrophe as if it were the closing quote. Same bug class as the
  // Challenge 28 f-string fix above, here in every list/dict extractor.
  const extractList = (...varNames: string[]): string[] => {
    for (const name of varNames) {
      const varMatch = code.match(new RegExp(`${name}\\s*=\\s*`));
      if (!varMatch || varMatch.index === undefined) continue;
      const bracket = findBalancedBracket(code, '[', ']', varMatch.index + varMatch[0].length);
      if (!bracket) continue;
      const inner = code.slice(bracket.start + 1, bracket.end);
      const items: string[] = [];
      const regex = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
      let m;
      while ((m = regex.exec(inner)) !== null) items.push(unescapeQuoted(m[1] ?? m[2]));
      return items;
    }
    return [];
  };
  const extractDict = (...varNames: string[]): Record<string, string> => {
    for (const name of varNames) {
      const varMatch = code.match(new RegExp(`${name}\\s*=\\s*`));
      if (!varMatch || varMatch.index === undefined) continue;
      const bracket = findBalancedBracket(code, '{', '}', varMatch.index + varMatch[0].length);
      if (!bracket) continue;
      const inner = code.slice(bracket.start + 1, bracket.end);
      const result: Record<string, string> = {};
      const regex = /(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
      let m;
      while ((m = regex.exec(inner)) !== null) result[unescapeQuoted(m[1] ?? m[2])] = unescapeQuoted(m[3] ?? m[4]);
      return result;
    }
    return {};
  };
  const extractQAPairs = (): Array<{q: string; a: string}> => {
    const varMatch = code.match(/(?:QA_PAIRS|qa_pairs)\s*=\s*/);
    if (!varMatch || varMatch.index === undefined) return [];
    const bracket = findBalancedBracket(code, '[', ']', varMatch.index + varMatch[0].length);
    if (!bracket) return [];
    const inner = code.slice(bracket.start + 1, bracket.end);
    const pairs: Array<{q: string; a: string}> = [];
    // (?:[^"\\]|\\.)* — string content that allows escaped characters —
    // not just [^"]+, which stopped at a LITERAL quote character even when
    // it was backslash-escaped. Q&A text gets written with internal "
    // escaped as \" (e.g. an answer containing She said "hi"), so the old
    // pattern truncated the match there and dropped the pair entirely —
    // same failure shape as the already-fixed apostrophe bug.
    const regex = /\{\s*["']q["']\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*,\s*["']a["']\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*\}/g;
    let m;
    while ((m = regex.exec(inner)) !== null) pairs.push({ q: unescapeQuoted(m[1] ?? m[2]), a: unescapeQuoted(m[3] ?? m[4]) });
    return pairs;
  };
  const extractFewShotExamples = (): Array<{input: string; output: string}> => {
    const varMatch = code.match(/(?:FEW_SHOT_EXAMPLES|few_shot_examples)\s*=\s*/);
    if (!varMatch || varMatch.index === undefined) return [];
    const bracket = findBalancedBracket(code, '[', ']', varMatch.index + varMatch[0].length);
    if (!bracket) return [];
    const inner = code.slice(bracket.start + 1, bracket.end);
    const examples: Array<{input: string; output: string}> = [];
    const regex = /\{\s*["']input["']\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*,\s*["']output["']\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*\}/g;
    let m;
    while ((m = regex.exec(inner)) !== null) examples.push({ input: unescapeQuoted(m[1] ?? m[2]), output: unescapeQuoted(m[3] ?? m[4]) });
    return examples;
  };
  // Extract if/elif/else conditional blocks that set a target variable
  const extractConditionalVar = (targetVar: string): Record<string, string> => {
    const result: Record<string, string> = {};
    // Bounded multi-line gap (not just [^\n]* on the SAME line) — a student
    // adding a debug print (or a comment, or a blank line) between the
    // `if:` and the real assignment is completely valid, working code, but
    // used to make that one branch's value silently vanish, with the bug
    // "randomly" only affecting whichever branch happened to have the extra
    // line.
    const blockRegex = new RegExp(
      `(?:if|elif)\\s+\\w+\\s*==\\s*["']([^"']+)["'][^:]*:[\\s\\S]{0,300}?\\n\\s*${targetVar}\\s*=\\s*["']([^"']+)["']`,
      'g'
    );
    let m;
    while ((m = blockRegex.exec(code)) !== null) {
      result[m[1]] = m[2];
    }
    const elseRegex = new RegExp(`else\\s*:[\\s\\S]{0,300}?\\n\\s*${targetVar}\\s*=\\s*["']([^"']+)["']`);
    const elseMatch = code.match(elseRegex);
    if (elseMatch) result['__else__'] = elseMatch[1];
    return result;
  };
  // Challenge 25: find the function called to set targetVar, then read that function's return string
  const extractFunctionReturn = (targetVar: string): string => {
    const callMatch = code.match(new RegExp(`${targetVar}\\s*=\\s*(\\w+)\\s*\\(`));
    if (!callMatch) return '';
    const funcName = callMatch[1];
    const defMatch = code.match(new RegExp(`def\\s+${funcName}\\s*\\([^)]*\\)\\s*:[\\s\\S]*?return\\s+f?["'](.*)["']`));
    return defMatch ? defMatch[1] : '';
  };
  // Challenge 26: detect a for-loop that builds TOPIC_KEYWORDS from QA_PAIRS.
  // The window was 200 chars, tuned to the boilerplate one-liner the
  // scaffold ships — but the challenge explicitly invites elaborating on it
  // (pulling keywords from both q and a, filtering short/duplicate words),
  // and a natural, fully-correct version of that easily runs 300-500+ chars
  // between the `for` line and `.append`. It was silently marking a
  // student's improved, working solution as "✗ missing".
  const extractHasTopicKeywordsLoop = (): boolean =>
    /for\s+\w+\s+in\s+QA_PAIRS\s*:[\s\S]{0,600}?TOPIC_KEYWORDS\.append/.test(code);
  // Challenge 29: the fallback (2nd) argument of a `targetVar = dict.get(key, "...")`
  // call — same greedy-then-backtrack quote matching as extractFunctionReturn,
  // so an apostrophe inside the fallback text doesn't break the match.
  const extractGetFallback = (targetVar: string): string => {
    const m = code.match(new RegExp(`${targetVar}\\s*=\\s*\\w+\\.get\\([^,]+,\\s*["'](.*)["']\\s*\\)`));
    return m ? m[1] : '';
  };
  // Challenge 27: a [...] containing `for X in Y` with no nested {}/[] —
  // distinguishes a real list comprehension from a list-of-dicts literal
  // like QA_PAIRS.
  const extractHasListComprehension = (): boolean =>
    /\[[^[\]{}]*\bfor\b\s+\w+\s+in\s+\w+[^[\]{}]*\]/.test(code);
  // Challenge 28: a function taking a parameter whose return is an f-string
  // that actually uses it — distinct from Challenge 25's no-argument function.
  // Matched per-quote-style (not a single [^"'] exclusion) since a
  // double-quoted f-string containing an apostrophe — "I'm", "let's" — is
  // completely normal English and would otherwise break the match.
  const extractHasParameterizedFunction = (): boolean =>
    /def\s+\w+\s*\(\s*(\w+)[^)]*\)\s*:[\s\S]{0,300}?return\s+f(?:"[^"]*\{\1\}[^"]*"|'[^']*\{\1\}[^']*')/.test(code);
  // Challenge 29: a safe dict lookup with a fallback (.get(key, default)).
  const extractHasSafeDictLookup = (): boolean =>
    /\.get\(\s*\w+\s*,\s*["']/.test(code);
  // Challenge 30: an accumulator loop — a for-loop whose body increments a
  // counter with += — distinct from Challenge 26's .append()-building loop.
  const extractHasAccumulatorLoop = (): boolean =>
    /for\s+\w+\s+in\s+\w+\s*:[\s\S]{0,150}?\w+\s*\+=\s*\d/.test(code);
  // Challenges 31-34: each teaches a piece of syntax via a print() call
  // (real output in the live console) rather than a stored variable, so
  // "done" means the printed statement's own text differs from the
  // scaffold's own default — same presence-plus-differs-from-default shape
  // as Challenges 19/25/28 above, just extracting a print() argument
  // instead of a variable/function-return value.
  const extractPrintUpperStatement = (): string => {
    const m = code.match(/print\(([^\n]*\.upper\(\)[^\n]*)\)/);
    return m ? m[1].trim() : '';
  };
  const extractBooleanLogicExpr = (): string => {
    const m = code.match(/IS_EXPRESSIVE\s*=\s*(.+)/);
    return m ? m[1].trim() : '';
  };
  const extractWhileLoopPrint = (): string => {
    const m = code.match(/while\s+\w+\s*<\s*len\(RULES\)\s*:[\s\S]{0,200}?print\(([^\n]*)\)/);
    return m ? m[1].trim() : '';
  };
  const extractTypeCastPrint = (): string => {
    const m = code.match(/print\(([^\n]*str\(MAX_TOKENS\)[^\n]*)\)/);
    return m ? m[1].trim() : '';
  };

  return {
    botName: extract('AI Bot', 'BOT_NAME', 'bot_name', 'AGENT_NAME'),
    botEmoji: extract('🤖', 'BOT_EMOJI', 'bot_emoji'),
    greeting: extract('', 'AI_MESSAGE', 'greeting', 'GREETING_MESSAGE'),
    creatorName: extract('', 'CREATOR_NAME', 'creator'),
    temperature: extractNumber(0.7, 'TEMPERATURE', 'temperature'),
    responseStyle: extract('Balanced', 'RESPONSE_STYLE', 'response_style'),
    maxResponseLength: extract('medium', 'MAX_RESPONSE_LENGTH', 'max_response_length'),
    responseFormat: extract('', 'RESPONSE_FORMAT', 'response_format'),
    conversationRules: extractList('RULES', 'rules', 'CONVERSATION_RULES'),
    conversationStarters: extractList('CONVERSATION_STARTERS', 'conversation_starters'),
    secretResponses: extractDict('SECRET_RESPONSES', 'secret_responses', 'EASTER_EGGS', 'easter_eggs'),
    catchphrases: extractList('CATCHPHRASES', 'catchphrases'),
    blockedTopics: extractList('BLOCKED_TOPICS', 'blocked_topics'),
    maxTokens: extractNumber(512, 'MAX_TOKENS', 'max_tokens'),
    followUpQuestions: extractBool(true, 'FOLLOW_UP_QUESTIONS', 'follow_up_questions'),
    rememberName: extractBool(true, 'MEMORY_ENABLED', 'memory_enabled', 'REMEMBER_NAME'),
    errorMessage: extract('', 'ERROR_MESSAGE', 'error_message'),
    knowledgeBaseFromCode: extract('', 'KNOWLEDGE_BASE', 'knowledge_base'),
    qaPairsFromCode: extractQAPairs(),
    showReasoning: extractBool(false, 'SHOW_REASONING', 'show_reasoning'),
    maxThinkingSteps: extractNumber(5, 'MAX_THINKING_STEPS', 'max_thinking_steps'),
    tools: extractDict('TOOLS', 'tools'),
    toolInstructions: extractDict('TOOL_INSTRUCTIONS', 'tool_instructions'),
    forbiddenWords: extractList('FORBIDDEN_WORDS', 'forbidden_words'),
    mood: extract('neutral', 'MOOD', 'mood'),
    fewShotExamples: extractFewShotExamples(),
    languageStyle: extract('casual', 'LANGUAGE_STYLE', 'language_style'),
    signOff: extract('', 'SIGN_OFF', 'sign_off'),
    systemMessage: extract('', 'SYSTEM_MESSAGE', 'SYSTEM_PROMPT', 'system_prompt', 'system_message'),
    voiceEnabled: extractBool(false, 'VOICE_ENABLED', 'voice_enabled'),
    voiceMode: extract('push-to-talk', 'VOICE_MODE', 'voice_mode'),
    wakeWord: extract('', 'WAKE_WORD', 'wake_word'),
    voiceGender: extract('default', 'VOICE_GENDER', 'voice_gender'),
    moodResponses: extractDict('MOOD_RESPONSES', 'mood_responses'),
    responseTone: extract('', 'RESPONSE_TONE', 'response_tone'),
    timeOfDay: extract('', 'TIME_OF_DAY', 'time_of_day'),
    responseToneConditional: extractConditionalVar('RESPONSE_TONE'),
    fallbackMessage: extractFunctionReturn('FALLBACK_MESSAGE'),
    hasTopicKeywordsLoop: extractHasTopicKeywordsLoop(),
    hasListComprehension: extractHasListComprehension(),
    phraseIdeas: extractList('PHRASE_IDEAS'),
    hasParameterizedFunction: extractHasParameterizedFunction(),
    personalizedIntro: extractFunctionReturn('PERSONALIZED_INTRO'),
    hasSafeDictLookup: extractHasSafeDictLookup(),
    moodInstruction: extractGetFallback('MOOD_INSTRUCTION'),
    hasAccumulatorLoop: extractHasAccumulatorLoop(),
    printUpperStatement: extractPrintUpperStatement(),
    booleanLogicExpr: extractBooleanLogicExpr(),
    whileLoopPrint: extractWhileLoopPrint(),
    typeCastPrint: extractTypeCastPrint(),
  };
};

// ── Agent reasoning trace ──
// FORGE's "Show Reasoning" mode already asks the model for a
// Thought -> Action -> Observation -> Answer trace (see python-ai-assist's
// showReasoning prompt); it just used to render as plain markdown paragraphs.
// This parses that same text into discrete steps so it can be drawn as a small
// timeline instead. Returns null for anything that isn't actually a trace
// (including partial ones still mid-stream), so callers fall back to normal
// markdown rendering with zero behavior change.
type ReasoningStepType = 'thought' | 'action' | 'observation' | 'answer';
interface ReasoningStep {
  type: ReasoningStepType;
  text: string;
}

function parseReasoningTrace(content: string): ReasoningStep[] | null {
  const markerPattern = /\*\*(?:🤔\s*Thought|🔧\s*Action|👁️\s*Observation|💡\s*Answer):\*\*/g;
  const matches: { index: number; length: number; type: ReasoningStepType }[] = [];
  let m: RegExpExecArray | null;
  while ((m = markerPattern.exec(content)) !== null) {
    const raw = m[0];
    const type: ReasoningStepType = raw.includes('🤔')
      ? 'thought'
      : raw.includes('🔧')
      ? 'action'
      : raw.includes('👁️')
      ? 'observation'
      : 'answer';
    matches.push({ index: m.index, length: raw.length, type });
  }
  if (matches.length < 2) return null;

  const steps: ReasoningStep[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const text = content.slice(start, end).trim();
    if (text) steps.push({ type: matches[i].type, text });
  }
  return steps.length > 0 ? steps : null;
}

const REASONING_STEP_META: Record<ReasoningStepType, { label: string; icon: typeof Lightbulb; color: string }> = {
  thought: { label: 'Thought', icon: Lightbulb, color: '#F7941D' },
  action: { label: 'Action', icon: Zap, color: '#5865F2' },
  observation: { label: 'Observation', icon: Eye, color: '#22C55E' },
  answer: { label: 'Answer', icon: MessageSquare, color: '#EC4899' },
};

function ReasoningTrace({ steps }: { steps: ReasoningStep[] }) {
  return (
    <div>
      {steps.map((step, i) => {
        const meta = REASONING_STEP_META[step.type];
        const Icon = meta.icon;
        const isLast = i === steps.length - 1;
        return (
          <div key={i} className="flex gap-2">
            <div className="flex flex-col items-center">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
              >
                <Icon className="w-3 h-3" style={{ color: meta.color }} />
              </div>
              {!isLast && <div className="w-px flex-1 my-0.5" style={{ backgroundColor: `${meta.color}30` }} />}
            </div>
            <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-2'}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                {meta.label}
              </span>
              <div className="prose prose-invert prose-xs max-w-none [&_p]:m-0 mt-0.5 text-ide-text">
                <ReactMarkdown>{step.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type FileTab = 'main.py' | 'config.json' | 'requirements.txt';
type BottomTab = 'terminal' | 'console' | 'ai-mentor';

// Result of the live, client-side runModule() call — what main.py's
// top-level code actually printed, or a real (not simulated) error from
// the same error taxonomy every other execution path in this app uses.
type ConsoleResult =
  | { status: 'ok'; stdout: string }
  | { status: 'error'; message: string };
type ConfigTab = 'settings' | 'knowledge' | 'theme';

const ONBOARDING_STEPS = [
  { target: 'config', title: '⚙️ Configure', description: 'Set your project type, system prompt, and capabilities. The system prompt controls how your AI responds.' },
  { target: 'editor', title: '💻 Write Code', description: 'Edit your Python code here. The syntax highlighter shows your code in color. Switch between files using the tabs.' },
  { target: 'preview', title: '💬 Test Your AI', description: 'Chat with your AI in real-time! Your system prompt controls how it responds. Try changing it and see the difference.' },
  { target: 'knowledge', title: '📚 Add Knowledge', description: 'Add custom text and intents (trigger phrase → response pairs) to make your bot smarter! Your bot will reference this data when answering.' },
  { target: 'actions', title: '🚀 Save & Deploy', description: 'Run Tests to check your code, Save Checkpoint to keep your work, and Go Live to publish with a shareable URL!' },
];

const CountdownWidget = ({ hackathonStartDate, hackathonStatus }: { hackathonStartDate?: string | null; hackathonStatus?: 'upcoming' | 'live' | 'ended' | null }) => {
  const [elapsed, setElapsed] = useState({ h: 0, m: 0, s: 0 });
  const [frozen, setFrozen] = useState(false);
  
  useEffect(() => {
    // If event ended, freeze the timer
    if (hackathonStatus === 'ended') {
      setFrozen(true);
      return;
    }
    setFrozen(false);

    // Use hackathon start_date from DB as single source of truth
    let startTime: number;
    if (hackathonStartDate) {
      startTime = new Date(hackathonStartDate).getTime();
      // No early return for a future start_date — tick() below already
      // clamps to 0 via Math.max(0, Date.now() - startTime) and will
      // naturally start counting up the moment real time passes it, AS
      // LONG AS the interval further down actually gets registered.
      // Returning early here used to skip that registration entirely, so
      // nothing ever re-checked the clock: a student who opened Build
      // Studio before the event started would see the widget freeze at
      // 00:00:00 and stay stuck there indefinitely, even well after the
      // hackathon had actually gone live.
    } else {
      // Fallback to localStorage only if no hackathon data
      const stored = localStorage.getItem('forge-session-start');
      if (stored) {
        startTime = parseInt(stored);
        if (Date.now() - startTime > 24 * 60 * 60 * 1000) {
          startTime = Date.now();
          localStorage.setItem('forge-session-start', startTime.toString());
        }
      } else {
        startTime = Date.now();
        localStorage.setItem('forge-session-start', startTime.toString());
      }
    }
    
    const tick = () => {
      const diff = Math.max(0, Date.now() - startTime);
      setElapsed({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hackathonStartDate, hackathonStatus]);

  const totalSec = elapsed.h * 3600 + elapsed.m * 60 + elapsed.s;
  const isLong = totalSec > 5400; // > 90 min
  const isMedium = totalSec > 2700 && !isLong; // > 45 min

  return (
    <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${
      frozen ? 'bg-red-500/25 border-red-400/50 text-red-300'
      : isLong ? 'bg-amber-500/25 border-amber-400/50 text-amber-300' 
      : isMedium ? 'bg-blue-500/20 border-blue-400/40 text-blue-300'
      : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
    }`}>
      <Clock className="w-3 h-3" />
      <span>{String(elapsed.h).padStart(2,'0')}:{String(elapsed.m).padStart(2,'0')}:{String(elapsed.s).padStart(2,'0')}</span>
      {frozen && <span className="text-[9px] opacity-70">ENDED</span>}
    </div>
  );
};

export const ProjectEditor = ({ initialType, initialCode, hackathonStartDate, hackathonStatus, hasLiveEvent = false, blankStartMode = false }: ProjectEditorProps) => {
  const isMobile = useIsMobile();
  // Which scaffold table a FRESH main.py gets seeded from. Metadata fields
  // (name/icon/systemPrompt/config/requirements) are identical between the
  // two tables — only `main` differs — so reads of those fields don't need
  // to switch tables, only the sites that actually seed `main.py` do.
  const scaffolds = blankStartMode ? PROJECT_SCAFFOLDS_BLANK : PROJECT_SCAFFOLDS;
  const [projectType, setProjectType] = useState<ProjectType>(initialType || 'chatbot');
  const [projectName, setProjectName] = useState('My AI Project');
  const [systemPrompt, setSystemPrompt] = useState(PROJECT_SCAFFOLDS[initialType || 'chatbot'].systemPrompt);
  const [showConfig, setShowConfig] = useState(() => !isMobile && window.innerWidth >= 1024);
  const [showPreview, setShowPreview] = useState(!isMobile);
  const [configTab, setConfigTab] = useState<ConfigTab>('settings');

  // Knowledge base state
  const [knowledgeBase, setKnowledgeBase] = useState(() => localStorage.getItem('forge-knowledge-base') || '');
  const [qaData, setQaData] = useState<QAPair[]>(() => {
    try {
      const stored = localStorage.getItem('forge-qa-data');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      // Backfill id for pairs saved before that field existed — a
      // returning student's localStorage predates it entirely, and every
      // pair sharing the same `undefined` key would break React's list
      // reconciliation for the whole sidebar, not just the new bug this id
      // was added to fix.
      return (Array.isArray(parsed) ? parsed : []).map((p: any) => ({ id: p?.id ?? crypto.randomUUID(), q: p?.q ?? '', a: p?.a ?? '' }));
    } catch { return []; }
  });

  // Theme state
  const [selectedTheme, setSelectedTheme] = useState(() => {
    const stored = localStorage.getItem('forge-theme');
    if (stored) { try { return JSON.parse(stored); } catch {} }
    return THEMES[0];
  });
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('forge-logo-url') || '');

  // File state
  const [activeFile, setActiveFile] = useState<FileTab>('main.py');
  const [files, setFiles] = useState({
    'main.py': initialCode || scaffolds[initialType || 'chatbot'].main,
    'config.json': scaffolds[initialType || 'chatbot'].config,
    'requirements.txt': scaffolds[initialType || 'chatbot'].requirements,
  });

  const [savedFiles, setSavedFiles] = useState<Record<string, string>>(() => ({
    'main.py': initialCode || scaffolds[initialType || 'chatbot'].main,
    'config.json': scaffolds[initialType || 'chatbot'].config,
    'requirements.txt': scaffolds[initialType || 'chatbot'].requirements,
  }));
  const isDirty = useMemo(() => {
    return Object.keys(files).some(key => files[key as FileTab] !== savedFiles[key]);
  }, [files, savedFiles]);

  // isDirty was already tracked (drives the "Save" button, the autosave
  // countdown reset, etc.) but nothing ever warned before closing/
  // navigating away with it still true — a ref so the listener always
  // checks the CURRENT value instead of whatever isDirty was when the
  // effect first registered.
  const isDirtyForUnloadRef = useRef(isDirty);
  isDirtyForUnloadRef.current = isDirty;
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyForUnloadRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'system', content: '⚡ Project initialized. Click "Run Tests" or type a message to test your AI.' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Voice assistant state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Mirrors isSpeaking for recognition.onresult below, which is set up once
  // per listening session (long-lived, not re-created every render) and
  // would otherwise see whatever isSpeaking was at that moment forever.
  const isSpeakingRef = useRef(false);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voiceConversationMode, setVoiceConversationMode] = useState(false);
  const recognitionRef = useRef<any>(null);
  const voiceModeRef = useRef(false);
  const handleChatSendRef = useRef<(msg?: string) => void>(() => {});
  const wakeWordRef = useRef<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => localStorage.getItem('forge-current-project-id'));
  // Baseline version for save-conflict detection — updated on load and after
  // every successful save; a stale value here means another tab/device saved
  // in between, and save_own_project will reject the write instead of
  // silently clobbering it.
  const [lastKnownUpdatedAt, setLastKnownUpdatedAt] = useState<string | null>(null);
  // Without this, autosave (every 2 minutes) re-hits the same CONFLICT and
  // re-shows the toast indefinitely once one occurs, since nothing else
  // updates lastKnownUpdatedAt until the student actually reloads or saves
  // successfully. Reset on a successful save; deliberately NOT fed by the
  // is_published poll below — silently adopting a newer timestamp there
  // would defeat the whole point of conflict detection by making the next
  // save's stale-check pass even though the local edits are still stale.
  const conflictAlertedRef = useRef(false);
  // ── Publish-state visibility — a judge/organizer taking a project
  // offline (toggle_project_publish) used to be completely invisible in
  // Build Studio: nothing here tracked is_published at all, so the "Go
  // Live" button looked identical whether the project was live or had
  // just been pulled. Polled (not realtime) for the same reason
  // reward_boxes polls instead of subscribing — RLS on ai_projects is
  // published-only, so realtime can't reliably push the exact transition
  // this needs to catch. ──
  const [isPublished, setIsPublished] = useState(false);
  const [takenOfflineNotice, setTakenOfflineNotice] = useState(false);
  const publishBaselinedRef = useRef(false);
  const applyPublishState = useCallback((nowPublished: boolean) => {
    setIsPublished(prevPublished => {
      // Only warn on a TRUE -> false transition, once a baseline is
      // established — a brand-new, never-published project is also
      // is_published === false, and that's normal, not a "taken offline".
      if (publishBaselinedRef.current && prevPublished && !nowPublished) {
        setTakenOfflineNotice(true);
      }
      publishBaselinedRef.current = true;
      return nowPublished;
    });
  }, []);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [authorEmail, setAuthorEmail] = useState(() => {
    const stored = localStorage.getItem('forge-student-email');
    if (stored) return stored;
    const generated = `student-${Math.random().toString(36).slice(2, 8)}@forge.local`;
    localStorage.setItem('forge-student-email', generated);
    return generated;
  });
  const [authorName, setAuthorName] = useState(() => {
    const stored = localStorage.getItem('forge-student-name');
    if (stored) return stored;
    const generated = `Student-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    localStorage.setItem('forge-student-name', generated);
    return generated;
  });
  const [aiCallCount, setAiCallCount] = useState(0);

  // Undo/redo history stack
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const lastSnapshotRef = useRef<string>(initialCode || scaffolds[initialType || 'chatbot'].main);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save timer
  const [autoSaveCountdown, setAutoSaveCountdown] = useState(120);
  const autoSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveTriggeredRef = useRef(false);

  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('terminal');

  // Live console — what main.py's top-level code actually prints, computed
  // client-side (see the runModule import above). null = not run yet.
  const [consoleResult, setConsoleResult] = useState<ConsoleResult | null>(null);
  const consoleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against a slower earlier run resolving after a faster later one
  // — same shape as this codebase's other async-race guards (e.g.
  // LessonsPanel's fetchAllRequestRef) — since runModule is async.
  const consoleRunIdRef = useRef(0);

  const [aiOutput, setAiOutput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeAiAction, setActiveAiAction] = useState<string | null>(null);
  const [mentorInput, setMentorInput] = useState('');
  const [mentorHistory, setMentorHistory] = useState<{ role: string; content: string }[]>([]);

  const [publishOpen, setPublishOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // ── Find & Replace state ──
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [showReplace, setShowReplace] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // ── Problems panel — clickable list of lint issues, not just a count ──
  const [problemsPanelOpen, setProblemsPanelOpen] = useState(false);

  // ── Autocomplete state ──
  const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([]);
  const [autocompletePos, setAutocompletePos] = useState<{ top: number; left: number } | null>(null);
  const [selectedAutocomplete, setSelectedAutocomplete] = useState(0);
  const autocompleteWordRef = useRef('');

  // ── Tutorial mode state ──
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const [onboardingStep, setOnboardingStep] = useState<number | null>(() => {
    const seen = localStorage.getItem('buildstudio-onboarded');
    return seen ? null : 0;
  });

  const [showPromptHelp, setShowPromptHelp] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(() => !localStorage.getItem('forge-walkthrough-done') && !!localStorage.getItem('buildstudio-onboarded'));
  const [milestoneMsg, setMilestoneMsg] = useState<string | null>(null);
  const prevLevelRef = useRef<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleSaveRef = useRef<() => void>(() => {});
  const handleRunRef = useRef<() => void>(() => {});

  // Typing performance refs
  const fileUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorRafRef = useRef<number | null>(null);
  const liveConfigTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedLiveConfig, setDebouncedLiveConfig] = useState(() => extractConfigFromCode(files['main.py']));

  // Restore session from DB on mount if we have a saved project ID
  // Skip restore if initialCode was explicitly provided (user picked a new template)
  useEffect(() => {
    if (initialCode) return; // Fresh template selected — don't overwrite with old project
    const savedId = localStorage.getItem('forge-current-project-id');
    // forge-editor-code is tagged with the project id it was written for
    // (see updateFile) — only ever trust it for the project it actually
    // matches, so a leftover draft from a different/earlier project can't
    // silently bleed into whatever loads next.
    const readDraft = (): { projectId: string | null; code: string } | null => {
      const raw = localStorage.getItem('forge-editor-code');
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.code === 'string') return { projectId: parsed.projectId ?? null, code: parsed.code };
        return null;
      } catch {
        return { projectId: null, code: raw }; // pre-tagging format: a bare code string
      }
    };
    if (!savedId) {
      // Nothing checkpointed to the DB yet, but every keystroke already
      // writes to 'forge-editor-code' (see updateFile) — without this, a
      // student who types for 20 minutes and refreshes/closes the tab
      // before their FIRST "Save Checkpoint" loses everything, despite the
      // code visibly appearing to persist on every keystroke.
      // Deliberately does NOT touch savedFiles — this draft was never
      // actually saved server-side, so isDirty should (correctly) still
      // read true and prompt them to save it for real.
      const draft = readDraft();
      if (draft && draft.projectId === null && draft.code.trim()) {
        setFiles(prev => ({ ...prev, 'main.py': draft.code }));
        if (textareaRef.current) textareaRef.current.value = draft.code;
      }
      return;
    }
    // ai_projects' public SELECT policy is published-only — an in-progress
    // (unpublished) draft needs the owner-checked RPC, not a raw table read.
    supabase.rpc('get_own_project_by_id', { p_project_id: savedId, p_participant_email: authorEmail }).then(({ data: rawData, error }) => {
      const data = rawData as any;
      const draft = readDraft();
      const localDraftForThisProject = draft && draft.projectId === savedId ? draft.code : null;
      if (error || !data) {
        localStorage.removeItem('forge-current-project-id');
        // Server copy is unreachable/gone, but a same-project local draft is
        // still real, unsaved work sitting right there — losing it on top of
        // a fetch failure would be the worst version of this bug.
        if (localDraftForThisProject && localDraftForThisProject.trim()) {
          setFiles(prev => ({ ...prev, 'main.py': localDraftForThisProject }));
          if (textareaRef.current) textareaRef.current.value = localDraftForThisProject;
        }
        return;
      }
      setCurrentProjectId(data.id);
      setLastKnownUpdatedAt(data.updated_at ?? null);
      if (data.code) {
        // A local draft for this exact project that differs from the server
        // copy is, by construction, an edit made sometime after the last
        // successful save (updateFile writes it on every keystroke) — server
        // data used to win unconditionally here, silently discarding newer
        // unsaved work on every reload after a project's first save.
        // savedFiles still baselines to the server copy (not the draft), so
        // isDirty correctly keeps prompting to save it for real.
        const effectiveCode = (localDraftForThisProject && localDraftForThisProject !== data.code) ? localDraftForThisProject : data.code;
        setFiles(prev => ({ ...prev, 'main.py': effectiveCode }));
        setSavedFiles(prev => ({ ...prev, 'main.py': data.code }));
        if (textareaRef.current) textareaRef.current.value = effectiveCode;
      }
      if (data.template_id && (data.template_id === 'chatbot' || data.template_id === 'agent')) {
        setProjectType(data.template_id as ProjectType);
      }
      if (data.project_name) setProjectName(data.project_name);
      applyPublishState(!!data.is_published);
    });
  }, []);

  // Light poll for is_published flipping true -> false out from under the
  // student (a judge/organizer took the project offline mid-session) — see
  // applyPublishState above for why this is polling, not realtime.
  useEffect(() => {
    if (!currentProjectId) return;
    const checkPublishState = () => {
      supabase.rpc('get_own_project_by_id', { p_project_id: currentProjectId, p_participant_email: authorEmail }).then(({ data }) => {
        if (data) applyPublishState(!!(data as any).is_published);
      });
    };
    checkPublishState();
    const id = setInterval(checkPublishState, 25000);
    return () => clearInterval(id);
  }, [currentProjectId, authorEmail, applyPublishState]);

  // Persist knowledge/QA/theme to localStorage AND sync to code
  useEffect(() => { localStorage.setItem('forge-knowledge-base', knowledgeBase); }, [knowledgeBase]);
  useEffect(() => { localStorage.setItem('forge-qa-data', JSON.stringify(qaData)); }, [qaData]);
  useEffect(() => { localStorage.setItem('forge-theme', JSON.stringify(selectedTheme)); }, [selectedTheme]);
  useEffect(() => { localStorage.setItem('forge-logo-url', logoUrl); }, [logoUrl]);

  // Sync sidebar Knowledge Base text → code's KNOWLEDGE_BASE variable
  const prevKnowledgeRef = useRef(knowledgeBase);
  useEffect(() => {
    if (prevKnowledgeRef.current === knowledgeBase) return;
    prevKnowledgeRef.current = knowledgeBase;
    setFiles(prev => {
      const code = prev['main.py'];
      const tripleRegex = /(?:KNOWLEDGE_BASE|knowledge_base)\s*=\s*"""([\s\S]*?)"""/;
      const singleRegex = /(?:KNOWLEDGE_BASE|knowledge_base)\s*=\s*["'](.*)["']/;
      const varName = stripComments(code).match(/KNOWLEDGE_BASE\s*=/) ? 'KNOWLEDGE_BASE' : 'knowledge_base';
      let updated = replaceOutsideComments(code, tripleRegex, `${varName} = """${knowledgeBase}"""`);
      if (updated === null) {
        if (knowledgeBase.includes('\n')) {
          updated = replaceOutsideComments(code, singleRegex, `${varName} = """${knowledgeBase}"""`);
        } else {
          const escaped = knowledgeBase.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          updated = replaceOutsideComments(code, singleRegex, `${varName} = "${escaped}"`);
        }
      }
      return updated !== null ? { ...prev, 'main.py': updated } : prev;
    });
  }, [knowledgeBase]);

  // Read knowledge base from code when code changes (skip during typing)
  useEffect(() => {
    if (isTypingRef.current) return;
    // stripComments first — every FORGE scaffold shows a commented teaching
    // example of this assignment ABOVE the real one (e.g. the chatbot
    // template's Challenge 6 comment), and a plain match() against raw code
    // would find that example first and read garbled comment text into the
    // sidebar on a completely untouched project.
    const code = stripComments(files['main.py']);
    const tripleMatch = code.match(/(?:KNOWLEDGE_BASE|knowledge_base)\s*=\s*"""([\s\S]*?)"""/);
    const singleMatch = code.match(/(?:KNOWLEDGE_BASE|knowledge_base)\s*=\s*["'](.*)["']/);
    const match = tripleMatch || singleMatch;
    if (match) {
      // Same unescape the System Prompt read-back already does (line
      // ~955) — the write effect above escapes \ and " when building the
      // single-line form, but this read-back never undid it, so typing a
      // quote into Knowledge Base round-tripped as a literal backslash and
      // re-escaped further on every subsequent edit.
      const unescaped = tripleMatch ? match[1] : match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      if (unescaped !== prevKnowledgeRef.current) {
        prevKnowledgeRef.current = unescaped;
        setKnowledgeBase(unescaped);
      }
    }
  }, [files['main.py']]);

  // Sync sidebar Q&A pairs → code's QA_PAIRS variable. prevQARef is shared
  // with the read-back effect below (both directions need one consistent
  // "last known content" baseline to avoid a write->read->write loop) — it
  // deliberately compares q/a content only, never `id`, since id is a
  // local-only React key that's meaningless to either sync direction.
  const prevQARef = useRef(JSON.stringify(qaData.map(p => ({ q: p.q, a: p.a }))));
  useEffect(() => {
    const serialized = JSON.stringify(qaData.map(p => ({ q: p.q, a: p.a })));
    if (prevQARef.current === serialized) return;
    prevQARef.current = serialized;
    const validPairs = qaData.filter(p => p.q.trim() && p.a.trim());
    setFiles(prev => {
      const code = prev['main.py'];
      const stripped = stripComments(code);
      const varName = stripped.match(/QA_PAIRS\s*=/) ? 'QA_PAIRS' : 'qa_pairs';
      const pairsStr = validPairs.length === 0
        ? '[]'
        : '[\n' + validPairs.map(p => `    {"q": "${p.q.replace(/"/g, '\\"')}", "a": "${p.a.replace(/"/g, '\\"')}"}`).join(',\n') + '\n]';
      // Comment-anchored (like replaceOutsideComments) AND balanced-bracket-
      // aware for the END boundary — a lazy \[...\] regex here would stop
      // replacing at the first closing bracket inside an EXISTING pair's
      // answer text (e.g. "[S02E05]"), leaving a corrupted trailing fragment
      // of the old list appended after the new one instead of a clean
      // replacement.
      const varMatch = stripped.match(/(?:QA_PAIRS|qa_pairs)\s*=\s*/);
      if (!varMatch || varMatch.index === undefined) return prev;
      const startLine = stripped.slice(0, varMatch.index).split('\n').length - 1;
      const rawLines = code.split('\n');
      const before = rawLines.slice(0, startLine).join('\n');
      const from = rawLines.slice(startLine).join('\n');
      const fromVarMatch = from.match(/(?:QA_PAIRS|qa_pairs)\s*=\s*/);
      if (!fromVarMatch || fromVarMatch.index === undefined) return prev;
      const bracket = findBalancedBracket(from, '[', ']', fromVarMatch.index + fromVarMatch[0].length);
      if (!bracket) return prev;
      const updatedFrom = from.slice(0, fromVarMatch.index) + `${varName} = ${pairsStr}` + from.slice(bracket.end + 1);
      const updated = (startLine > 0 ? before + '\n' : '') + updatedFrom;
      return { ...prev, 'main.py': updated };
    });
  }, [qaData]);

  // Read Q&A pairs from code when code changes (skip during typing)
  useEffect(() => {
    if (isTypingRef.current) return;
    // stripComments first — the chatbot scaffold's Challenge 7 comment shows
    // a two-pair QA_PAIRS example above the real (empty) `QA_PAIRS = []`;
    // matching raw code read those placeholder pairs into the sidebar as if
    // the student had already answered them.
    const code = stripComments(files['main.py']);
    const varMatch = code.match(/(?:QA_PAIRS|qa_pairs)\s*=\s*/);
    if (!varMatch || varMatch.index === undefined) return;
    // Balanced-bracket-aware, not a lazy \[...\] regex — the latter stops at
    // the first closing bracket character it finds anywhere, including one
    // sitting inside a pair's own answer text (e.g. "Check out episode
    // [S02E05]!"), which silently dropped every pair from that point on,
    // not just the one containing a bracket.
    const bracket = findBalancedBracket(code, '[', ']', varMatch.index + varMatch[0].length);
    if (!bracket) return;
    const inner = code.slice(bracket.start + 1, bracket.end);
    // q/a only — id gets assigned fresh below, ONLY when content actually
    // changed, so an unrelated re-run of this effect (e.g. a code edit
    // elsewhere in the file) doesn't regenerate every pair's id and
    // needlessly remount the whole sidebar list.
    const pairs: { q: string; a: string }[] = [];
    // Quote-aware (matches extractQAPairs above) — the single-exclusion
    // ["']([^"']+)["'] this used to be truncates at the first apostrophe,
    // which made the whole {...} fail to match and silently DROPPED the
    // pair from qaData on every keystroke for any answer containing "I'm",
    // "don't", etc. — the student would watch their own answer vanish
    // from the sidebar as they typed it.
    // (?:[^"\\]|\\.)* — string content that allows escaped characters —
    // not just [^"]+, which stopped at a LITERAL quote character even when
    // it was backslash-escaped. Q&A text gets written with internal "
    // escaped as \" (e.g. an answer containing She said "hi"), so the old
    // pattern truncated the match there and dropped the pair entirely —
    // same failure shape as the already-fixed apostrophe bug.
    const regex = /\{\s*["']q["']\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*,\s*["']a["']\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*\}/g;
    const unescapeQA = (s: string) => s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    let m;
    while ((m = regex.exec(inner)) !== null) pairs.push({ q: unescapeQA(m[1] ?? m[2]), a: unescapeQA(m[3] ?? m[4]) });
    const newSerialized = JSON.stringify(pairs);
    if (newSerialized !== prevQARef.current) {
      prevQARef.current = newSerialized;
      setQaData(pairs.map(p => ({ id: crypto.randomUUID(), ...p })));
    }
  }, [files['main.py']]);

  // Sync theme selection to code's APP_THEME variable
  const themeSyncRef = useRef(selectedTheme.id);
  useEffect(() => {
    if (themeSyncRef.current === selectedTheme.id) return;
    themeSyncRef.current = selectedTheme.id;
    setFiles(prev => {
      const code = prev['main.py'];
      const regex = /(?:APP_THEME|app_theme)\s*=\s*["']([^"']*)["']/;
      const varName = stripComments(code).match(/APP_THEME\s*=/) ? 'APP_THEME' : 'app_theme';
      const updated = replaceOutsideComments(code, regex, `${varName} = "${selectedTheme.id}"`);
      return updated !== null && updated !== code ? { ...prev, 'main.py': updated } : prev;
    });
  }, [selectedTheme.id]);

  // Read theme from code when code changes (skip during typing)
  useEffect(() => {
    if (isTypingRef.current) return;
    const code = stripComments(files['main.py']);
    const match = code.match(/(?:APP_THEME|app_theme)\s*=\s*["']([^"']*)["']/);
    if (match && match[1] && match[1] !== themeSyncRef.current) {
      const found = THEMES.find(t => t.id === match[1]);
      if (found) {
        themeSyncRef.current = found.id;
        setSelectedTheme(found);
      }
    }
  }, [files['main.py']]);

  // Sync textarea value imperatively when switching file tabs
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = files[activeFile];
    }
  }, [activeFile]);

  // Imperatively sync textarea when sync effects update files (only if not focused)
  const syncTextareaIfNotFocused = useCallback((newCode: string) => {
    if (textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.value = newCode;
    }
  }, []);

  useEffect(() => {
    if (isTypingRef.current) return; // Skip during active typing — textarea is already correct
    if (activeFile === 'main.py') {
      syncTextareaIfNotFocused(files['main.py']);
    }
  }, [files['main.py'], activeFile, syncTextareaIfNotFocused]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Cap chat messages separately to avoid re-render loop
  useEffect(() => {
    if (chatMessages.length > 100) {
      setChatMessages(prev => prev.length > 100 ? prev.slice(-80) : prev);
    }
  }, [chatMessages.length]);

  // ── Auto-save countdown timer (handled by mount-based interval at line ~1839) ──
  // Reset countdown when file becomes clean
  useEffect(() => {
    if (!isDirty) {
      setAutoSaveCountdown(120);
    }
  }, [isDirty]);


  const prevSystemPromptRef = useRef(systemPrompt);
  useEffect(() => {
    if (prevSystemPromptRef.current !== systemPrompt) {
      setFiles(prev => {
        const code = prev['main.py'];
        // Support SYSTEM_MESSAGE, system_message, SYSTEM_PROMPT
        const tripleRegex = /(?:SYSTEM_MESSAGE|system_message|SYSTEM_PROMPT)\s*=\s*"""([\s\S]*?)"""/;
        const singleRegex = /(?:SYSTEM_MESSAGE|system_message|SYSTEM_PROMPT)\s*=\s*["'](.*)["']/;
        const strippedForName = stripComments(code);
        const varName = strippedForName.match(/SYSTEM_MESSAGE\s*=/) ? 'SYSTEM_MESSAGE' : strippedForName.match(/SYSTEM_PROMPT\s*=/) ? 'SYSTEM_PROMPT' : 'system_message';
        let updated = replaceOutsideComments(code, tripleRegex, `${varName} = """${systemPrompt}"""`);
        if (updated === null) {
          const needsTriple = systemPrompt.includes('\n');
          if (needsTriple) {
            updated = replaceOutsideComments(code, singleRegex, `${varName} = """${systemPrompt}"""`);
          } else {
            const escaped = systemPrompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            updated = replaceOutsideComments(code, singleRegex, `${varName} = "${escaped}"`);
          }
        }
        return updated !== null ? { ...prev, 'main.py': updated } : prev;
      });
      prevSystemPromptRef.current = systemPrompt;
    }
  }, [systemPrompt]);

  // Read system prompt from code when code changes (skip during typing)
  useEffect(() => {
    if (isTypingRef.current) return;
    // stripComments first — the chatbot scaffold's Challenge 5 comment shows
    // an unescaped triple-quoted SYSTEM_MESSAGE example directly above the
    // real single-quoted assignment; matching raw code read that comment's
    // placeholder text (literal "#" characters included) into the sidebar
    // System Prompt field on a completely untouched project.
    const code = stripComments(files['main.py']);
    const tripleMatch = code.match(/(?:SYSTEM_MESSAGE|system_message|SYSTEM_PROMPT)\s*=\s*"""([\s\S]*?)"""/);
    const singleMatch = code.match(/(?:SYSTEM_MESSAGE|system_message|SYSTEM_PROMPT)\s*=\s*["'](.*)["']/);
    const match = tripleMatch || singleMatch;
    if (match) {
      const unescaped = tripleMatch ? match[1] : match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      if (unescaped !== prevSystemPromptRef.current) {
        prevSystemPromptRef.current = unescaped;
        setSystemPrompt(unescaped);
      }
    }
  }, [files['main.py']]);

  const handleTypeChange = (type: ProjectType) => {
    const scaffold = scaffolds[type];
    setProjectType(type);
    setSystemPrompt(scaffold.systemPrompt);
    setFiles({
      'main.py': scaffold.main,
      'config.json': scaffold.config,
      'requirements.txt': scaffold.requirements,
    });
    setSavedFiles({
      'main.py': scaffold.main,
      'config.json': scaffold.config,
      'requirements.txt': scaffold.requirements,
    });
    setChatMessages([
      { role: 'system', content: `⚡ ${scaffold.icon} ${scaffold.name} project loaded. Ready to build!` },
    ]);
    setTerminalOutput([`> Loaded ${scaffold.name} template`, `> 3 files ready`]);
    setConsoleResult(null); // avoid a stale flash of the previous template's printed output
    setShowBottomPanel(true);
    setBottomTab('terminal');
    setAiOutput('');
    setMentorHistory([]);
    // Clear project ID to prevent cross-template overwrites on save
    setCurrentProjectId(null);
    localStorage.removeItem('forge-current-project-id');
    // Also drop the old draft — otherwise a reload before the next keystroke
    // could resurrect the pre-switch code (it was tagged projectId: null too).
    localStorage.removeItem('forge-editor-code');
    // A pending debounced snapshot from typing right before switching would
    // otherwise fire after this and push the pre-switch content back onto
    // lastSnapshotRef, letting a later Undo resurrect the discarded template.
    if (snapshotTimerRef.current) { clearTimeout(snapshotTimerRef.current); snapshotTimerRef.current = null; }
    setKnowledgeBase('');
    setQaData([]);
    // Reset Design tab state to avoid leaking across templates
    setSelectedTheme(THEMES[0]);
    setLogoUrl('');
    // Reset refs
    prevSystemPromptRef.current = scaffold.systemPrompt;
    prevKnowledgeRef.current = '';
    prevQARef.current = '[]';
    themeSyncRef.current = 'default';
    // Reset undo/redo stacks
    undoStackRef.current = [];
    redoStackRef.current = [];
    lastSnapshotRef.current = scaffold.main;
    // Imperatively reset textarea to match new scaffold
    if (textareaRef.current) textareaRef.current.value = scaffold.main;
    // Immediately update debounced config to prevent stale AI responses
    setDebouncedLiveConfig(extractConfigFromCode(scaffold.main));
    toast.success(`${scaffold.icon} Switched to ${scaffold.name}`);
  };

  // Reset current file to original template code
  const handleResetToTemplate = useCallback(() => {
    const scaffold = scaffolds[projectType];
    const confirmMsg = 'Reset to original template? Your current edits will be lost.';
    if (!window.confirm(confirmMsg)) return;
    // window.confirm blocks the event loop long enough for a pending
    // debounced snapshot (from typing right before Reset) to still be
    // queued — left running, it fires right after this completes and sets
    // lastSnapshotRef back to the pre-reset text, letting Ctrl+Z resurrect
    // code this action explicitly says is not undoable.
    if (snapshotTimerRef.current) { clearTimeout(snapshotTimerRef.current); snapshotTimerRef.current = null; }
    // Clear undo/redo stacks — reset is not undoable (prevents stale state restoration)
    undoStackRef.current = [];
    redoStackRef.current = [];
    lastSnapshotRef.current = scaffold.main;
    setConsoleResult(null); // avoid a stale flash of the pre-reset code's printed output
    setFiles({
      'main.py': scaffold.main,
      'config.json': scaffold.config,
      'requirements.txt': scaffold.requirements,
    });
    setSystemPrompt(scaffold.systemPrompt);
    prevSystemPromptRef.current = scaffold.systemPrompt;
    setKnowledgeBase('');
    prevKnowledgeRef.current = '';
    setQaData([]);
    prevQARef.current = '[]';
    setSelectedTheme(THEMES[0]);
    themeSyncRef.current = 'default';
    if (textareaRef.current) textareaRef.current.value = scaffold.main;
    // Immediately update debounced config to prevent stale AI responses
    setDebouncedLiveConfig(extractConfigFromCode(scaffold.main));
    // Clear project ID on reset so next save creates a fresh project
    setCurrentProjectId(null);
    localStorage.removeItem('forge-current-project-id');
    // Also drop the old draft — otherwise a reload before the next keystroke
    // could resurrect the pre-reset code (it was tagged projectId: null too).
    localStorage.removeItem('forge-editor-code');
    toast.success('🔄 Code reset to original template');
  }, [projectType, files, scaffolds]);

  const updateFile = (content: string) => {
    // Mark as typing to suppress read-back effects
    isTypingRef.current = true;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => { isTypingRef.current = false; }, 800);

    // Snapshot for undo: debounce to avoid storing every keystroke. Scoped
    // to main.py only — undoStackRef/redoStackRef/lastSnapshotRef and
    // handleUndo/handleRedo all assume "main.py" unconditionally. Pushing a
    // snapshot while config.json/requirements.txt is the active tab used to
    // silently corrupt that stack with the wrong file's text, so pressing
    // Ctrl+Z back on main.py could overwrite a student's code with JSON.
    if (activeFile === 'main.py') {
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = setTimeout(() => {
        if (lastSnapshotRef.current !== content) {
          undoStackRef.current.push(lastSnapshotRef.current);
          if (undoStackRef.current.length > 50) undoStackRef.current.shift();
          redoStackRef.current = [];
          lastSnapshotRef.current = content;
        }
      }, 500);
    }

    // Update state immediately — isTypingRef guards prevent effect cascade
    setFiles(prev => ({ ...prev, [activeFile]: content }));

    // Sync to localStorage immediately (lightweight). Tagged with the
    // project id it belongs to (or null pre-first-save) — a bare code
    // string here couldn't tell "unsaved edits on THIS project" apart from
    // stale leftovers from a different project that happened to be open
    // last, which risked bleeding one project's draft into another's on
    // load (see the mount-restore effect below).
    if (activeFile === 'main.py') {
      localStorage.setItem('forge-editor-code', JSON.stringify({ projectId: currentProjectId, code: content }));
    }
  };

  const handleUndo = useCallback(() => {
    // Defensive — the stack itself is now only ever populated while on
    // main.py (see updateFile), but guard here too in case Undo is
    // triggered via keyboard shortcut while another tab is active.
    if (activeFile !== 'main.py' || undoStackRef.current.length === 0) return;
    // A pending 500ms-debounced snapshot from updateFile can still be queued
    // right after a fast keystroke — left running, it fires after this undo
    // completes, pushes the just-undone (stale) content back onto the undo
    // stack, and wipes redoStackRef, silently breaking Redo for this edit.
    if (snapshotTimerRef.current) { clearTimeout(snapshotTimerRef.current); snapshotTimerRef.current = null; }
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(files['main.py']);
    lastSnapshotRef.current = prev;
    setFiles(f => ({ ...f, 'main.py': prev }));
    if (textareaRef.current) textareaRef.current.value = prev;
  }, [files, activeFile]);

  const handleRedo = useCallback(() => {
    if (activeFile !== 'main.py' || redoStackRef.current.length === 0) return;
    // Same stale-timer race as handleUndo above.
    if (snapshotTimerRef.current) { clearTimeout(snapshotTimerRef.current); snapshotTimerRef.current = null; }
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(files['main.py']);
    lastSnapshotRef.current = next;
    setFiles(f => ({ ...f, 'main.py': next }));
    if (textareaRef.current) textareaRef.current.value = next;
  }, [files, activeFile]);

  // ── Global keyboard shortcuts (handled by ref-based handler at line ~1818) ──

  const handleDownload = useCallback(() => {
    const blob = new Blob([files['main.py']], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.py';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('📥 main.py downloaded!');
  }, [files]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.py')) {
      toast.error('Please upload a .py file');
      return;
    }
    if (file.size > 256 * 1024) {
      toast.error('That file is too large — main.py should be well under 256KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        // Push current state to undo stack
        undoStackRef.current.push(files['main.py']);
        if (undoStackRef.current.length > 50) undoStackRef.current.shift();
        redoStackRef.current = [];
        lastSnapshotRef.current = content;

        setFiles(f => ({ ...f, 'main.py': content }));
        if (textareaRef.current) textareaRef.current.value = content;
        // isDirty is computed automatically from files vs savedFiles
        toast.success(`📂 Loaded ${file.name}!`);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be uploaded again
    e.target.value = '';
  }, [files]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(files[activeFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  }, [files, activeFile]);

  const [cursorLine, setCursorLine] = useState(0);
  const [matchedBrackets, setMatchedBrackets] = useState<[number, number] | null>(null);

  // Helper: build a set of positions that are inside strings or comments (O(n) once)
  const buildStringCommentMap = useCallback((code: string): Set<number> => {
    const inside = new Set<number>();
    let i = 0;
    while (i < code.length) {
      const ch = code[i];
      if (ch === '#') {
        const nl = code.indexOf('\n', i);
        const end = nl === -1 ? code.length : nl;
        for (let j = i; j < end; j++) inside.add(j);
        i = end; continue;
      }
      if ((ch === '"' || ch === "'")) {
        const triple = code.slice(i, i + 3) === ch.repeat(3);
        const delim = triple ? ch.repeat(3) : ch;
        const start = i;
        i += delim.length;
        while (i < code.length) {
          if (code[i] === '\\') { inside.add(i); i++; if (i < code.length) { inside.add(i); i++; } continue; }
          if (code.slice(i, i + delim.length) === delim) { for (let j = start; j < i + delim.length; j++) inside.add(j); i += delim.length; break; }
          inside.add(i); i++;
        }
        for (let j = start; j < Math.min(start + delim.length, code.length); j++) inside.add(j);
        continue;
      }
      i++;
    }
    return inside;
  }, []);

  // Kept for backward compat with simple checks — uses cached map
  const isInsideStringOrComment = useCallback((code: string, pos: number): boolean => {
    // Fallback single-position check (only used outside bracket matching now)
    let inString = false;
    let stringChar = '';
    let inTriple = false;
    let tripleChar = '';
    for (let i = 0; i < pos && i < code.length; i++) {
      const ch = code[i];
      if (!inString && !inTriple && ch === '#') {
        const nl = code.indexOf('\n', i);
        if (nl === -1) return true;
        if (pos <= nl) return true;
        i = nl; continue;
      }
      if (!inString && !inTriple) {
        if ((ch === '"' || ch === "'") && code.slice(i, i + 3) === ch.repeat(3)) { inTriple = true; tripleChar = ch; i += 2; continue; }
        if (ch === '"' || ch === "'") { inString = true; stringChar = ch; continue; }
      } else if (inTriple) {
        if (ch === tripleChar && code.slice(i, i + 3) === tripleChar.repeat(3)) { inTriple = false; i += 2; continue; }
      } else if (inString) {
        if (ch === '\\') { i++; continue; }
        if (ch === stringChar) { inString = false; continue; }
      }
    }
    return inString || inTriple;
  }, []);

  const updateCursorInfo = useCallback((target: HTMLTextAreaElement) => {
    // Throttle via requestAnimationFrame to avoid per-keystroke CPU load
    if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current);
    cursorRafRef.current = requestAnimationFrame(() => {
      const pos = target.selectionStart;
      const textBefore = target.value.substring(0, pos);
      const line = textBefore.split('\n').length - 1;
      setCursorLine(line);

      // Bracket matching — build string/comment map once (O(n)), then lookup O(1)
      const code = target.value;
      const OPEN = '([{';
      const CLOSE = ')]}';
      const ch = code[pos] || '';
      const chBefore = pos > 0 ? code[pos - 1] : '';
      let bracketPos = -1;
      let isOpen = false;
      if (OPEN.includes(ch)) { bracketPos = pos; isOpen = true; }
      else if (CLOSE.includes(ch)) { bracketPos = pos; isOpen = false; }
      else if (OPEN.includes(chBefore)) { bracketPos = pos - 1; isOpen = true; }
      else if (CLOSE.includes(chBefore)) { bracketPos = pos - 1; isOpen = false; }

      if (bracketPos >= 0) {
        const scMap = buildStringCommentMap(code);
        if (!scMap.has(bracketPos)) {
          const bracket = code[bracketPos];
          const pairIdx = isOpen ? OPEN.indexOf(bracket) : CLOSE.indexOf(bracket);
          const target2 = isOpen ? CLOSE[pairIdx] : OPEN[pairIdx];
          let depth = 0;
          if (isOpen) {
            for (let j = bracketPos; j < code.length; j++) {
              if (scMap.has(j) && j !== bracketPos) continue;
              if (code[j] === bracket) depth++;
              else if (code[j] === target2) { depth--; if (depth === 0) { setMatchedBrackets([bracketPos, j]); return; } }
            }
          } else {
            for (let j = bracketPos; j >= 0; j--) {
              if (scMap.has(j) && j !== bracketPos) continue;
              if (code[j] === bracket) depth++;
              else if (code[j] === target2) { depth--; if (depth === 0) { setMatchedBrackets([j, bracketPos]); return; } }
            }
          }
        }
      }
      setMatchedBrackets(null);
    });
  }, [buildStringCommentMap]);

  // Convert matched bracket positions to line/col
  const bracketHighlights = useMemo(() => {
    if (!matchedBrackets) return null;
    const code = files[activeFile];
    const codeLines = code.split('\n');
    const posToLineCol = (pos: number) => {
      let remaining = pos;
      for (let l = 0; l < codeLines.length; l++) {
        if (remaining <= codeLines[l].length) return { line: l, col: remaining };
        remaining -= codeLines[l].length + 1;
      }
      return { line: 0, col: 0 };
    };
    return [posToLineCol(matchedBrackets[0]), posToLineCol(matchedBrackets[1])];
  }, [matchedBrackets, files[activeFile]]);

  // Syntax highlighting — only depends on code content, NOT bracket highlights or cursor
  const highlightedContent = useMemo(() => {
    if (activeFile !== 'main.py') return null;
    const codeLines = files['main.py'].split('\n');
    let inMultiLineString = false;
    let multiLineDelim = '"""';
    return codeLines.map((line) => {
      if (!line && !inMultiLineString) return '&nbsp;';
      
      if (inMultiLineString) {
        const closeIdx = line.indexOf(multiLineDelim);
        if (closeIdx !== -1) {
          inMultiLineString = false;
          const stringPart = escapeHtml(line.slice(0, closeIdx + multiLineDelim.length));
          const rest = line.slice(closeIdx + multiLineDelim.length);
          const restTokens = rest ? tokenizeLine(rest).map(t => {
            const escaped = escapeHtml(t.value);
            if (t.type === 'text') return escaped;
            return `<span class="${TOKEN_COLORS[t.type]}">${escaped}</span>`;
          }).join('') : '';
          return `<span class="${TOKEN_COLORS.string}">${stringPart}</span>${restTokens}`;
        }
        return `<span class="${TOKEN_COLORS.string}">${escapeHtml(line)}</span>`;
      }
      
      const tokens = tokenizeLine(line);
      let result = tokens.map(t => {
        const escaped = escapeHtml(t.value);
        if (t.type === 'text') return escaped;
        return `<span class="${TOKEN_COLORS[t.type]}">${escaped}</span>`;
      }).join('');

      // Counted on the non-comment tokens only — a triple-quote that only
      // ever appears inside a # comment (e.g. a teaching comment showing
      // `#   SYSTEM_MESSAGE = """` as documentation) must never flip this
      // into multi-line-string mode, or every comment line after it
      // renders solid green as if it were string content. Counting on the
      // raw line was the bug.
      const codeOnly = tokens.filter(t => t.type !== 'comment').map(t => t.value).join('');
      const tripleDoubleCount = (codeOnly.match(/"""/g) || []).length;
      const tripleSingleCount = (codeOnly.match(/'''/g) || []).length;
      if (tripleDoubleCount % 2 !== 0) { inMultiLineString = true; multiLineDelim = '"""'; }
      else if (tripleSingleCount % 2 !== 0) { inMultiLineString = true; multiLineDelim = "'''"; }

      return result;
    });
  }, [files['main.py'], activeFile]);

  // ── Diff highlighting: lines changed from template ──
  const changedLines = useMemo(() => {
    if (activeFile !== 'main.py') return new Set<number>();
    const templateCode = scaffolds[projectType].main;
    return computeLineDiffs(files['main.py'], templateCode);
  }, [files['main.py'], activeFile, projectType, scaffolds]);

  // ── Python linting ──
  const lintErrors = useMemo(() => {
    if (activeFile !== 'main.py') return [] as LintError[];
    return lintPython(files['main.py']);
  }, [files['main.py'], activeFile]);

  const lintErrorsByLine = useMemo(() => {
    const map = new Map<number, LintError>();
    for (const err of lintErrors) {
      if (!map.has(err.line)) map.set(err.line, err);
    }
    return map;
  }, [lintErrors]);

  // ── Search matches ──
  const searchMatches = useMemo(() => {
    if (!showSearch || !searchTerm) return [] as SearchMatch[];
    return findAllMatches(files[activeFile], searchTerm);
  }, [files[activeFile], searchTerm, showSearch, activeFile]);

  // ── Tutorial target line ──
  const tutorialTargetLine = useMemo(() => {
    if (!tutorialActive || tutorialStep >= CHATBOT_TUTORIAL_STEPS.length) return -1;
    const step = CHATBOT_TUTORIAL_STEPS[tutorialStep];
    return findLineForVariable(files['main.py'], step.linePattern);
  }, [tutorialActive, tutorialStep, files['main.py']]);


  const addQA = () => setQaData(prev => [...prev, { id: crypto.randomUUID(), q: '', a: '' }]);
  const removeQA = (id: string) => setQaData(prev => prev.filter(p => p.id !== id));
  const updateQA = (id: string, field: 'q' | 'a', value: string) => {
    setQaData(prev => prev.map(pair => pair.id === id ? { ...pair, [field]: value } : pair));
  };

  // Abort ref for cancelling in-flight chat/mentor requests
  const chatAbortRef = useRef<AbortController | null>(null);

  // Stream AI response helper
  // onHeaders is optional and additive — every existing caller that doesn't
  // pass it behaves exactly as before. Only handleChatSend uses it, to read
  // the X-Python-Status header and show whether real Python actually
  // answered this message.
  const streamFromEdgeFunction = async (body: Record<string, unknown>, onChunk: (text: string) => void, externalSignal?: AbortSignal, onHeaders?: (headers: Headers) => void): Promise<string> => {
    // The sidebar shows "AI Calls: X / Limit: 40 per session" — until now
    // that "Limit" was purely decorative, since nothing anywhere ever read
    // aiCallCount to stop a call. This is still just a per-tab soft guard
    // (a refresh resets it, and the real backstop is the shared
    // acquire_ai_slot concurrency semaphore server-side), but at least the
    // number on screen now means what it says within one session.
    if (aiCallCount >= 40) {
      throw new Error("You've hit this session's 40 AI-call guide rail. Reload the page to reset it, or take a short break — your code and saves are unaffected.");
    }
    const controller = new AbortController();
    const timeoutMs = 60000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    // If an external signal is provided, abort the internal controller when it fires
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    try {
      const resp = await fetchAIEndpoint(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/python-ai-assist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );
      onHeaders?.(resp.headers);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 401) throw new Error('Authentication error. Please refresh the page.');
        if (resp.status === 429) throw new Error('Too many requests. Wait a moment and try again.');
        if (resp.status === 402) throw new Error('AI credits exhausted. Try again later.');
        throw new Error(err.error || 'AI service error');
      }
      if (!resp.body) throw new Error('No response body');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { fullText += content; onChunk(fullText); }
          } catch { /* skip malformed JSON chunk */ }
        }
      }
      // Flush remaining buffer
      if (buffer.trim()) {
        for (const raw of buffer.split('\n')) {
          if (!raw || !raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { fullText += content; onChunk(fullText); }
          } catch { /* ignore */ }
        }
      }
      setAiCallCount(prev => prev + 1);
      return fullText;
    } catch (e: any) {
      if (e?.name === 'AbortError') throw new Error('⏱️ Response timed out. Please try again.');
      throw e;
    } finally { clearTimeout(timeout); }
  };

  // ── Voice Assistant Helpers ──
  const stripMarkdown = (text: string) => text.replace(/[*_`#\[\]()>~|]/g, '').replace(/\n+/g, ' ').trim();

  const speakText = useCallback((text: string, voiceGender?: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleaned = stripMarkdown(text);
    if (!cleaned) return;
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    // Voice gender selection
    if (voiceGender && voiceGender !== 'default') {
      const voices = window.speechSynthesis.getVoices();
      const genderKeywords = voiceGender === 'female' ? ['female', 'woman', 'zira', 'samantha', 'karen', 'fiona', 'moira', 'tessa', 'victoria'] : ['male', 'man', 'david', 'daniel', 'james', 'alex', 'fred', 'thomas'];
      const match = voices.find(v => genderKeywords.some(k => v.name.toLowerCase().includes(k)));
      if (match) utterance.voice = match;
    }
    setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Recognition is in continuous mode — no need to restart
    };
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  const [waitingForWakeWord, setWaitingForWakeWord] = useState(false);
  const waitingForWakeWordRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  const startListeningOnce = useCallback((wakeWord?: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Speech recognition not supported in this browser'); return; }
    if (!voiceModeRef.current) return;
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    const isWakeWordMode = !!wakeWord;
    if (isWakeWordMode) { setWaitingForWakeWord(true); waitingForWakeWordRef.current = true; }
    setIsListening(true);
    retryCountRef.current = 0;

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      if (!last.isFinal) return;
      const transcript = last[0].transcript.trim();
      if (!transcript) return;
      // Reset retry counter on any successful recognition result
      retryCountRef.current = 0;

      // Without headphones, the mic can pick up the bot's own spoken reply
      // mid-playback and resubmit it as if the student said it — the bot
      // ends up talking to itself. isStreaming was already false by the
      // time speakText() plays (the AI response has already finished
      // streaming), so that alone didn't cover this window.
      if (isSpeakingRef.current) return;

      if (isWakeWordMode && waitingForWakeWordRef.current) {
        if (transcript.toLowerCase().includes(wakeWord!.toLowerCase())) {
          waitingForWakeWordRef.current = false;
          setWaitingForWakeWord(false);
          toast.success(`🎤 "${wakeWord}" detected! Listening...`);
        }
        return;
      }
      handleChatSendRef.current(transcript);
      if (isWakeWordMode) {
        waitingForWakeWordRef.current = true;
        setWaitingForWakeWord(true);
      }
    };

    recognition.onend = () => {
      // continuous mode ended unexpectedly — restart if still in voice mode
      if (voiceModeRef.current && retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        try { recognition.start(); } catch { setIsListening(false); }
        return;
      }
      setIsListening(false);
      setWaitingForWakeWord(false);
      waitingForWakeWordRef.current = false;
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow mic access in browser settings and try again.');
        voiceModeRef.current = false;
        setIsListening(false);
        setWaitingForWakeWord(false);
        waitingForWakeWordRef.current = false;
        return;
      }
      if (e.error === 'no-speech') {
        return;
      }
      if (e.error === 'aborted') return;
      if (retryCountRef.current >= MAX_RETRIES) {
        toast.error(`Mic error: ${e.error}`);
        setIsListening(false);
        setWaitingForWakeWord(false);
        waitingForWakeWordRef.current = false;
        return;
      }
    };

    try {
      recognition.start();
    } catch (err) {
      toast.error('Could not start microphone. Check browser permissions.');
      setIsListening(false);
      setWaitingForWakeWord(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      voiceModeRef.current = false;
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
      setIsListening(false);
      setWaitingForWakeWord(false);
      waitingForWakeWordRef.current = false;
    } else {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      voiceModeRef.current = true;
      startListeningOnce();
    }
  }, [isListening, startListeningOnce]);

  const toggleVoiceConversation = useCallback(() => {
    const newMode = !voiceConversationMode;
    setVoiceConversationMode(newMode);
    voiceModeRef.current = newMode;
    if (newMode) {
      toast.success('🎙️ Hands-free mode ON');
      const ww = debouncedLiveConfig?.wakeWord || '';
      wakeWordRef.current = ww;
      startListeningOnce(ww || undefined);
    } else {
      toast.info('Hands-free mode OFF');
      wakeWordRef.current = '';
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
      window.speechSynthesis?.cancel();
      setIsListening(false);
      setIsSpeaking(false);
      setWaitingForWakeWord(false);
      waitingForWakeWordRef.current = false;
    }
  }, [voiceConversationMode, startListeningOnce, debouncedLiveConfig]);

  // Stop voice recognition when VOICE_ENABLED is toggled off in code
  useEffect(() => {
    if (!debouncedLiveConfig.voiceEnabled && (isListening || voiceConversationMode)) {
      voiceModeRef.current = false;
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
      window.speechSynthesis?.cancel();
      setIsListening(false);
      setIsSpeaking(false);
      setVoiceConversationMode(false);
      setWaitingForWakeWord(false);
      waitingForWakeWordRef.current = false;
    }
  }, [debouncedLiveConfig.voiceEnabled]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handleRun = async () => {
    if (isRunning) return; // Prevent concurrent runs (Ctrl+Enter can bypass the button's disabled state)
    if (!files['main.py'].trim()) { toast.error('Write some code first!'); return; }
    setIsRunning(true);
    setShowBottomPanel(true);
    setBottomTab('terminal');

    // Real Python refuses to run a script with a syntax error — this used
    // to unconditionally simulate a chat response regardless of whether
    // the code was even valid, so a missing colon or an unclosed bracket
    // still printed "✅ All tests passed!". Call lintPython directly here
    // (not the memoized `lintErrors`, which returns [] whenever a
    // different file tab happens to be active) so this check always
    // reflects main.py's actual current content.
    const syntaxErrors = lintPython(files['main.py']).filter(e => e.severity === 'error');
    if (syntaxErrors.length > 0) {
      setTerminalOutput(prev => [
        ...prev.slice(-150),
        `$ python main.py  [${projectType}]`,
        ``,
        `Traceback (most recent call last):`,
        ...syntaxErrors.slice(0, 5).map(e => `  File "main.py", line ${e.line + 1}\n    ${e.message}`),
        ``,
        `❌ ${syntaxErrors.length} syntax error${syntaxErrors.length !== 1 ? 's' : ''} — fix ${syntaxErrors.length !== 1 ? 'these' : 'this'} before your bot can run.`,
        `💡 Tip: the red markers in your code (and the issue count below the editor) point to exactly where.`,
      ]);
      setChatMessages(prev => [...prev, { role: 'system', content: `❌ Can't run — ${syntaxErrors.length} syntax error${syntaxErrors.length !== 1 ? 's' : ''} in your code. Check the terminal for details.` }]);
      setIsRunning(false);
      return;
    }

    // First, do a local config analysis — same defaults-from-the-actual-
    // scaffold approach as getChallengeCount above, so this stays correct
    // for blank-mode projects too instead of a second hardcoded copy.
    const config = extractConfigFromCode(files['main.py']);
    const defaults = extractConfigFromCode(scaffolds[projectType].main);
    const ruleFloor = 3, starterFloor = 4, blockedFloor = 2;

    const localChecks = [
      { label: 'BOT_NAME', ok: config.botName !== defaults.botName && config.botName !== 'AI Bot', val: config.botName },
      { label: 'BOT_EMOJI', ok: config.botEmoji !== defaults.botEmoji, val: config.botEmoji },
      { label: 'AI_MESSAGE', ok: !!config.greeting && config.greeting !== defaults.greeting, val: config.greeting ? '✓ set' : '✗ default' },
      { label: 'CREATOR_NAME', ok: config.creatorName !== defaults.creatorName, val: config.creatorName },
      { label: 'SYSTEM_MESSAGE', ok: config.systemMessage !== defaults.systemMessage && config.systemMessage.length > 30, val: `${config.systemMessage.length} chars` },
      { label: 'KNOWLEDGE_BASE', ok: !!config.knowledgeBaseFromCode.trim() && config.knowledgeBaseFromCode !== defaults.knowledgeBaseFromCode, val: config.knowledgeBaseFromCode ? '✓ loaded' : '✗ empty' },
      { label: 'QA_PAIRS', ok: config.qaPairsFromCode.length > defaults.qaPairsFromCode.length, val: `${config.qaPairsFromCode.length} pairs` },
      { label: 'TEMPERATURE', ok: config.temperature !== defaults.temperature, val: String(config.temperature) },
      { label: 'RULES', ok: config.conversationRules.length >= Math.max(ruleFloor, defaults.conversationRules.length + 1), val: `${config.conversationRules.length} rules` },
      { label: 'CONVERSATION_STARTERS', ok: config.conversationStarters.length >= Math.max(starterFloor, defaults.conversationStarters.length + 1), val: `${config.conversationStarters.length} starters` },
      { label: 'FORBIDDEN_WORDS', ok: config.forbiddenWords.length > defaults.forbiddenWords.length, val: `${config.forbiddenWords.length} words` },
      { label: 'BLOCKED_TOPICS', ok: config.blockedTopics.length >= Math.max(blockedFloor, defaults.blockedTopics.length + 1), val: `${config.blockedTopics.length} topics` },
      { label: 'FEW_SHOT_EXAMPLES', ok: config.fewShotExamples.length > defaults.fewShotExamples.length, val: `${config.fewShotExamples.length} examples` },
      { label: 'SECRET_RESPONSES', ok: Object.keys(config.secretResponses).length > Object.keys(defaults.secretResponses).length, val: `${Object.keys(config.secretResponses).length} secrets` },
      { label: 'MOOD_RESPONSES', ok: Object.keys(config.moodResponses).length > Object.keys(defaults.moodResponses).length, val: `${Object.keys(config.moodResponses).length} moods` },
      { label: 'MAX_RESPONSE_LENGTH', ok: config.maxResponseLength !== defaults.maxResponseLength, val: config.maxResponseLength },
      { label: 'MAX_TOKENS', ok: config.maxTokens !== defaults.maxTokens, val: String(config.maxTokens) },
      { label: 'MOOD', ok: config.mood !== defaults.mood, val: config.mood },
      { label: 'RESPONSE_TONE', ok: isResponseToneCustomized(config.responseTone, config.responseToneConditional, defaults.responseToneConditional), val: config.responseTone || 'default' },
      { label: 'CATCHPHRASES', ok: config.catchphrases.length > defaults.catchphrases.length, val: `${config.catchphrases.length} phrases` },
      { label: 'VOICE_ENABLED', ok: config.voiceEnabled === true, val: config.voiceEnabled ? 'True' : 'False' },
      { label: 'VOICE_MODE', ok: config.voiceMode !== defaults.voiceMode, val: config.voiceMode },
      { label: 'WAKE_WORD', ok: !!config.wakeWord, val: config.wakeWord || '(empty)' },
      { label: 'VOICE_GENDER', ok: config.voiceGender !== defaults.voiceGender, val: config.voiceGender || 'default' },
      { label: 'FALLBACK_MESSAGE', ok: isFallbackMessageCustomized(config.fallbackMessage, defaults.fallbackMessage), val: config.fallbackMessage ? '✓ set' : '✗ default' },
      { label: 'TOPIC_KEYWORDS', ok: config.hasTopicKeywordsLoop && config.qaPairsFromCode.length > defaults.qaPairsFromCode.length, val: config.hasTopicKeywordsLoop ? '✓ loop found' : '✗ missing' },
      { label: 'HYPE_PHRASES', ok: config.hasListComprehension && config.phraseIdeas.length > 0, val: `${config.phraseIdeas.length} ideas` },
      { label: 'PERSONALIZED_INTRO', ok: config.hasParameterizedFunction && !!config.personalizedIntro && config.personalizedIntro !== defaults.personalizedIntro, val: config.personalizedIntro ? '✓ set' : '✗ default' },
      { label: 'MOOD_INSTRUCTION', ok: config.hasSafeDictLookup && !!config.moodInstruction && config.moodInstruction !== defaults.moodInstruction, val: config.moodInstruction ? '✓ set' : '✗ default' },
      { label: 'RULE_COUNT', ok: config.hasAccumulatorLoop && config.conversationRules.length > defaults.conversationRules.length, val: `${config.conversationRules.length} rules counted` },
      { label: 'PRINT + UPPER', ok: config.printUpperStatement !== '' && config.printUpperStatement !== defaults.printUpperStatement, val: config.printUpperStatement ? '✓ printed' : '✗ default' },
      { label: 'IS_EXPRESSIVE', ok: config.booleanLogicExpr !== '' && config.booleanLogicExpr !== defaults.booleanLogicExpr, val: config.booleanLogicExpr || '✗ default' },
      { label: 'NUMBERED RULES', ok: config.whileLoopPrint !== '' && config.whileLoopPrint !== defaults.whileLoopPrint, val: config.whileLoopPrint ? '✓ while loop found' : '✗ missing' },
      { label: 'MAX TOKENS LINE', ok: config.typeCastPrint !== '' && config.typeCastPrint !== defaults.typeCastPrint, val: config.typeCastPrint ? '✓ printed' : '✗ default' },
    ];
    
    const completedCount = localChecks.filter(c => c.ok).length;
    
    setTerminalOutput(prev => [
      ...prev.slice(-150),
      `$ python main.py  [${projectType}]`,
      ``,
      `🔍 FORGE Config Scanner v2.0`,
      `═══════════════════════════════════`,
      `📋 Scanning 34 challenges...`,
      ``,
      ...localChecks.map(c => `  ${c.ok ? '✅' : '⬜'} ${c.label.padEnd(22)} → ${c.val}`),
      ``,
      `═══════════════════════════════════`,
      `📊 Progress: ${completedCount}/34 challenges completed (${Math.round(completedCount / 34 * 100)}%)`,
      `🤖 Bot Name: ${config.botEmoji} ${config.botName}`,
      `🌡️ Temperature: ${config.temperature}`,
      `✍️ Mood: ${config.mood} | Length: ${config.maxResponseLength}`,
      completedCount >= 15 ? `🏆 AMAZING! Your bot is highly customized!` : completedCount >= 10 ? `🔥 Great progress! Keep customizing!` : `💡 Tip: Edit more variables in main.py to unlock challenges!`,
      ``,
      `⏳ Running AI simulation...`,
    ]);
    
    setChatMessages(prev => [...prev, { role: 'system', content: '▶ Running tests...' }]);
    try {
      let result = '';
      await streamFromEdgeFunction(
        { code: files['main.py'], model: projectType, action: 'run', systemPrompt, projectName, projectType },
        (text) => { 
          result = text; 
          setTerminalOutput(prev => {
            const updated = [...prev];
            const runningIdx = updated.lastIndexOf('⏳ Running AI simulation...');
            if (runningIdx !== -1) {
              updated[runningIdx] = result;
            } else {
              updated[updated.length - 1] = result;
            }
            return updated;
          });
        }
      );
      if (!result) {
        setTerminalOutput(prev => [...prev, '⚠ No output received. Check your code for issues.']);
      } else {
        setTerminalOutput(prev => [...prev, '───────────────────', '✅ All tests passed!']);
      }
      setChatMessages(prev => [...prev, { role: 'system', content: `✅ Tests complete! ${completedCount}/34 challenges done.` }]);
      // Used to also insert a 'first_run_success' point_event here —
      // confirmed dead: nothing anywhere sums or displays it, pure ledger
      // noise. Removed rather than left generating rows forever.
    } catch (e: any) {
      setTerminalOutput(prev => [...prev, `❌ Error: ${e.message}`, '', '💡 Tip: Check your code for syntax errors, or try again in a moment.']);
      setChatMessages(prev => [...prev, { role: 'system', content: `❌ ${e.message}` }]);
    } finally { setIsRunning(false); }
  };

  // Debounced config extraction — avoids 30+ regex runs on every keystroke
  useEffect(() => {
    if (liveConfigTimerRef.current) clearTimeout(liveConfigTimerRef.current);
    liveConfigTimerRef.current = setTimeout(() => {
      setDebouncedLiveConfig(extractConfigFromCode(files['main.py']));
    }, 250);
    return () => { if (liveConfigTimerRef.current) clearTimeout(liveConfigTimerRef.current); };
  }, [files['main.py']]);
  const liveConfig = debouncedLiveConfig;

  // Debounced live console — same 250ms debounce as the config extraction
  // above, but this one actually executes the code (client-side, real
  // interpreter) rather than regex-scraping it, so it's async and needs the
  // request-id guard. Budget is intentionally much tighter than respond()'s
  // (400ms/50k steps vs. 20s/200k) — the interpreter's eval loop has no real
  // yield point during pure computation, so a long run doesn't just take a
  // while, it blocks the browser tab's main thread for that whole duration
  // on every keystroke pause. 400ms is generous for any of this scaffold's
  // actual content (small lists, a handful of loop iterations) while
  // keeping worst-case UI freeze on an accidental runaway loop short.
  useEffect(() => {
    if (activeFile !== 'main.py') return;
    if (consoleTimerRef.current) clearTimeout(consoleTimerRef.current);
    consoleTimerRef.current = setTimeout(() => {
      const runId = ++consoleRunIdRef.current;
      runModule(files['main.py'], { timeoutMs: 400, maxSteps: 50000 }).then(r => {
        if (runId !== consoleRunIdRef.current) return; // a newer run already superseded this one
        setConsoleResult(
          r.ok
            ? { status: 'ok', stdout: r.stdout }
            : { status: 'error', message: r.errorMessage || 'Something went wrong running this code.' }
        );
      });
    }, 250);
    return () => { if (consoleTimerRef.current) clearTimeout(consoleTimerRef.current); };
  }, [files['main.py'], activeFile]);

  // Unified challenge count helper — shared between level badge, milestone tracker, and status bar.
  // "Default" (not-yet-customized) values are derived by running the exact
  // same extractor against the active scaffold's own text, not hardcoded
  // literals — so this stays correct whichever scaffold is actually seeding
  // fresh projects (PROJECT_SCAFFOLDS_BLANK's real defaults are "" / 0 / a
  // missing function, not PROJECT_SCAFFOLDS's pre-filled values) without a
  // second hand-maintained copy of the guided scaffold's values to drift.
  const getChallengeCount = useCallback((cfg: ReturnType<typeof extractConfigFromCode>, type: ProjectType) => {
    const defaults = extractConfigFromCode(scaffolds[type].main);
    // Three challenges ask for "at least N of your own," not just "differs
    // from default" — a floor for the 0-pre-filled case, or one more than
    // whatever's already pre-filled, whichever is larger. Reduces to just
    // the floor in blank mode (nothing pre-filled either way).
    const ruleFloor = 3, starterFloor = 4, blockedFloor = 2;
    return [
      cfg.botName !== defaults.botName && cfg.botName !== 'AI Bot',
      cfg.botEmoji !== defaults.botEmoji,
      cfg.greeting && cfg.greeting !== defaults.greeting,
      cfg.creatorName && cfg.creatorName !== defaults.creatorName,
      cfg.systemMessage !== defaults.systemMessage && cfg.systemMessage.length > 30,
      cfg.knowledgeBaseFromCode.trim() !== '' && cfg.knowledgeBaseFromCode !== defaults.knowledgeBaseFromCode,
      cfg.qaPairsFromCode.length > defaults.qaPairsFromCode.length,
      cfg.temperature !== defaults.temperature,
      cfg.conversationRules.length >= Math.max(ruleFloor, defaults.conversationRules.length + 1),
      cfg.conversationStarters.length >= Math.max(starterFloor, defaults.conversationStarters.length + 1),
      cfg.forbiddenWords.length > defaults.forbiddenWords.length,
      cfg.blockedTopics.length >= Math.max(blockedFloor, defaults.blockedTopics.length + 1),
      cfg.fewShotExamples.length > defaults.fewShotExamples.length,
      Object.keys(cfg.secretResponses).length > Object.keys(defaults.secretResponses).length,
      Object.keys(cfg.moodResponses).length > Object.keys(defaults.moodResponses).length,
      cfg.maxResponseLength !== defaults.maxResponseLength,
      cfg.maxTokens !== defaults.maxTokens,
      cfg.mood && cfg.mood !== defaults.mood,
      isResponseToneCustomized(cfg.responseTone, cfg.responseToneConditional, defaults.responseToneConditional),
      cfg.catchphrases.length > defaults.catchphrases.length,
      cfg.voiceEnabled === true,
      cfg.voiceMode !== defaults.voiceMode,
      cfg.wakeWord,
      cfg.voiceGender !== defaults.voiceGender,
      isFallbackMessageCustomized(cfg.fallbackMessage, defaults.fallbackMessage),
      cfg.hasTopicKeywordsLoop && cfg.qaPairsFromCode.length > defaults.qaPairsFromCode.length,
      cfg.hasListComprehension && cfg.phraseIdeas.length > 0,
      cfg.hasParameterizedFunction && !!cfg.personalizedIntro && cfg.personalizedIntro !== defaults.personalizedIntro,
      cfg.hasSafeDictLookup && !!cfg.moodInstruction && cfg.moodInstruction !== defaults.moodInstruction,
      cfg.hasAccumulatorLoop && cfg.conversationRules.length > defaults.conversationRules.length,
      cfg.printUpperStatement !== '' && cfg.printUpperStatement !== defaults.printUpperStatement,
      cfg.booleanLogicExpr !== '' && cfg.booleanLogicExpr !== defaults.booleanLogicExpr,
      cfg.whileLoopPrint !== '' && cfg.whileLoopPrint !== defaults.whileLoopPrint,
      cfg.typeCastPrint !== '' && cfg.typeCastPrint !== defaults.typeCastPrint,
    ].filter(Boolean).length;
  }, [scaffolds]);

  // Track level changes for milestone celebrations (practice mode only)
  useEffect(() => {
    if (hasLiveEvent) return;
    const count = getChallengeCount(liveConfig, projectType);
    const newLevel = getForgeLevel(count);
    // On first run, just record the initial level without celebrating
    if (prevLevelRef.current === null) {
      prevLevelRef.current = newLevel;
      return;
    }
    if (newLevel !== prevLevelRef.current) {
      const levelNames: Record<string, string> = { beginner: '🌱 Beginner', hacker: '⚡ Hacker', architect: '🧠 Architect', 'ai-lord': '👑 AI Lord' };
      if (['hacker', 'architect', 'ai-lord'].includes(newLevel)) {
        setMilestoneMsg(`Level Up! You're now ${levelNames[newLevel]}!`);
      }
    }
    prevLevelRef.current = newLevel;
  }, [liveConfig, hasLiveEvent, projectType, getChallengeCount]);

  const handleChatSend = async (directMessage?: string) => {
    const msg = directMessage || chatInput.trim();
    if (!msg || isStreaming) return;
    // Cancel any in-flight chat stream
    if (chatAbortRef.current) { chatAbortRef.current.abort(); chatAbortRef.current = null; }
    const abortCtl = new AbortController();
    chatAbortRef.current = abortCtl;
    const userMsg = msg;
    setChatInput('');

    // Use memoized config — always reflects latest code edits
    const config = liveConfig;
    const lowerMsg = userMsg.toLowerCase();
    // Case-insensitive already, but still required whitespace and trailing
    // punctuation to match exactly — a student typing the trigger with a
    // trailing period, an extra space, or a "?" silently got no easter
    // egg despite getting the actual phrase right.
    const normalizeTrigger = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?,;:]+$/, '');
    const normalizedMsg = normalizeTrigger(userMsg);
    // FORBIDDEN_WORDS is passed to the AI as an instruction, but secret
    // responses and Q&A answers below are canned student-authored text
    // that bypasses the AI entirely — nothing was ever scrubbing those,
    // so a forbidden word typed into an easter egg or Q&A answer just
    // came straight back out.
    const scrubForbidden = (text: string) => config.forbiddenWords.reduce((acc, word) => {
      const w = word.trim();
      if (!w) return acc;
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return acc.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '***');
    }, text);

    // 1. Check for secret responses FIRST (client-side, near-exact match)
    for (const [trigger, response] of Object.entries(config.secretResponses)) {
      if (normalizedMsg === normalizeTrigger(trigger)) {
        setChatMessages(prev => [
          ...prev,
          { role: 'user', content: userMsg },
          { role: 'assistant', content: scrubForbidden(`${response}`) },
        ]);
        return;
      }
    }

    // 2. Check for EXACT Q&A matches client-side (most reliable)
    // Deduplicate: sidebar qaData syncs to code, so qaPairsFromCode may duplicate.
    // Use sidebar qaData as primary, then add any code-only pairs not already present.
    const sidebarPairs = qaData.filter(p => p.q.trim() && p.a.trim());
    const sidebarQs = new Set(sidebarPairs.map(p => p.q.toLowerCase().trim()));
    const codePairs = config.qaPairsFromCode.filter(p => !sidebarQs.has(p.q.toLowerCase().trim()));
    const mergedQA = [...sidebarPairs, ...codePairs];
    // Generic filler words carry no topic signal — without excluding them,
    // a message as thin as "can you help" bidirectional-overlap-matched
    // ANY Q&A pair that happened to also contain those three words,
    // regardless of actual subject (e.g. an unrelated math Q&A pair).
    const QA_STOP_WORDS = new Set(['can', 'you', 'the', 'and', 'for', 'are', 'that', 'this', 'with', 'what', 'how', 'does', 'did', 'was', 'were', 'have', 'has', 'just', 'please', 'your', 'like', 'want', 'need', 'tell', 'know', 'get', 'got', 'not', 'but', 'all', 'any', 'out', 'who', 'why', 'when', 'where', 'about', 'me']);
    const userWords = lowerMsg.split(/\s+/).filter(w => w.length > 2 && !QA_STOP_WORDS.has(w));
    // Scan every pair and keep the strongest match instead of acting on
    // whichever happened to come first in the array — an exact substring
    // match later in the list used to lose to a weaker fuzzy match earlier.
    let bestQA: { pair: (typeof mergedQA)[number]; score: number } | null = null;
    for (const pair of mergedQA) {
      const qLower = pair.q.toLowerCase().trim();
      if (!qLower) continue;
      // The full question appearing inside what the user typed is a strong
      // signal regardless of length. The reverse — the user's message being
      // a substring of the question — is only reliable when that message
      // carries real content; otherwise a generic filler phrase like "can
      // you help" is trivially a substring of "can you help me with math
      // homework" and would match on nothing meaningful.
      const isSupersetOfQ = lowerMsg.includes(qLower);
      const isGenericSubstringOfQ = userWords.length >= 2 && qLower.includes(lowerMsg);
      if (isSupersetOfQ || isGenericSubstringOfQ) {
        const score = 1000 + qLower.length; // exact/substring always beats a fuzzy match
        if (!bestQA || score > bestQA.score) bestQA = { pair, score };
        continue;
      }
      // Bug 2: Tighter fuzzy matching — require bidirectional overlap ≥60%
      const qWords = qLower.split(/\s+/).filter(w => w.length > 2 && !QA_STOP_WORDS.has(w));
      const userInQ = qWords.length > 0 ? userWords.filter(w => qLower.includes(w)).length / qWords.length : 0;
      const qInUser = userWords.length > 0 ? qWords.filter(w => lowerMsg.includes(w)).length / userWords.length : 0;
      if (userWords.length >= 2 && userInQ >= 0.6 && qInUser >= 0.6) {
        const score = userInQ + qInUser;
        if (!bestQA || score > bestQA.score) bestQA = { pair, score };
      }
    }
    if (bestQA) {
      // Build the answer with bot personality
      let answer = bestQA.pair.a;
      if (config.catchphrases.length > 0) {
        answer += ` ${config.catchphrases[Math.floor(Math.random() * config.catchphrases.length)]}`;
      }
      if (config.signOff) {
        answer += `\n\n${config.signOff}`;
      }
      setChatMessages(prev => [
        ...prev,
        { role: 'user', content: userMsg },
        { role: 'assistant', content: scrubForbidden(answer) },
      ]);
      return;
    }

    // 3. Check for blocked topics client-side
    // Word-boundary match, not raw substring — a blocked topic like "sex" or "ass"
    // used to trip on unrelated words like "Sussex" or "assessment".
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const topicMatches = (topic: string) => {
      const t = topic.trim();
      return t.length > 0 && new RegExp(`\\b${escapeRegex(t)}\\b`, 'i').test(userMsg);
    };
    for (const topic of config.blockedTopics) {
      if (topicMatches(topic)) {
        let refusal = `I'm sorry, I can't discuss "${topic}". Is there something else I can help you with?`;
        if (config.signOff) refusal += `\n\n${config.signOff}`;
        setChatMessages(prev => [
          ...prev,
          { role: 'user', content: userMsg },
          { role: 'assistant', content: refusal },
        ]);
        return;
      }
    }

    // 4. For everything else, send to AI with full config context
    // MEMORY_ENABLED / REMEMBER_NAME toggled off used to have zero runtime
    // effect — full chat history was sent to the AI regardless, so a
    // student who explicitly turned memory off would never see it matter.
    // With it off, only the current message goes out, so the bot really
    // does forget everything between turns.
    const history = config.rememberName
      ? chatMessages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .filter(m => m.content !== '...')
          .map(m => ({ role: m.role, content: m.content }))
      : [];
    history.push({ role: 'user', content: userMsg });
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsStreaming(true);
    const placeholderId = Date.now();
    try {
      let assistantReply = '';
      let usedRealPython = false;
      setChatMessages(prev => [...prev, { role: 'assistant', content: '...', _id: placeholderId }]);

      // Bug 7: Use code as source of truth to avoid sending duplicates
      const mergedKnowledge = config.knowledgeBaseFromCode || knowledgeBase || '';

      await streamFromEdgeFunction(
        {
          code: userMsg,
          model: projectType,
          action: 'test-agent',
          systemPrompt: config.systemMessage || systemPrompt,
          messages: history.slice(0, -1),
          // main.py's raw text — if it defines a real respond() that
          // returns a string, the edge function uses that directly and
          // skips the LLM entirely. Empty/no respond()/an error all fall
          // straight through to the exact same AI behavior as before this
          // existed.
          studentCode: files['main.py'],
          knowledgeBase: mergedKnowledge || undefined,
          qaData: mergedQA.length > 0 ? mergedQA : undefined,
          botConfig: {
            botName: config.botName,
            botEmoji: config.botEmoji,
            creatorName: config.creatorName,
            temperature: config.temperature,
            responseStyle: config.responseStyle,
            maxResponseLength: config.maxResponseLength,
            responseFormat: config.responseFormat,
            conversationRules: config.conversationRules,
            catchphrases: config.catchphrases,
            blockedTopics: config.blockedTopics,
            followUpQuestions: config.followUpQuestions,
            rememberName: config.rememberName,
            showReasoning: config.showReasoning,
            tools: config.tools,
            toolInstructions: config.toolInstructions,
            forbiddenWords: config.forbiddenWords,
            mood: config.mood,
            fewShotExamples: config.fewShotExamples,
            languageStyle: config.languageStyle,
            signOff: config.signOff,
            maxTokens: config.maxTokens,
            moodResponses: config.moodResponses,
            responseTone: config.responseTone,
            responseToneConditional: config.responseToneConditional,
            errorMessage: config.errorMessage,
            timeOfDay: config.timeOfDay,
            greeting: config.greeting,
          },
        },
        (text) => {
          assistantReply = text;
          setChatMessages(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(m => m._id === placeholderId);
            const targetIdx = idx !== -1 ? idx : updated.length - 1;
            updated[targetIdx] = { role: 'assistant', content: text, _id: placeholderId, usedRealPython };
            return updated;
          });
        },
        abortCtl.signal,
        (headers) => { usedRealPython = headers.get('X-Python-Status') === 'handled'; },
      );
      // TTS: Speak the assistant's reply if voice is enabled
      if (assistantReply && liveConfig.voiceEnabled && ttsEnabled) {
        speakText(assistantReply, liveConfig.voiceGender);
      } else if (voiceModeRef.current) {
        // Recognition is in continuous mode — already listening
      }
    } catch (e: any) {
      if (e?.name === 'AbortError' || e?.message?.includes('aborted')) {
        // User triggered new message — silently discard
        return;
      }
      // Remove the placeholder before adding error — find by _id for robustness
      setChatMessages(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(m => m._id === placeholderId);
        if (idx !== -1) {
          updated.splice(idx, 1);
        } else if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && updated[updated.length - 1].content === '...') {
          updated.pop();
        }
        updated.push({ role: 'system', content: `❌ ${e.message}` });
        return updated;
      });
    } finally { setIsStreaming(false); chatAbortRef.current = null; }
  };
  handleChatSendRef.current = handleChatSend;

  const executeSave = async (email: string, name?: string) => {
    setIsSaving(true);
    try {
      const codePayload = files['main.py'];
      if (currentProjectId) {
        // Routed through the owner-checked RPC — the open UPDATE policy
        // this used to rely on let anyone edit anyone's project by id.
        // p_expected_updated_at guards against a second tab/device having
        // saved since we last loaded — a stale baseline gets rejected
        // instead of silently overwriting whatever they wrote.
        const { data, error } = await supabase.rpc('save_own_project', {
          p_project_id: currentProjectId,
          p_participant_email: email,
          p_project_name: projectName,
          p_description: systemPrompt,
          p_code: codePayload,
          p_template_id: projectType,
          p_author_name: authorName,
          p_expected_updated_at: lastKnownUpdatedAt,
        });
        if (error) {
          if (error.message?.includes('CONFLICT')) {
            if (!conflictAlertedRef.current) {
              conflictAlertedRef.current = true;
              toast.error("This project was changed in another tab or device. Reload to see the latest version before saving — your local edits are still here, just not saved yet.", {
                duration: 10000,
                action: { label: 'Reload', onClick: () => window.location.reload() },
              });
            }
            return;
          }
          throw error;
        }
        conflictAlertedRef.current = false;
        if ((data as any)?.updated_at) setLastKnownUpdatedAt((data as any).updated_at);
      } else {
        const { data, error } = await supabase
          .from('ai_projects')
          .insert({ project_name: projectName, description: systemPrompt, code: codePayload, template_id: projectType, author_name: name || authorName || 'Student', author_email: email, is_published: false, points_earned: 0 })
          .select('id, updated_at')
          .single();
        if (error) throw error;
        const newId = data?.id || null;
        setCurrentProjectId(newId);
        setLastKnownUpdatedAt(data?.updated_at ?? null);
        if (newId) localStorage.setItem('forge-current-project-id', newId);
      }
      setSavedFiles({ ...files });
      setLastSaved(new Date().toLocaleTimeString());
      setAutoSaveCountdown(120);
      setTerminalOutput(prev => [...prev, `● All changes saved`]);
      toast.success('💾 Project saved!');
      // No points for saves — scoring is milestone-based only
    } catch (e) {
      console.error(e);
      toast.error('Failed to save. Please try again.');
    } finally { setIsSaving(false); }
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent concurrent saves (auto-save race)
    localStorage.setItem('forge-student-email', authorEmail);
    localStorage.setItem('forge-student-name', authorName);
    await executeSave(authorEmail);
  };

  const handleAiAssist = async (action: string) => {
    if (isAiLoading) return; // Prevent concurrent Review/Explain/Suggest requests
    if (!files['main.py'].trim()) { toast.error('Write some code first!'); return; }
    setIsAiLoading(true);
    setActiveAiAction(action);
    setAiOutput('');
    // This wipes the visible transcript — clear the mentor-chat context that
    // drives follow-ups too, or a student's next question would silently
    // pull in a conversation they can no longer see on screen.
    setMentorHistory([]);
    setShowBottomPanel(true);
    setBottomTab('ai-mentor');
    try {
      let reply = '';
      await streamFromEdgeFunction(
        { code: files['main.py'], model: projectType, action, systemPrompt, projectName, projectType },
        (text) => { reply = text; setAiOutput(text); }
      );
      // An empty reply rendered identically to never having asked at all —
      // nothing told the student their click actually went through and
      // came back with nothing.
      if (!reply.trim()) {
        toast.error('AI Mentor came back empty — try again or rephrase your code.');
        setAiOutput('_No response came back. Try clicking again._');
      }
      // No points for mentor usage — scoring is milestone-based only
    } catch (e: any) { toast.error(e.message); }
    finally { setIsAiLoading(false); setActiveAiAction(null); }
  };

  const handleMentorChat = async () => {
    if (!mentorInput.trim() || isAiLoading) return;
    const question = mentorInput.trim();
    setMentorInput('');
    setIsAiLoading(true);
    setShowBottomPanel(true);
    setBottomTab('ai-mentor');
    
    // Add user message to mentor display (cap history to 20 messages to prevent huge payloads)
    const trimmedHistory = mentorHistory.length > 18 ? mentorHistory.slice(-18) : mentorHistory;
    const newHistory = [...trimmedHistory, { role: 'user', content: question }];
    setMentorHistory(newHistory);
    const MENTOR_SEP = '\n\n─── ✦ ───\n\n';
    setAiOutput(prev => prev + MENTOR_SEP + '**You:** ' + question + '\n\n');
    
    try {
      let assistantReply = '';
      await streamFromEdgeFunction(
        { 
          code: files['main.py'], 
          model: projectType, 
          action: 'mentor-chat', 
          systemPrompt, 
          projectName, 
          projectType,
          messages: newHistory,
        },
        (text) => {
          assistantReply = text;
          // Use a unique separator that won't appear in AI output
          const SEP = '\n\n─── ✦ ───\n\n';
          setAiOutput(prev => {
            const sepIdx = prev.lastIndexOf(SEP);
            const prefix = sepIdx !== -1 ? prev.slice(0, sepIdx) + SEP + '**You:** ' + question + '\n\n' : '**You:** ' + question + '\n\n';
            return prefix + text;
          });
        }
      );
      // Store actual assistant response for proper conversation context
      setMentorHistory(prev => [...prev, { role: 'assistant', content: assistantReply || 'No response' }]);
    } catch (e: any) { toast.error(e.message); }
    finally { setIsAiLoading(false); }
  };

  const handleGoLive = () => {
    localStorage.setItem('forge-student-email', authorEmail);
    localStorage.setItem('forge-student-name', authorName);
    setPublishOpen(true);
  };

  // authorEmail/authorName are cached in localStorage with no expiry and no
  // visible "who am I" indicator anywhere in the UI — on a shared/lab
  // computer, the next student to open Build Studio silently inherits the
  // previous student's identity, and since author_email is the bearer
  // credential every save/delete/publish RPC checks, saving as "them"
  // quietly overwrites their real project. This is the one explicit,
  // discoverable way to notice and back out before that happens.
  const handleSwitchIdentity = () => {
    if (!window.confirm("Switch to a different student? This clears the cached name, email, and any unsaved draft on THIS BROWSER. Your own saved projects stay safe on the server either way.")) return;
    localStorage.removeItem('forge-student-email');
    localStorage.removeItem('forge-student-name');
    localStorage.removeItem('forge-current-project-id');
    localStorage.removeItem('forge-editor-code');
    window.location.reload();
  };

  const dismissOnboarding = () => {
    setOnboardingStep(null);
    localStorage.setItem('buildstudio-onboarded', 'true');
    // Now show the walkthrough if it hasn't been done
    if (!localStorage.getItem('forge-walkthrough-done')) {
      setShowWalkthrough(true);
    }
  };
  const nextOnboardingStep = () => {
    if (onboardingStep !== null && onboardingStep < ONBOARDING_STEPS.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      dismissOnboarding();
    }
  };

  useEffect(() => { handleSaveRef.current = handleSave; });
  useEffect(() => { handleRunRef.current = handleRun; });

  const handleUndoRef = useRef<() => void>(() => {});
  const handleRedoRef = useRef<() => void>(() => {});
  useEffect(() => { handleUndoRef.current = handleUndo; });
  useEffect(() => { handleRedoRef.current = handleRedo; });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      // Undo/redo/find only make sense as CODE-editor shortcuts — outside the
      // code textarea (Project Name, System Prompt, Knowledge Base, chat
      // input, even the search box itself) the user almost certainly wants
      // that field's own native undo or the browser's native find, not to
      // have main.py silently mutate or a search widget hijack their Ctrl+F.
      // Save/Run/toggle-sidebar don't touch the focused field's content, so
      // those stay global regardless of where focus is.
      const target = e.target as HTMLElement | null;
      const isElsewhere = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) && target !== textareaRef.current;
      if (mod && e.key === 's') { e.preventDefault(); handleSaveRef.current(); }
      if (mod && e.key === 'Enter') { e.preventDefault(); handleRunRef.current(); }
      if (mod && e.key === 'b') { e.preventDefault(); setShowConfig(v => !v); }
      if (mod && e.key === 'z' && !e.shiftKey && !isElsewhere) { e.preventDefault(); handleUndoRef.current(); }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !isElsewhere) { e.preventDefault(); handleRedoRef.current(); }
      if (mod && e.key === 'f' && !isElsewhere) { e.preventDefault(); setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 50); }
      if (e.key === 'Escape' && showSearch) { setShowSearch(false); setSearchTerm(''); setReplaceTerm(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSearch]);

  // Auto-save every 2 minutes — use refs to avoid recreating interval
  const isDirtyRef = useRef(isDirty);
  const currentProjectIdRef = useRef(currentProjectId);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);
  useEffect(() => { currentProjectIdRef.current = currentProjectId; }, [currentProjectId]);

  const isSavingRef = useRef(false);
  useEffect(() => { isSavingRef.current = isSaving; }, [isSaving]);

  useEffect(() => {
    autoSaveIntervalRef.current = setInterval(() => {
      setAutoSaveCountdown(prev => {
        // <= 0, not <= 1 — the old version jumped straight from displaying
        // 0:01 to 2:00, skipping 0:00 entirely, which read as "did that
        // actually save?" to anyone watching the counter tick down.
        if (prev <= 0) {
          if (isDirtyRef.current && currentProjectIdRef.current && !isSavingRef.current) {
            handleSaveRef.current();
          }
          return 120;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current); };
  }, []);

  const scaffold = PROJECT_SCAFFOLDS[projectType];
  const lines = useMemo(() => files[activeFile].split('\n'), [files[activeFile]]);

  const FILE_TABS: { id: FileTab; icon: React.ElementType; label: string }[] = [
    { id: 'main.py', icon: FileCode, label: 'main.py' },
    { id: 'config.json', icon: FileJson, label: 'config.json' },
    { id: 'requirements.txt', icon: FileText, label: 'requirements.txt' },
  ];

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* ── Onboarding Overlay ── */}
      <AnimatePresence>
        {onboardingStep !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
            onClick={dismissOnboarding}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-ide-sidebar border border-ide-border rounded-xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-ide-text-muted">Step {onboardingStep + 1} of {ONBOARDING_STEPS.length}</span>
                <button onClick={dismissOnboarding} className="text-ide-text-muted hover:text-ide-text">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1 mb-4">
                {ONBOARDING_STEPS.map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= onboardingStep ? 'bg-ide-accent' : 'bg-ide-border'}`} />
                ))}
              </div>
              <h3 className="text-lg font-bold text-ide-text mb-2">{ONBOARDING_STEPS[onboardingStep].title}</h3>
              <p className="text-sm text-ide-text-muted leading-relaxed mb-6">{ONBOARDING_STEPS[onboardingStep].description}</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={dismissOnboarding} className="flex-1 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
                  Skip Tour
                </Button>
                <Button onClick={nextOnboardingStep} className="flex-1 bg-ide-accent text-ide-bg-deep hover:bg-ide-accent/90">
                  {onboardingStep === ONBOARDING_STEPS.length - 1 ? "Let's Build! 🚀" : 'Next →'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-3 h-10 flex-shrink-0 bg-ide-bg-deep border-b border-ide-border-subtle">
        <div className="flex items-center gap-2.5">
          <Code className="w-4 h-4 text-ide-accent" />
          <span className="font-semibold text-sm text-ide-text">FORGE</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-ide-border text-ide-accent border border-ide-border">
            {scaffold.icon} {scaffold.name}
          </span>
          <CountdownWidget hackathonStartDate={hackathonStartDate} hackathonStatus={hackathonStatus} />
        </div>
        <div className="flex items-center gap-1">
          {[
            { action: 'review', icon: Rocket, label: 'Review', primary: true },
            { action: 'explain', icon: MessageSquare, label: 'Explain', primary: false },
            { action: 'suggest', icon: Lightbulb, label: 'Suggest', primary: false },
          ].map(({ action, icon: Icon, label, primary }) => (
            <Button
              key={action}
              size="sm"
              variant={primary ? 'default' : 'ghost'}
              onClick={() => handleAiAssist(action)}
              disabled={isAiLoading}
              className={`h-7 text-xs font-medium ${primary ? 'bg-ide-accent text-ide-bg-deep hover:bg-ide-accent/90' : 'text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50'}`}
            >
              {isAiLoading && activeAiAction === action ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Icon className="w-3 h-3 mr-1" />}
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {takenOfflineNotice && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/15 border-b border-red-500/30 text-[11px] text-red-300 flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>A judge or organizer took this project offline — it's no longer publicly visible.</span>
          <Button size="sm" onClick={handleGoLive} disabled={!hasLiveEvent}
            className="h-5 text-[10px] font-bold ml-1 bg-red-500/25 text-red-200 hover:bg-red-500/35">
            Go Live to republish
          </Button>
          <button onClick={() => setTakenOfflineNotice(false)} className="ml-auto text-red-300/70 hover:text-red-200 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Main 3-Panel Layout ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT: Config Sidebar */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isMobile ? '100%' : 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`overflow-y-auto flex-shrink-0 flex flex-col bg-ide-sidebar border-r border-ide-border ${isMobile ? 'absolute inset-0 z-30' : ''}`}
            >
              {isMobile && (
                <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-ide-text-muted">Config</span>
                  <button onClick={() => setShowConfig(false)} className="text-ide-text-muted hover:text-ide-text"><X className="w-4 h-4" /></button>
                </div>
              )}

              {/* Config Tab Switcher */}
              <div className="flex border-b border-ide-border flex-shrink-0">
                {[
                  { id: 'settings' as ConfigTab, icon: Settings, label: 'Config' },
                  { id: 'knowledge' as ConfigTab, icon: Database, label: 'Knowledge' },
                  { id: 'theme' as ConfigTab, icon: Palette, label: 'Design' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setConfigTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      configTab === tab.id ? 'text-ide-accent border-b-2 border-ide-accent bg-ide-bg' : 'text-ide-text-muted hover:text-ide-text'
                    }`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-3 space-y-4 flex-1 overflow-y-auto">
                {/* ── Settings Tab ── */}
                {configTab === 'settings' && (
                  <>
                    <div className="rounded-md border border-ide-border bg-ide-editor/50 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-ide-text-muted mb-0.5">Signed in as</p>
                          <p className="text-xs text-ide-text truncate">{authorName}</p>
                          <p className="text-[10px] text-ide-text-muted truncate">{authorEmail}</p>
                        </div>
                        <button onClick={handleSwitchIdentity} className="text-[10px] text-ide-accent hover:underline flex-shrink-0 whitespace-nowrap">
                          Not you?
                        </button>
                      </div>
                      <p className="text-[9px] text-ide-text-muted/70 mt-1">On a shared computer, switch before you start — otherwise you may load or overwrite the last person's project.</p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">Project Name</label>
                      <Input value={projectName} onChange={e => setProjectName(e.target.value)}
                        className="h-8 text-xs border-0 focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent" />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">Project Type</label>
                      <div className="space-y-1">
                        {([
                          { id: 'chatbot' as ProjectType, icon: Bot, label: '🤖 AI Chatbot', cls: 'text-ide-accent' },
                          { id: 'agent' as ProjectType, icon: Brain, label: '🧠 AI Agent', cls: 'text-ide-green' },
                        ]).map(type => (
                          <button
                            key={type.id}
                            onClick={() => handleTypeChange(type.id)}
                            className={`w-full text-left p-2 rounded-md text-xs transition-all flex items-center gap-2 border ${
                              projectType === type.id
                                ? 'bg-ide-selection border-ide-accent/40 text-ide-text'
                                : 'border-transparent text-ide-text-muted hover:bg-ide-border/50 hover:text-ide-text'
                            }`}
                          >
                            <type.icon className={`w-4 h-4 ${type.cls}`} />
                            <span className="font-medium">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 mb-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-ide-text-muted">System Prompt</label>
                        <button
                          onClick={() => setShowPromptHelp(!showPromptHelp)}
                          className="text-ide-text-muted hover:text-ide-accent transition-colors"
                        >
                          <HelpCircle className="w-3 h-3" />
                        </button>
                      </div>
                      <AnimatePresence>
                        {showPromptHelp && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-2"
                          >
                            <div className="text-[10px] leading-relaxed p-2 rounded bg-ide-accent/10 border border-ide-accent/20 text-ide-text">
                              <strong className="text-ide-accent">💡 What is this?</strong><br />
                              This controls how your AI responds in the <strong>Live Preview</strong> chat. It's like giving your AI a personality card.<br /><br />
                              Try changing it to: <em>"You are a math tutor for SHS students"</em> — then test in the preview!
                              <p className="mt-1 text-ide-text-muted">Changes here auto-sync to your code's SYSTEM_PROMPT variable.</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={4}
                        className="text-xs border-0 resize-none focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent" />
                      <p className={`text-[10px] mt-0.5 ${systemPrompt.length < 20 ? 'text-ide-orange' : systemPrompt.length > 500 ? 'text-ide-orange' : 'text-ide-text-muted'}`}>
                        {systemPrompt.length} chars {systemPrompt.length < 20 ? '— try to be more descriptive!' : systemPrompt.length > 500 ? '— consider being more concise' : ''}
                      </p>
                    </div>

                    {/* ── Mission Progress Bar ── */}
                    {(() => {
                      const config = liveConfig;
                      // Same defaults-from-the-actual-scaffold approach as
                      // getChallengeCount — stays correct in blank-start mode.
                      const defaults = extractConfigFromCode(scaffolds[projectType].main);
                      const ruleFloor = 3, starterFloor = 4, blockedFloor = 2;
                      const missions = [
                        { emoji: '🏷️', name: 'Bot Name', done: config.botName !== defaults.botName && config.botName !== 'AI Bot' },
                        { emoji: '😀', name: 'Bot Emoji', done: config.botEmoji !== defaults.botEmoji },
                        { emoji: '👋', name: 'Greeting Message', done: config.greeting !== '' && config.greeting !== defaults.greeting },
                        { emoji: '✍️', name: 'Creator Name', done: config.creatorName !== '' && config.creatorName !== defaults.creatorName },
                        { emoji: '🧠', name: 'System Message', done: config.systemMessage !== defaults.systemMessage && config.systemMessage.length > 30 },
                        { emoji: '📚', name: 'Knowledge Base', done: config.knowledgeBaseFromCode.trim() !== '' && config.knowledgeBaseFromCode !== defaults.knowledgeBaseFromCode },
                        { emoji: '❓', name: 'Intents', done: config.qaPairsFromCode.length > defaults.qaPairsFromCode.length },
                        { emoji: '🌡️', name: 'Temperature', done: config.temperature !== defaults.temperature },
                        { emoji: '📜', name: 'Conversation Rules', done: config.conversationRules.length >= Math.max(ruleFloor, defaults.conversationRules.length + 1) },
                        { emoji: '💬', name: 'Conversation Starters', done: config.conversationStarters.length >= Math.max(starterFloor, defaults.conversationStarters.length + 1) },
                        { emoji: '🔇', name: 'Forbidden Words', done: config.forbiddenWords.length > defaults.forbiddenWords.length },
                        { emoji: '🚫', name: 'Blocked Topics', done: config.blockedTopics.length >= Math.max(blockedFloor, defaults.blockedTopics.length + 1) },
                        { emoji: '📖', name: 'Few-Shot Examples', done: config.fewShotExamples.length > defaults.fewShotExamples.length },
                        { emoji: '🔐', name: 'Secret Responses', done: Object.keys(config.secretResponses).length > Object.keys(defaults.secretResponses).length },
                        { emoji: '🎯', name: 'Mood Responses', done: Object.keys(config.moodResponses).length > Object.keys(defaults.moodResponses).length },
                        { emoji: '📏', name: 'Response Length', done: config.maxResponseLength !== defaults.maxResponseLength },
                        { emoji: '🎛️', name: 'Max Tokens', done: config.maxTokens !== defaults.maxTokens },
                        { emoji: '🎭', name: 'Mood', done: config.mood !== defaults.mood },
                        { emoji: '🎵', name: 'Response Tone', done: isResponseToneCustomized(config.responseTone, config.responseToneConditional, defaults.responseToneConditional) },
                        { emoji: '🗣️', name: 'Catchphrases', done: config.catchphrases.length > defaults.catchphrases.length },
                        { emoji: '🔊', name: 'Voice Enabled', done: config.voiceEnabled === true },
                        { emoji: '🎙️', name: 'Voice Mode', done: config.voiceMode !== defaults.voiceMode },
                        { emoji: '📢', name: 'Wake Word', done: !!config.wakeWord },
                        { emoji: '🗣️', name: 'Voice Gender', done: config.voiceGender !== defaults.voiceGender },
                      ];
                      const completed = missions.filter(m => m.done).length;
                      const total = missions.length;
                      const pct = Math.round((completed / total) * 100);

                      return (
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">
                            🎯 Mission Progress
                          </label>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 h-2 rounded-full bg-ide-border">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  background: pct === 100
                                    ? '#22C55E'
                                    : pct >= 50
                                    ? '#F7941D'
                                    : '#5865F2',
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-ide-accent whitespace-nowrap">
                              {completed}/{total}
                            </span>
                          </div>
                          <div className="space-y-0.5 max-h-64 overflow-y-auto">
                            {missions.map((m, i) => (
                              <div key={i} className={`flex items-center gap-1.5 text-[10px] py-0.5 ${m.done ? 'text-ide-green' : 'text-ide-text-muted'}`}>
                                <span className="w-4 text-center">{m.done ? '✅' : '⬜'}</span>
                                <span>{m.emoji} {m.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Achievements ── */}
                    {/* AchievementGrid was fully built but never mounted anywhere
                        — the whole badge system was dead code the student could
                        never actually see. */}
                    {(() => {
                      const config = liveConfig;
                      const defaultBotName = extractConfigFromCode(scaffolds[projectType].main).botName;
                      return (
                        <AchievementGrid stats={{
                          challengeCount: getChallengeCount(config, projectType),
                          hasCustomName: config.botName !== defaultBotName && config.botName !== 'AI Bot',
                          hasKnowledge: config.knowledgeBaseFromCode.trim() !== '',
                          hasQAPairs: config.qaPairsFromCode.length > 0,
                          hasRules: config.conversationRules.length > 0,
                          hasTested: terminalOutput.length > 0,
                          hasSaved: !!currentProjectId,
                          codeLength: files['main.py'].length,
                        }} />
                      );
                    })()}

                    {/* ── Memory & State ── */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block text-ide-text-muted">🧠 Memory &amp; State</label>
                      <p className="text-[10px] text-ide-text-muted/70 italic mb-1.5">What your bot carries between messages — the same idea Rasa calls "slots" or LangChain calls "memory."</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-ide-text">
                          <span>Remembers your name</span>
                          <span className={`font-mono ${liveConfig.rememberName ? 'text-ide-green' : 'text-ide-text-muted'}`}>
                            {liveConfig.rememberName ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between text-ide-text">
                          <span>Current mood</span>
                          <span className="font-mono text-ide-accent">{liveConfig.mood}</span>
                        </div>
                        <div className="flex justify-between text-ide-text">
                          <span>Mood-based responses</span>
                          <span className="font-mono text-ide-accent">{Object.keys(liveConfig.moodResponses).length}</span>
                        </div>
                        <div className="flex justify-between text-ide-text">
                          <span>Conversation turns remembered</span>
                          <span className="font-mono text-ide-accent">{chatMessages.length}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">Resources Used</label>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-ide-text">
                          <span>AI Calls</span>
                          <span className="font-mono text-ide-accent">{aiCallCount}</span>
                        </div>
                        <div className="flex justify-between text-ide-text">
                          <span>Limit</span>
                          <span className="font-mono text-ide-text-muted">40 / session</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-ide-border mt-1">
                          <div className="h-full rounded-full bg-ide-accent transition-all" style={{ width: `${Math.min((aiCallCount / 40) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Knowledge Base Tab ── */}
                {configTab === 'knowledge' && (
                  <>
                    {/* Explainer card */}
                    <div className="bg-ide-accent/10 rounded-lg p-2.5 border border-ide-accent/20 mb-1">
                      <p className="text-[10px] text-ide-text leading-relaxed">
                        <strong className="text-ide-accent">📚 Teach Your AI</strong> — Add facts, notes, or intents below. Your bot will use this data to answer questions in the Live Preview and deployed app.
                      </p>
                    </div>

                    {/* Knowledge Base */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block text-ide-text-muted">Knowledge Base</label>
                      <p className="text-[10px] text-ide-text-muted mb-1.5">Paste any text your bot should know — notes, formulas, facts.</p>
                      <Textarea 
                        value={knowledgeBase} 
                        onChange={e => setKnowledgeBase(e.target.value)} 
                        rows={5}
                        placeholder={"e.g.\nPythagoras theorem: a² + b² = c²\nIt applies to right-angled triangles.\n\nOhm's law: V = IR\nVoltage equals current times resistance."}
                        className="text-xs border-0 resize-none focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent" 
                      />
                      {knowledgeBase ? (
                        <div className="mt-1 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[10px] text-ide-green">
                            <Check className="w-3 h-3" />
                            <span>{knowledgeBase.split(/\s+/).filter(Boolean).length} words loaded</span>
                          </div>
                          <button onClick={() => setKnowledgeBase('')} className="text-[10px] text-ide-text-muted hover:text-red-400 transition-colors">Clear</button>
                        </div>
                      ) : (
                        <p className="mt-1 text-[10px] text-ide-text-muted italic">No knowledge added yet</p>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-ide-border/50" />

                    {/* Q&A Pairs, framed as Intents */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-ide-text-muted">Intents</label>
                        <Button size="sm" variant="ghost" onClick={addQA} className="h-5 px-1.5 text-[10px] text-ide-accent hover:bg-ide-border/50">
                          <Plus className="w-3 h-3 mr-0.5" /> Add
                        </Button>
                      </div>
                      <p className="text-[10px] text-ide-text-muted mb-0.5">Add exact trigger phrase → response pairs for precise answers.</p>
                      <p className="text-[10px] text-ide-text-muted/70 italic mb-2">This is the same idea real conversational-AI tools like Rasa call an "intent."</p>

                      {qaData.length === 0 && (
                        <button onClick={addQA} className="w-full p-3 rounded-lg border-2 border-dashed border-ide-border text-ide-text-muted text-xs hover:border-ide-accent hover:text-ide-accent transition-colors">
                          + Add your first intent
                        </button>
                      )}

                      <div className="space-y-2">
                        {qaData.map((pair, idx) => (
                          <div key={pair.id} className="bg-ide-editor rounded-lg p-2 space-y-1.5 border border-ide-border/50">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-ide-accent">Intent {idx + 1}</span>
                              <button onClick={() => removeQA(pair.id)} className="text-ide-text-muted hover:text-red-400">
                                <Minus className="w-3 h-3" />
                              </button>
                            </div>
                            <Input
                              value={pair.q}
                              onChange={e => updateQA(pair.id, 'q', e.target.value)}
                              placeholder="Q: What is Pythagoras theorem?"
                              className="h-7 text-[11px] border-0 bg-ide-bg text-ide-text focus-visible:ring-1 focus-visible:ring-ide-accent"
                            />
                            <Input
                              value={pair.a}
                              onChange={e => updateQA(pair.id, 'a', e.target.value)}
                              placeholder="A: a² + b² = c² for right triangles"
                              className="h-7 text-[11px] border-0 bg-ide-bg text-ide-text focus-visible:ring-1 focus-visible:ring-ide-accent"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Status summary */}
                    {(knowledgeBase || qaData.some(p => p.q.trim())) && (
                      <div className="bg-ide-green/10 rounded-lg p-2.5 border border-ide-green/20">
                        <p className="text-[10px] text-ide-green font-medium">
                          ✅ Your bot has custom knowledge: {knowledgeBase ? `${knowledgeBase.split(/\s+/).filter(Boolean).length} words` : ''}
                          {knowledgeBase && qaData.filter(p => p.q.trim()).length > 0 ? ' + ' : ''}
                          {qaData.filter(p => p.q.trim()).length > 0 ? `${qaData.filter(p => p.q.trim()).length} intents` : ''}
                        </p>
                        <p className="text-[10px] text-ide-text-muted mt-0.5">Test it in the Live Preview panel →</p>
                      </div>
                    )}
                  </>
                )}

                {/* ── Theme & Design Tab ── */}
                {configTab === 'theme' && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block text-ide-text-muted">🎨 App Theme</label>
                      <p className="text-[10px] text-ide-text-muted mb-3">Choose a color theme for your deployed AI app.</p>
                      <div className="grid grid-cols-3 gap-2">
                        {THEMES.map(theme => (
                          <button
                            key={theme.id}
                            onClick={() => setSelectedTheme(theme)}
                            className={`p-2 rounded-lg border-2 transition-all ${
                              selectedTheme.id === theme.id ? 'border-ide-accent' : 'border-ide-border hover:border-ide-text-muted'
                            }`}
                          >
                            <div className="w-full h-6 rounded-md mb-1" style={{ background: theme.bg }} />
                            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                            <span className="text-[9px] text-ide-text-muted mt-1 block">{theme.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">📝 App Title</label>
                      <Input 
                        value={projectName} 
                        onChange={e => setProjectName(e.target.value)}
                        placeholder="My AI Assistant"
                        className="h-7 text-xs border-0 focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent" 
                      />
                    </div>

                    {/* Welcome Message, Quick Reply Buttons, and UI Widgets were
                        removed from here — all three were fully disconnected:
                        never synced to code, never saved, never rendered
                        anywhere (not even in this file's own live preview
                        below). Welcome message and quick-reply buttons were
                        also flat-out redundant with variables that ALREADY
                        do the same job for real: AI_MESSAGE (Challenge 3)
                        is the actual greeting shown here and in the
                        published app, and CONVERSATION_STARTERS
                        (Challenge 10) is the actual clickable-starter-button
                        list — both edited via main.py, both already working.
                        Rather than build a second, competing mechanism for
                        the same two things, this just points at the real one. */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">🖼️ Logo</label>
                      <p className="text-[10px] text-ide-text-muted mb-1.5">Shown here in Build Studio's preview — not yet part of the published app.</p>
                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          <Input
                            value={logoUrl}
                            onChange={e => setLogoUrl(e.target.value)}
                            placeholder="Paste URL or upload below"
                            className="h-7 text-xs border-0 focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent flex-1"
                          />
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 500 * 1024) { toast.error('Logo must be under 500KB'); return; }
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const dataUrl = ev.target?.result as string;
                                setLogoUrl(dataUrl);
                                toast.success('Logo uploaded!');
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => logoInputRef.current?.click()}
                            className="h-7 px-2 text-[10px] text-ide-accent hover:bg-ide-border/50"
                          >
                            Upload
                          </Button>
                        </div>
                        {logoUrl && (isSafeExternalUrl(logoUrl) || /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/.test(logoUrl) ? (
                          <div className="flex items-center gap-2">
                            <img src={logoUrl} alt="Logo preview" className="w-8 h-8 rounded object-contain bg-ide-bg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <span className="text-[10px] text-ide-green">Logo loaded</span>
                            <button onClick={() => setLogoUrl('')} className="text-[10px] text-ide-text-muted hover:text-red-400 ml-auto">Remove</button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-red-400">That doesn't look like a safe image URL — paste a real http(s) link or use Upload.</p>
                        ))}
                      </div>
                    </div>

                    <div className="bg-ide-accent/10 rounded-lg p-2.5 border border-ide-accent/20">
                      <p className="text-[10px] text-ide-text leading-relaxed">
                        <strong className="text-ide-accent">💡 Preview:</strong> Theme color applies to your published app. Logo previews here in Build Studio for now. Edit AI_MESSAGE and CONVERSATION_STARTERS in your code for the greeting and starter buttons visitors see. Go Live to see the result!
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER: Code Editor */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* File Tabs */}
          <div className="flex items-center flex-shrink-0 h-9 bg-ide-sidebar border-b border-ide-border-subtle">
            <Button variant="ghost" size="icon" onClick={() => setShowConfig(!showConfig)}
              className="h-8 w-8 ml-1 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
              <Settings className={`w-3.5 h-3.5 transition-transform ${showConfig ? 'rotate-90' : ''}`} />
            </Button>
            <div className="h-4 w-px mx-1 bg-ide-border" />
            {FILE_TABS.map(tab => {
              const tabDirty = files[tab.id] !== (savedFiles[tab.id] ?? files[tab.id]);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFile(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono transition-colors border-b-2 ${
                    activeFile === tab.id
                      ? 'bg-ide-editor text-ide-text border-ide-accent'
                      : 'text-ide-text-muted border-transparent hover:text-ide-text hover:bg-ide-border/30'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tabDirty && <span className="w-2 h-2 rounded-full bg-ide-orange ml-1" />}
                </button>
              );
            })}
            <div className="flex-1" />
            <div className="flex items-center gap-1 pr-2">
              <Button variant="ghost" size="icon" onClick={handleUndo} title="Undo (Ctrl+Z)"
                className="h-6 w-6 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
                <Undo2 className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleRedo} title="Redo (Ctrl+Y)"
                className="h-6 w-6 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
                <Redo2 className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownload} title="Download main.py"
                className="h-6 w-6 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
                <Download className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleUpload} title="Upload .py file"
                className="h-6 w-6 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
                <Upload className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleResetToTemplate} title="Reset to original template"
                className="h-6 w-6 text-ide-text-muted hover:text-ide-orange hover:bg-ide-border/50">
                <RotateCcw className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 50); }} title="Find & Replace (Ctrl+F)"
                className="h-6 w-6 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
                <Search className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { setTutorialActive(v => !v); setTutorialStep(0); }} title="Interactive Tutorial"
                className={`h-6 w-6 hover:bg-ide-border/50 ${tutorialActive ? 'text-ide-accent' : 'text-ide-text-muted hover:text-ide-text'}`}>
                <GraduationCap className="w-3 h-3" />
              </Button>
              <input ref={fileInputRef} type="file" accept=".py" onChange={handleFileChange} className="hidden" />
              <div className="h-4 w-px mx-0.5 bg-ide-border" />
              {isDirty ? (
                <>
                  <Circle className="w-2 h-2 fill-ide-orange text-ide-orange" />
                  <span className="text-[10px] text-ide-orange">Modified</span>
                </>
              ) : (
                <>
                  <Circle className="w-2 h-2 fill-ide-green text-ide-green" />
                  <span className="text-[10px] text-ide-text-muted">Ready</span>
                </>
              )}
              <Button variant="ghost" size="icon" onClick={handleCopy}
                className="h-6 w-6 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
                {copied ? <Check className="w-3 h-3 text-ide-green" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex flex-col min-h-0 bg-ide-editor relative">
            {/* ── Find & Replace Bar ── */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex-shrink-0 overflow-hidden border-b border-ide-border bg-ide-sidebar"
                >
                  <div className="flex items-center gap-1.5 px-3 py-1.5">
                    <Search className="w-3.5 h-3.5 text-ide-text-muted flex-shrink-0" />
                    <input
                      ref={searchInputRef}
                      value={searchTerm}
                      onChange={e => { setSearchTerm(e.target.value); setCurrentMatchIndex(0); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const nextIdx = searchMatches.length > 0 ? (currentMatchIndex + 1) % searchMatches.length : 0;
                          setCurrentMatchIndex(nextIdx);
                          // Scroll to matched line via the scroll container (not textarea)
                          if (searchMatches[nextIdx] && textareaRef.current) {
                            const lineHeight = 24;
                            const scrollContainer = textareaRef.current.closest('.overflow-auto');
                            if (scrollContainer) scrollContainer.scrollTop = Math.max(0, searchMatches[nextIdx].line * lineHeight - 80);
                          }
                        }
                        if (e.key === 'Escape') { setShowSearch(false); setSearchTerm(''); setReplaceTerm(''); }
                      }}
                      placeholder="Find... (Ctrl+F)"
                      className="h-6 flex-1 min-w-0 text-xs bg-ide-editor text-ide-text border border-ide-border rounded px-2 focus:outline-none focus:border-ide-accent"
                    />
                    <span className="text-[10px] text-ide-text-muted font-mono whitespace-nowrap">
                      {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : searchTerm ? 'No results' : ''}
                    </span>
                    <button onClick={() => {
                      const nextIdx = searchMatches.length > 0 ? (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length : 0;
                      setCurrentMatchIndex(nextIdx);
                      if (searchMatches[nextIdx] && textareaRef.current) {
                        const sc = textareaRef.current.closest('.overflow-auto');
                        if (sc) sc.scrollTop = Math.max(0, searchMatches[nextIdx].line * 24 - 80);
                      }
                    }} className="text-ide-text-muted hover:text-ide-text p-0.5"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => {
                      const nextIdx = searchMatches.length > 0 ? (currentMatchIndex + 1) % searchMatches.length : 0;
                      setCurrentMatchIndex(nextIdx);
                      if (searchMatches[nextIdx] && textareaRef.current) {
                        const sc = textareaRef.current.closest('.overflow-auto');
                        if (sc) sc.scrollTop = Math.max(0, searchMatches[nextIdx].line * 24 - 80);
                      }
                    }} className="text-ide-text-muted hover:text-ide-text p-0.5"><ArrowDown className="w-3 h-3" /></button>
                    <button onClick={() => setShowReplace(v => !v)} title="Toggle Replace"
                      className="text-ide-text-muted hover:text-ide-text p-0.5"><Replace className="w-3 h-3" /></button>
                    <button onClick={() => { setShowSearch(false); setSearchTerm(''); setReplaceTerm(''); }}
                      className="text-ide-text-muted hover:text-ide-text p-0.5"><X className="w-3 h-3" /></button>
                  </div>
                  {showReplace && (
                    <div className="flex items-center gap-1.5 px-3 pb-1.5">
                      <Replace className="w-3.5 h-3.5 text-ide-text-muted flex-shrink-0" />
                      <input
                        value={replaceTerm}
                        onChange={e => setReplaceTerm(e.target.value)}
                        placeholder="Replace with..."
                        className="h-6 flex-1 min-w-0 text-xs bg-ide-editor text-ide-text border border-ide-border rounded px-2 focus:outline-none focus:border-ide-accent"
                      />
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50 px-2"
                        onClick={() => {
                          if (searchMatches.length === 0) return;
                          const match = searchMatches[currentMatchIndex];
                          if (!match) return;
                          // Create undo snapshot before replace — only the
                          // main.py stack exists (see updateFile); pushing
                          // another tab's text onto it here was the same
                          // cross-tab corruption bug.
                          const oldCode = files[activeFile];
                          if (activeFile === 'main.py') {
                            undoStackRef.current.push(oldCode);
                            if (undoStackRef.current.length > 50) undoStackRef.current.shift();
                            redoStackRef.current = [];
                          }
                          const codeLines = oldCode.split('\n');
                          codeLines[match.line] = codeLines[match.line].substring(0, match.startCol) + replaceTerm + codeLines[match.line].substring(match.endCol);
                          const newCode = codeLines.join('\n');
                          if (activeFile === 'main.py') lastSnapshotRef.current = newCode;
                          setFiles(prev => ({ ...prev, [activeFile]: newCode }));
                          if (textareaRef.current) textareaRef.current.value = newCode;
                          setCurrentMatchIndex(0);
                        }}>Replace</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50 px-2"
                        onClick={() => {
                          if (!searchTerm) return;
                          // Create undo snapshot before replace all (same
                          // main.py-only scoping as the single Replace above)
                          const oldCode = files[activeFile];
                          if (activeFile === 'main.py') {
                            undoStackRef.current.push(oldCode);
                            if (undoStackRef.current.length > 50) undoStackRef.current.shift();
                            redoStackRef.current = [];
                          }
                          const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                          const regex = new RegExp(escaped, 'gi');
                          const newCode = oldCode.replace(regex, replaceTerm);
                          const count = (oldCode.match(regex) || []).length;
                          if (activeFile === 'main.py') lastSnapshotRef.current = newCode;
                          setFiles(prev => ({ ...prev, [activeFile]: newCode }));
                          if (textareaRef.current) textareaRef.current.value = newCode;
                          setCurrentMatchIndex(0);
                          toast.success(`Replaced ${count} occurrence${count !== 1 ? 's' : ''}`);
                        }}>All</Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Tutorial Mode Banner ── */}
            <AnimatePresence>
              {tutorialActive && tutorialStep < CHATBOT_TUTORIAL_STEPS.length && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex-shrink-0 overflow-hidden bg-ide-accent/10 border-b border-ide-accent/30"
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <GraduationCap className="w-4 h-4 text-ide-accent flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-ide-accent">
                        Step {tutorialStep + 1}/{CHATBOT_TUTORIAL_STEPS.length}: {CHATBOT_TUTORIAL_STEPS[tutorialStep].variableName}
                      </p>
                      <p className="text-[10px] text-ide-text truncate">{CHATBOT_TUTORIAL_STEPS[tutorialStep].instruction}</p>
                      {tutorialTargetLine === -1 && (
                        <p className="text-[9px] text-ide-orange">
                          ⚠️ Can't find {CHATBOT_TUTORIAL_STEPS[tutorialStep].variableName} in your code — did you rename or delete it? Restore it, or hit Next to skip.
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-ide-text-muted bg-ide-border rounded px-1.5 py-0.5 flex-shrink-0">
                      {CHATBOT_TUTORIAL_STEPS[tutorialStep].example}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => {
                      // Auto-scroll to next tutorial variable
                      setTutorialStep(s => {
                        const next = Math.min(s + 1, CHATBOT_TUTORIAL_STEPS.length);
                        if (next < CHATBOT_TUTORIAL_STEPS.length) {
                          const targetLine = findLineForVariable(files['main.py'], CHATBOT_TUTORIAL_STEPS[next].linePattern);
                          if (targetLine >= 0 && textareaRef.current) {
                            const scrollContainer = textareaRef.current.closest('.overflow-auto');
                            if (scrollContainer) {
                              scrollContainer.scrollTop = Math.max(0, targetLine * 24 - 80);
                            }
                          }
                        }
                        return next;
                      });
                    }}
                      className="h-5 text-[10px] text-ide-accent hover:bg-ide-accent/20 px-1.5">Next →</Button>
                    <button onClick={() => setTutorialActive(false)} className="text-ide-text-muted hover:text-ide-text"><X className="w-3 h-3" /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Problems panel — click a row to jump to that line ── */}
            {lintErrors.length > 0 && activeFile === 'main.py' && (
              <div className="flex-shrink-0 bg-red-500/10 border-b border-red-500/20">
                <button
                  onClick={() => setProblemsPanelOpen(o => !o)}
                  className="w-full flex items-center gap-1.5 px-3 py-1 text-left hover:bg-red-500/15"
                >
                  <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                  <span className="text-[10px] text-red-300">{lintErrors.length} issue{lintErrors.length !== 1 ? 's' : ''} found</span>
                  <span className="text-[10px] text-ide-text-muted">— Line{lintErrors.length > 1 ? 's' : ''} {lintErrors.slice(0, 5).map(e => e.line + 1).join(', ')}{lintErrors.length > 5 ? '...' : ''}</span>
                  <ChevronDown className={`w-3 h-3 ml-auto text-ide-text-muted transition-transform flex-shrink-0 ${problemsPanelOpen ? 'rotate-180' : ''}`} />
                </button>
                {problemsPanelOpen && (
                  <div className="max-h-32 overflow-y-auto border-t border-red-500/20">
                    {lintErrors.map((err, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          // Same jump mechanism Find/Replace already uses —
                          // scroll the line into view via the shared scroll
                          // container (not the textarea itself).
                          if (textareaRef.current) {
                            const lineHeight = 24;
                            const scrollContainer = textareaRef.current.closest('.overflow-auto');
                            if (scrollContainer) scrollContainer.scrollTop = Math.max(0, err.line * lineHeight - 80);
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1 text-left hover:bg-red-500/15 border-t border-red-500/10 first:border-t-0"
                      >
                        {err.severity === 'error'
                          ? <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                          : <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                        <span className="text-[10px] text-ide-text-muted font-mono flex-shrink-0">L{err.line + 1}</span>
                        <span className="text-[10px] text-ide-text truncate">{err.message}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 flex min-h-0">
              {/* Gutter with diff/error markers */}
              <div ref={lineNumberRef} className="w-14 flex-shrink-0 select-none bg-ide-gutter border-r border-ide-border pt-4" style={{ overflow: 'hidden' }}>
                {lines.map((_, i) => {
                  const hasError = lintErrorsByLine.has(i);
                  const errInfo = lintErrorsByLine.get(i);
                  const isDiff = changedLines.has(i);
                  const isTutorialLine = tutorialActive && i === tutorialTargetLine;
                  return (
                    <div key={i} className={`flex items-center font-mono leading-6 text-[12px] transition-colors relative group ${
                      isTutorialLine ? 'bg-ide-accent/20' : i === cursorLine ? 'text-ide-text bg-ide-line-highlight' : 'text-ide-text-muted'
                    }`}>
                      {/* Diff marker */}
                      <div className={`w-[3px] h-full flex-shrink-0 ${isDiff ? 'bg-ide-green' : hasError ? (errInfo?.severity === 'error' ? 'bg-red-400' : 'bg-ide-orange') : ''}`} />
                      {/* Tutorial glow */}
                      {isTutorialLine && <div className="absolute inset-0 bg-ide-accent/10 animate-pulse pointer-events-none" />}
                      <span className="flex-1 text-right pr-2">{i + 1}</span>
                      {/* Error tooltip on hover */}
                      {hasError && (
                        <div className="absolute left-14 top-0 hidden group-hover:block z-50">
                          <div className={`px-2 py-1 rounded text-[10px] whitespace-nowrap shadow-lg ${errInfo?.severity === 'error' ? 'bg-red-500/90 text-white' : 'bg-ide-orange/90 text-white'}`}>
                            {errInfo?.message}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div
                className="flex-1 min-w-0 overflow-auto relative"
                onScroll={(e) => {
                  const scrollTop = (e.target as HTMLElement).scrollTop;
                  if (lineNumberRef.current) {
                    lineNumberRef.current.style.transform = `translateY(-${scrollTop}px)`;
                  }
                  // Hide autocomplete on scroll
                  if (autocompleteItems.length > 0) setAutocompleteItems([]);
                }}
              >
                <div className="relative" style={{ display: 'grid', gridTemplate: '"stack" 1fr / 1fr', minWidth: 'max-content' }}>
                  {activeFile === 'main.py' && highlightedContent && (
                    <div
                      className="pt-4 pl-4 pr-4 font-mono text-[13px] leading-6 pointer-events-none whitespace-pre text-ide-text"
                      style={{ gridArea: 'stack' }}
                      aria-hidden="true"
                    >
                      {highlightedContent.map((line, i) => {
                        const isCurrentMatch = searchMatches.length > 0 && searchMatches[currentMatchIndex]?.line === i;
                        const isOtherMatch = !isCurrentMatch && searchMatches.some(m => m.line === i);
                        const isTutLine = tutorialActive && i === tutorialTargetLine;
                        const hasBracket = bracketHighlights && (bracketHighlights[0].line === i || bracketHighlights[1].line === i);
                        const isDiffLine = changedLines.has(i);
                        const hasLintError = lintErrorsByLine.has(i);
                        const lintInfo = lintErrorsByLine.get(i);
                        return (
                          <div key={i} className={`${i === cursorLine ? 'bg-ide-line-highlight' : ''} ${isCurrentMatch ? 'bg-ide-accent/25 ring-1 ring-ide-accent/40' : isOtherMatch ? 'bg-ide-accent/10' : ''} ${isTutLine ? 'bg-ide-accent/15 border-l-2 border-ide-accent' : ''} ${hasBracket ? 'bg-ide-yellow/8' : ''} ${isDiffLine ? 'bg-ide-green/8 border-l-2 border-ide-green/40' : ''} ${hasLintError ? (lintInfo?.severity === 'error' ? 'bg-red-500/8 decoration-wavy underline decoration-red-400/60 underline-offset-2' : 'bg-ide-orange/8 decoration-wavy underline decoration-ide-orange/60 underline-offset-2') : ''}`} dangerouslySetInnerHTML={{ __html: line }} />
                        );
                      })}
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    defaultValue={files[activeFile]}
                    onChange={e => {
                      updateFile(e.target.value);
                      updateCursorInfo(e.target);
                      // Autocomplete: extract word at cursor
                      const ta = e.target;
                      const pos = ta.selectionStart;
                      const textBefore = ta.value.substring(0, pos);
                      const wordMatch = textBefore.match(/[A-Za-z_]\w*$/);
                      if (wordMatch && wordMatch[0].length >= 2) {
                        const word = wordMatch[0];
                        autocompleteWordRef.current = word;
                        const items = getAutocompleteItems(ta.value, word);
                        setAutocompleteItems(items);
                        setSelectedAutocomplete(0);
                        // Position popup near cursor
                        const lines = textBefore.split('\n');
                        const lineIdx = lines.length - 1;
                        const colIdx = lines[lineIdx].length;
                        const scrollContainer = ta.closest('.overflow-auto');
                        const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
                        setAutocompletePos({ top: (lineIdx + 1) * 24 + 16 - scrollTop, left: Math.min(colIdx * 7.8 + 16, 300) });
                      } else {
                        setAutocompleteItems([]);
                        autocompleteWordRef.current = '';
                      }
                    }}
                    onKeyDown={e => {
                      // Autocomplete navigation
                      if (autocompleteItems.length > 0) {
                        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedAutocomplete(s => (s + 1) % autocompleteItems.length); return; }
                        if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedAutocomplete(s => (s - 1 + autocompleteItems.length) % autocompleteItems.length); return; }
                        if (e.key === 'Tab' || e.key === 'Enter') {
                          if (autocompleteItems[selectedAutocomplete]) {
                            e.preventDefault();
                            const target = e.target as HTMLTextAreaElement;
                            const pos = target.selectionStart;
                            const word = autocompleteWordRef.current;
                            const completion = autocompleteItems[selectedAutocomplete].label;
                            const value = target.value;
                            const newValue = value.substring(0, pos - word.length) + completion + value.substring(pos);
                            target.value = newValue;
                            const newPos = pos - word.length + completion.length;
                            requestAnimationFrame(() => { target.selectionStart = target.selectionEnd = newPos; updateCursorInfo(target); });
                            updateFile(newValue);
                            setAutocompleteItems([]);
                            return;
                          }
                        }
                        if (e.key === 'Escape') { setAutocompleteItems([]); return; }
                      }

                      // Ctrl/Cmd+Tab is the browser's tab-switch shortcut — without this
                      // check it got preventDefault()-ed and 4 spaces were inserted into
                      // the code instead of switching tabs.
                      if (e.key === 'Tab' && autocompleteItems.length === 0 && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        const target = e.target as HTMLTextAreaElement;
                        const start = target.selectionStart;
                        const end = target.selectionEnd;
                        const value = target.value;
                        const newValue = value.substring(0, start) + '    ' + value.substring(end);
                        target.value = newValue;
                        updateFile(newValue);
                        requestAnimationFrame(() => {
                          target.selectionStart = target.selectionEnd = start + 4;
                          updateCursorInfo(target);
                        });
                      }
                      // Auto-bracket/quote closing
                      const PAIRS: Record<string, string> = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };
                      const CLOSERS = new Set([')', ']', '}']);
                      
                      if (CLOSERS.has(e.key) || e.key === '"' || e.key === "'") {
                        const target = e.target as HTMLTextAreaElement;
                        if (target.value[target.selectionStart] === e.key) {
                          e.preventDefault();
                          target.selectionStart = target.selectionEnd = target.selectionStart + 1;
                          updateCursorInfo(target);
                          return;
                        }
                      }
                      
                      if (PAIRS[e.key] && !CLOSERS.has(e.key)) {
                        const target = e.target as HTMLTextAreaElement;
                        const start = target.selectionStart;
                        const charAfter = target.value[start];
                        // Detect triple-quote: if user just typed two quotes and is now typing the third,
                        // don't auto-pair — let the raw character through for """ or '''
                        if ((e.key === '"' || e.key === "'") && start >= 2) {
                          const prev2 = target.value.slice(start - 2, start);
                          if (prev2 === e.key.repeat(2)) {
                            // Typing third quote to form triple-quote — don't auto-pair
                            return; // let default behavior insert the raw character
                          }
                        }
                        if ((e.key === '"' || e.key === "'") && charAfter && !/[\s\)\]\},:]/.test(charAfter)) {
                          // Don't auto-pair when next char is a word character
                        } else {
                          e.preventDefault();
                          const end = target.selectionEnd;
                          const value = target.value;
                          const selected = value.substring(start, end);
                          const newValue = value.substring(0, start) + e.key + selected + PAIRS[e.key] + value.substring(end);
                          target.value = newValue;
                          updateFile(newValue);
                          requestAnimationFrame(() => {
                            target.selectionStart = start + 1;
                            target.selectionEnd = start + 1 + selected.length;
                            updateCursorInfo(target);
                          });
                          return;
                        }
                      }
                      if (e.key === 'Backspace') {
                        const PAIRS_LOCAL: Record<string, string> = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };
                        const target = e.target as HTMLTextAreaElement;
                        const pos = target.selectionStart;
                        if (pos > 0 && target.selectionStart === target.selectionEnd) {
                          const before = target.value[pos - 1];
                          const after = target.value[pos];
                          if (PAIRS_LOCAL[before] === after) {
                            e.preventDefault();
                            const value = target.value;
                            const newValue = value.substring(0, pos - 1) + value.substring(pos + 1);
                            target.value = newValue;
                            updateFile(newValue);
                            requestAnimationFrame(() => { target.selectionStart = target.selectionEnd = pos - 1; updateCursorInfo(target); });
                            return;
                          }
                        }
                      }
                      // Ctrl/Cmd+Enter is the Run shortcut (handled by the global keydown
                      // listener) — without this check, this local auto-indent handler fired
                      // FIRST (this component is mounted below `window` in the bubble chain)
                      // and inserted a stray newline into the code on every keyboard-triggered
                      // Run, before the global handler even got a chance to run it.
                      if (e.key === 'Enter' && autocompleteItems.length === 0 && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        const target = e.target as HTMLTextAreaElement;
                        const pos = target.selectionStart;
                        const value = target.value;
                        const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
                        const currentLine = value.slice(lineStart, pos);
                        const indent = currentLine.match(/^(\s*)/)?.[1] || '';
                        // Quote-aware comment stripping (tokenizeLine, same
                        // approach used elsewhere in this file) — a naive
                        // trailing-comment check would miss "if x:  # note"
                        // entirely (endsWith(':') is false because the raw
                        // line actually ends in the comment text), and would
                        // also mis-fire on a "#" that's really inside a
                        // string like `return "#FF0000"`.
                        const codeOnly = tokenizeLine(currentLine).filter(t => t.type !== 'comment').map(t => t.value).join('');
                        const codeTrimmed = codeOnly.trim();
                        let nextIndent = indent;
                        if (codeTrimmed.endsWith(':')) {
                          nextIndent = indent + '    ';
                        } else if (/^(return|pass|break|continue|raise)\b/.test(codeTrimmed) && indent.length >= 4) {
                          // These statements end this branch's active code —
                          // the next line almost always belongs one level
                          // back out, not still nested under the same block.
                          nextIndent = indent.slice(0, -4);
                        }
                        const insertion = '\n' + nextIndent;
                        const newValue = value.substring(0, pos) + insertion + value.substring(target.selectionEnd);
                        target.value = newValue;
                        updateFile(newValue);
                        requestAnimationFrame(() => {
                          const newPos = pos + insertion.length;
                          target.selectionStart = target.selectionEnd = newPos;
                          updateCursorInfo(target);
                        });
                      }
                    }}
                    onClick={e => { updateCursorInfo(e.target as HTMLTextAreaElement); setAutocompleteItems([]); }}
                    onSelect={e => updateCursorInfo(e.target as HTMLTextAreaElement)}
                    onBlur={() => setTimeout(() => setAutocompleteItems([]), 150)}
                    spellCheck={false}
                    className={`resize-none font-mono text-[13px] pt-4 pl-4 pr-4 leading-6 focus:outline-none border-0 bg-transparent whitespace-pre ${
                      activeFile === 'main.py' ? 'text-transparent caret-ide-cursor' : 'text-ide-text'
                    }`}
                    style={{ gridArea: 'stack', minHeight: '100%' }}
                    placeholder="# Start coding..."
                  />
                </div>

                {/* ── Autocomplete Popup ── */}
                {autocompleteItems.length > 0 && autocompletePos && (
                  <div
                    className="absolute z-50 bg-ide-sidebar border border-ide-border rounded-md shadow-xl overflow-hidden"
                    style={{ top: autocompletePos.top, left: Math.min(autocompletePos.left, 300) }}
                  >
                    {autocompleteItems.map((item, i) => (
                      <button
                        key={item.label}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const target = textareaRef.current;
                          if (!target) return;
                          const pos = target.selectionStart;
                          const word = autocompleteWordRef.current;
                          const value = target.value;
                          const newValue = value.substring(0, pos - word.length) + item.label + value.substring(pos);
                          target.value = newValue;
                          const newPos = pos - word.length + item.label.length;
                          target.selectionStart = target.selectionEnd = newPos;
                          updateFile(newValue);
                          updateCursorInfo(target);
                          setAutocompleteItems([]);
                        }}
                        className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                          i === selectedAutocomplete ? 'bg-ide-accent/20 text-ide-text' : 'text-ide-text-muted hover:bg-ide-border/50'
                        }`}
                      >
                        <span className={`w-4 text-center text-[10px] font-bold ${
                          item.type === 'variable' ? 'text-ide-cyan' : item.type === 'keyword' ? 'text-ide-purple' : 'text-ide-yellow'
                        }`}>
                          {item.type === 'variable' ? 'V' : item.type === 'keyword' ? 'K' : 'B'}
                        </span>
                        <span className={item.type === 'variable' ? 'font-semibold text-ide-cyan' : ''}>{item.label}</span>
                        {item.detail && <span className="text-[9px] text-ide-text-muted ml-auto">{item.detail}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Combined Bottom Panel (Terminal + AI Mentor) ── */}
          <AnimatePresence>
            {showBottomPanel && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 180 }}
                exit={{ height: 0 }}
                className="overflow-hidden flex-shrink-0 flex flex-col border-t border-ide-border-subtle"
              >
                <div className="flex items-center px-2 bg-ide-sidebar border-b border-ide-border h-7 flex-shrink-0">
                  {[
                    { id: 'terminal' as BottomTab, icon: Terminal, label: 'Terminal', color: 'text-ide-green' },
                    { id: 'console' as BottomTab, icon: Printer, label: 'Console', color: 'text-ide-cyan' },
                    { id: 'ai-mentor' as BottomTab, icon: Brain, label: 'AI Mentor (Pair Programmer)', color: 'text-ide-accent' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setBottomTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
                        bottomTab === tab.id ? `${tab.color} bg-ide-bg` : 'text-ide-text-muted hover:text-ide-text'
                      }`}
                    >
                      <tab.icon className="w-3 h-3" />
                      {tab.label}
                      {tab.id === 'ai-mentor' && isAiLoading && <Loader2 className="w-3 h-3 animate-spin text-ide-accent" />}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button onClick={() => setShowBottomPanel(false)} className="text-ide-text-muted hover:text-ide-text p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 bg-ide-bg">
                  {bottomTab === 'terminal' ? (
                    <div className="font-mono text-xs text-ide-green space-y-0.5">
                      {terminalOutput.map((line, i) => <div key={i}>{line}</div>)}
                      {terminalOutput.length === 0 && <span className="text-ide-text-muted">$ Ready</span>}
                    </div>
                  ) : bottomTab === 'console' ? (
                    <div className="font-mono text-xs space-y-0.5">
                      {consoleResult === null && (
                        <span className="text-ide-text-muted">Start typing in main.py — what your code prints shows up here, live.</span>
                      )}
                      {consoleResult?.status === 'ok' && (
                        consoleResult.stdout ? (
                          <pre className="whitespace-pre-wrap text-ide-cyan">{consoleResult.stdout}</pre>
                        ) : (
                          <span className="text-ide-text-muted">Your code runs cleanly, but doesn't print() anything yet.</span>
                        )
                      )}
                      {consoleResult?.status === 'error' && (
                        <span className="text-red-400">⚠ {consoleResult.message}</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-ide-text flex flex-col h-full">
                      <div className="flex-1 overflow-y-auto">
                        {aiOutput ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{aiOutput}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-center py-4 space-y-2">
                            <Brain className="w-8 h-8 mx-auto text-ide-accent/50" />
                            <p className="text-ide-text-muted text-xs">Your AI Mentor can see your code and will guide you — not build for you!</p>
                            <p className="text-ide-text-muted text-[10px] italic">Try: "How do I add a quiz feature?" or click Review above</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2 pt-2 border-t border-ide-border flex-shrink-0">
                        <Input
                          value={mentorInput}
                          onChange={e => setMentorInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleMentorChat()}
                          placeholder="Ask your mentor... (they can see your code!)"
                          disabled={isAiLoading}
                          className="h-7 text-xs border-0 focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent"
                        />
                        <Button size="sm" onClick={handleMentorChat} disabled={isAiLoading || !mentorInput.trim()}
                          className="h-7 px-2 bg-ide-accent text-ide-bg-deep hover:bg-ide-accent/90">
                          {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: Live Preview / Chat */}
        <div className={`w-72 flex-col flex-shrink-0 border-l border-ide-border ${
          showMobilePreview ? 'flex fixed inset-0 z-40 w-full lg:relative lg:w-72' : showPreview ? 'hidden lg:flex' : 'hidden'
        }`} style={{ backgroundColor: selectedTheme.bg }}>
          <div className="px-3 py-2 flex items-center gap-2 border-b border-ide-border h-9 flex-shrink-0" style={{ backgroundColor: selectedTheme.chat }}>
            <Circle className="w-2 h-2" style={{ color: selectedTheme.accent, fill: selectedTheme.accent }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: selectedTheme.accent }}>Live Preview</span>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" onClick={() => { setShowMobilePreview(false); setShowPreview(false); }}
              className="h-6 w-6 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50 lg:hidden">
              <X className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon"
              onClick={() => setChatMessages([])}
              className="h-6 w-6 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          {(() => {
            const cfg = liveConfig;
            const codeKB = cfg.knowledgeBaseFromCode;
            const codeQA = cfg.qaPairsFromCode;
            const totalRules = cfg.conversationRules.length;
            const totalEggs = Object.keys(cfg.secretResponses).length;
            const totalStarters = cfg.conversationStarters.length;
            const totalCatchphrases = cfg.catchphrases.length;
            const totalBlocked = cfg.blockedTopics.length;
            const sidebarQs = new Set(qaData.filter(p => p.q.trim()).map(p => p.q.toLowerCase().trim()));
            const uniqueCodeQA = codeQA.filter(p => !sidebarQs.has(p.q.toLowerCase().trim()));
            const mergedQACount = qaData.filter(p => p.q.trim()).length + uniqueCodeQA.length;

            const totalChallenges = 34;
            const activeCount = getChallengeCount(cfg, projectType);

            return (
              <div className="px-3 py-1.5 border-b border-ide-border/50 space-y-1" style={{ backgroundColor: selectedTheme.chat }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{cfg.botEmoji}</span>
                  <span className="text-[11px] text-ide-text font-bold truncate">{cfg.botName}</span>
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${selectedTheme.accent}33`, color: selectedTheme.accent }}>{activeCount}/{totalChallenges}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {codeKB.trim() && <span className="text-[8px] px-1 py-0.5 rounded bg-ide-green/20 text-ide-green">📚</span>}
                  {mergedQACount > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-ide-cyan/20 text-ide-cyan">💬{mergedQACount}</span>}
                  {totalRules > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-ide-yellow/20 text-ide-yellow">📏{totalRules}</span>}
                  {totalEggs > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-ide-purple/20 text-ide-purple">🔐{totalEggs}</span>}
                  <span className="text-[8px] px-1 py-0.5 rounded bg-ide-border text-ide-text-muted">🌡️{cfg.temperature} · {cfg.responseStyle}</span>
                </div>
              </div>
            );
          })()}

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.length <= 1 && (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-xl bg-ide-accent/10 flex items-center justify-center overflow-hidden">
                  {logoUrl && (isSafeExternalUrl(logoUrl) || /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/.test(logoUrl)) ? (
                    <img src={logoUrl} alt="" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <span className="text-2xl">{liveConfig.botEmoji}</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-ide-text mb-1">{liveConfig.botName}</p>
                  <p className="text-[10px] text-ide-text-muted">{liveConfig.greeting || 'Edit your code to configure this chatbot!'}</p>
                </div>
                <div className="space-y-1.5">
                  {(liveConfig.conversationStarters.length > 0
                    ? liveConfig.conversationStarters.slice(0, 4)
                    : ['Hello, who are you?', 'What can you help me with?', 'Tell me a fun fact']
                  ).map((example, index) => (
                    <button
                      key={`${example}-${index}`}
                      onClick={() => { handleChatSend(example); }}
                      className="block w-full text-left text-[11px] px-3 py-1.5 rounded bg-ide-border/30 text-ide-text-muted hover:bg-ide-border/50 hover:text-ide-text transition-colors"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => {
              // Skip rendering the entire bubble for placeholder during streaming
              if (msg.role === 'assistant' && msg.content === '...' && isStreaming) return null;
              return (
              <div key={msg._id || `chat-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  msg.role === 'system'
                    ? 'bg-ide-border text-ide-text-muted italic'
                    : ''
                }`} style={
                  msg.role === 'user' 
                    ? { backgroundColor: selectedTheme.accent, color: '#fff' }
                    : msg.role === 'assistant'
                    ? { backgroundColor: `${selectedTheme.accent}18`, border: `1px solid ${selectedTheme.accent}30`, color: '#e2e8f0' }
                    : undefined
                }>
                  {msg.role === 'assistant' ? (
                    (() => {
                      const reasoningSteps = projectType === 'agent' ? parseReasoningTrace(msg.content) : null;
                      if (reasoningSteps) {
                        return <ReasoningTrace steps={reasoningSteps} />;
                      }
                      return (
                        <div>
                          {msg.usedRealPython && (
                            <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-400 mb-1" title="main.py's respond() answered this message directly — the AI wasn't called.">
                              🐍 Answered by your Python code
                            </div>
                          )}
                          <div className="prose prose-invert prose-xs max-w-none [&_p]:m-0">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
              </div>
              );
            })}
            {isStreaming && (() => { const last = chatMessages[chatMessages.length - 1]; return last?.role === 'assistant' && (last.content === '...' || last.content === ''); })() && (
              <div className="flex justify-start">
                <div className="bg-ide-editor rounded-lg px-3 py-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ide-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ide-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ide-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-ide-border space-y-2">
            {/* Voice listening indicator */}
            {isListening && (
              <div className="flex items-center justify-center gap-2 py-1">
                <div className="relative">
                  <Mic className="w-4 h-4 text-red-400" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-400 rounded-full animate-ping" />
                </div>
                <span className="text-[10px] text-red-400 font-medium animate-pulse">
                  {waitingForWakeWord && liveConfig.wakeWord ? `Say "${liveConfig.wakeWord}"...` : 'Listening...'}
                </span>
              </div>
            )}
            {isSpeaking && (
              <div className="flex items-center justify-center gap-2 py-1">
                <Volume2 className="w-4 h-4 text-ide-accent animate-pulse" />
                <span className="text-[10px] text-ide-accent font-medium">Speaking...</span>
              </div>
            )}
            {liveConfig.voiceEnabled && (
              <div className="flex items-center gap-1 px-1">
                <Button size="sm" onClick={toggleListening} disabled={isStreaming}
                  title={isListening ? 'Stop listening' : 'Push to talk'}
                  className={`h-6 w-6 p-0 flex-shrink-0 ${isListening ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-ide-border text-ide-text-muted hover:text-ide-text hover:bg-ide-selection'}`}>
                  <Mic className="w-3 h-3" />
                </Button>
                <Button size="sm" onClick={toggleVoiceConversation} disabled={isStreaming}
                  title={voiceConversationMode ? 'Disable hands-free' : 'Enable hands-free mode'}
                  className={`h-6 px-1.5 text-[9px] font-bold flex-shrink-0 ${voiceConversationMode ? 'bg-ide-green text-ide-bg-deep hover:bg-ide-green/80' : 'bg-ide-border text-ide-text-muted hover:text-ide-text hover:bg-ide-selection'}`}>
                  <Radio className="w-3 h-3" />
                </Button>
                <Button size="sm" onClick={() => { setTtsEnabled(v => !v); if (isSpeaking) { window.speechSynthesis?.cancel(); setIsSpeaking(false); } }}
                  title={ttsEnabled ? 'Mute voice' : 'Unmute voice'}
                  className="h-6 w-6 p-0 flex-shrink-0 bg-ide-border text-ide-text-muted hover:text-ide-text hover:bg-ide-selection">
                  {ttsEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                </Button>
              </div>
            )}
            <div className="flex gap-1.5">
              <Input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                placeholder={isListening ? '🎤 Listening...' : `Ask ${liveConfig.botName} something...`}
                disabled={isStreaming || isListening}
                className="h-8 text-xs border-0 focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent flex-1 min-w-0" />
              <Button size="sm" onClick={() => handleChatSend()} disabled={isStreaming || !chatInput.trim()}
                className="h-8 w-8 p-0 flex-shrink-0 bg-ide-accent text-ide-bg-deep hover:bg-ide-accent/90">
                {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status / Action Bar ── */}
      <div className="flex items-center justify-between px-3 h-8 flex-shrink-0 bg-ide-sidebar border-t border-ide-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <Circle className={`w-1.5 h-1.5 ${isDirty ? 'fill-ide-orange text-ide-orange' : 'fill-ide-green text-ide-green'}`} />
            <span className="text-[10px] font-mono text-ide-text-muted">{isDirty ? 'Unsaved changes' : 'All changes saved'}</span>
          </div>
          {isDirty && currentProjectId && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-ide-text-muted">
              <Save className="w-3 h-3" />
              <span>Auto-save in {Math.floor(autoSaveCountdown / 60)}:{String(autoSaveCountdown % 60).padStart(2, '0')}</span>
            </div>
          )}
          <span className="text-[10px] font-mono text-ide-text-muted">{lines.length} lines</span>
          <span className="text-[10px] font-mono text-ide-text-muted">•</span>
          <span className="text-[10px] font-mono text-ide-text-muted">{activeFile}</span>
          {lintErrors.length > 0 && (
            <>
              <span className="text-[10px] font-mono text-ide-text-muted">•</span>
              <span className="text-[10px] font-mono text-red-400">⚠ {lintErrors.filter(e => e.severity === 'error').length} errors</span>
              {lintErrors.some(e => e.severity === 'warning') && (
                <span className="text-[10px] font-mono text-ide-orange">{lintErrors.filter(e => e.severity === 'warning').length} warnings</span>
              )}
            </>
          )}
          {changedLines.size > 0 && (
            <>
              <span className="text-[10px] font-mono text-ide-text-muted">•</span>
              <span className="text-[10px] font-mono text-ide-green">{changedLines.size} changed</span>
            </>
          )}
          {!hasLiveEvent && (
            <LevelBadge challengeCount={getChallengeCount(liveConfig, projectType)} compact />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={() => { setShowBottomPanel(v => !v); setBottomTab('terminal'); }}
            variant="ghost" className="h-6 text-[10px] text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
            <Terminal className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Terminal</span>
          </Button>
          <Button size="sm" onClick={() => { setTerminalOutput([]); toast.success('Terminal cleared'); }}
            variant="ghost" className="h-6 text-[10px] text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50"
            title="Clear terminal">
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button size="sm" onClick={() => { setShowMobilePreview(true); setShowPreview(true); }}
            variant="ghost" className="h-6 text-[10px] lg:hidden text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
          <Button size="sm" onClick={() => setShowPreview(v => !v)}
            variant="ghost" className="h-6 text-[10px] hidden lg:flex text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
            {showPreview ? <PanelRightClose className="w-3 h-3 mr-1" /> : <PanelRightOpen className="w-3 h-3 mr-1" />}
            Preview
          </Button>
          <Button size="sm" onClick={handleRun} disabled={isRunning} title="Run Tests (Ctrl+Enter)"
            className="h-6 text-[10px] font-bold uppercase tracking-wide bg-ide-border text-ide-text hover:bg-ide-selection border border-ide-border">
            {isRunning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <TestTube className="w-3 h-3 mr-1" />}
            <span className="hidden sm:inline">Run</span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} title="Save Checkpoint (Ctrl+S)"
            className="h-6 text-[10px] font-bold uppercase tracking-wide bg-ide-accent text-ide-bg-deep hover:bg-ide-accent/90">
            {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button size="sm" onClick={handleGoLive} title={hasLiveEvent ? "Publish & get shareable link" : "Submissions open during live events only"} disabled={!hasLiveEvent}
            className={`h-6 text-[10px] font-bold uppercase tracking-wide ${hasLiveEvent ? 'bg-ide-green text-ide-bg-deep hover:opacity-90' : 'bg-ide-border text-ide-text-muted cursor-not-allowed opacity-60'}`}>
            {hasLiveEvent ? <Rocket className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
            <span className="hidden sm:inline">{hasLiveEvent ? 'Go Live' : 'Locked'}</span>
          </Button>
        </div>
      </div>

      <PublishModal
        isOpen={publishOpen}
        onClose={() => setPublishOpen(false)}
        code={files['main.py']}
        templateId={projectType}
        projectName={projectName}
        description={systemPrompt}
        prefillEmail={authorEmail}
        prefillAuthorName={authorName}
        currentProjectId={currentProjectId}
        onProjectIdUpdate={(id) => { setCurrentProjectId(id); localStorage.setItem('forge-current-project-id', id); }}
        lastKnownUpdatedAt={lastKnownUpdatedAt}
        onUpdatedAtChange={setLastKnownUpdatedAt}
      />

      {/* Walkthrough guide for new users */}
      {showWalkthrough && !hasLiveEvent && (
        <ForgeWalkthrough onComplete={() => {
          setShowWalkthrough(false);
          localStorage.setItem('forge-walkthrough-done', 'true');
        }} />
      )}

      {/* Milestone celebration */}
      <MilestoneCelebration
        show={!!milestoneMsg}
        message={milestoneMsg || ''}
        onComplete={() => setMilestoneMsg(null)}
      />
    </div>
  );
};
