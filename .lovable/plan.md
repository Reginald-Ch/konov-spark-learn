

# Plan: Add Voice Assistant to Live Preview (Siri/Alexa/Google-style)

## What We're Building

A voice assistant experience in the **Live Preview chat panel** of ProjectEditor. When students set `VOICE_ENABLED = True` in their code, the chat panel gains a mic button, voice-to-text input, and text-to-speech output — making their bot feel like Siri/Alexa/Google Assistant. Two modes: push-to-talk and hands-free continuous conversation.

The AIModelsTab already has this pattern working. We'll port and enhance it for the main Build Studio.

## Implementation

### 1. Add Voice Controls to ProjectEditor Live Preview
**File:** `src/components/hackathon/ProjectEditor.tsx`

- Add state: `isListening`, `voiceConversationMode`, refs for `SpeechRecognition` and `voiceModeRef`
- Add `startListeningOnce()` — uses Web Speech API STT, on final transcript calls `handleChatSend(transcript)`
- Add `toggleListening()` — start/stop mic
- Add `toggleVoiceConversation()` — enables hands-free loop mode
- After streaming completes in `handleChatSend`, if `liveConfig.voiceEnabled`, speak the response via `speechSynthesis` (clean markdown first). In hands-free mode, auto-restart listening after TTS finishes
- Add to the chat input bar (next to Send button):
  - **Mic button** — pulses when listening, colored by theme accent
  - **Hands-free toggle button** — enables continuous conversation mode
  - **Volume toggle** — mute/unmute TTS
- Show visual feedback: pulsing ring animation when listening, waveform indicator when speaking
- Conditionally show voice controls only when `liveConfig.voiceEnabled === true`

### 2. Add Voice Controls to ProjectView (Published Projects)
**File:** `src/pages/ProjectView.tsx`

- Same voice logic: STT via Web Speech API, TTS via `speechSynthesis`
- Mic button in chat input area when `voiceEnabled` detected from code
- Hands-free mode support

### 3. Update Scaffold Templates with Voice Challenge
**File:** `src/components/hackathon/projectScaffolds.ts`

- Ensure Challenge 21 (`VOICE_ENABLED`) and Challenge 22 (`VOICE_MODE`) are well-documented in both chatbot and agent scaffolds with clear instructions

### 4. Visual Design (No New Component Needed)

The voice UI lives inline in the existing chat panel:

```text
┌─────────────────────────┐
│ Live Preview            │
│                         │
│  Chat messages...       │
│                         │
│  🔵 ← pulsing when     │
│       listening         │
│                         │
├─────────────────────────┤
│ [input] [🎤] [🔊] [▶]  │
│         [🎙️ Hands-free] │
└─────────────────────────┘
```

- Mic button: theme accent color, pulses with `animate-pulse` when active
- Listening indicator: "🎤 Listening..." replaces input placeholder
- Speaking indicator: small speaker icon animates while TTS plays

## Technical Details

- **STT**: `window.SpeechRecognition` / `webkitSpeechRecognition` (browser-native, free, no API key)
- **TTS**: `window.speechSynthesis` (browser-native, free). Strips markdown before speaking
- **Hands-free loop**: TTS `onend` callback triggers `startListeningOnce()` after 300ms delay
- **Cancellation**: New user input cancels ongoing TTS via `speechSynthesis.cancel()`
- No external dependencies or API keys needed

## Files Modified
- `src/components/hackathon/ProjectEditor.tsx` — voice state, STT/TTS logic, mic/speaker buttons in chat panel
- `src/pages/ProjectView.tsx` — same voice support for published projects
- `src/components/hackathon/projectScaffolds.ts` — verify voice challenges are clear

