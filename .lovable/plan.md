

# Plan: Add WAKE_WORD and VOICE_GENDER Variables

## What We're Adding

Two new voice configuration variables that make the voice assistant feel more like Siri/Alexa:
- **`WAKE_WORD`** — A trigger phrase (e.g., "Hey Bot") that activates listening in hands-free mode
- **`VOICE_GENDER`** — Controls TTS voice selection (`"female"`, `"male"`, or `"default"`)

## Changes

### 1. Scaffold Templates (`projectScaffolds.ts`)
Add Challenge 23 (`WAKE_WORD`) and Challenge 24 (`VOICE_GENDER`) after the existing VOICE_MODE block in both chatbot and agent templates. Update the checklist to include them.

### 2. Parser (`ProjectEditor.tsx` + `ProjectView.tsx`)
Add two new fields to `extractConfigFromCode`:
- `wakeWord: extract('', 'WAKE_WORD', 'wake_word')`
- `voiceGender: extract('default', 'VOICE_GENDER', 'voice_gender')`

### 3. Voice Logic — Wake Word (`ProjectEditor.tsx` + `ProjectView.tsx`)
In `startListeningOnce`, when `wakeWord` is set and voice is in hands-free mode:
- First listen for the wake word phrase
- Only after detecting it, start actual message capture
- Show "Say '{wakeWord}' to start..." as the listening indicator

### 4. Voice Logic — Gender (`ProjectEditor.tsx` + `ProjectView.tsx`)
In `speakText`, before speaking:
- Get available voices via `speechSynthesis.getVoices()`
- Filter by voice name containing "female"/"male" keywords or by `voice.name` patterns
- Set `utterance.voice` to the best match

### 5. Challenge Tracker (`ProjectEditor.tsx`)
Add scanner entries:
- `WAKE_WORD` — ok if non-empty
- `VOICE_GENDER` — ok if not `"default"`

### 6. LearnTab (`LearnTab.tsx`)
Add descriptions for Challenge 23 and 24.

## Files Modified
- `src/components/hackathon/projectScaffolds.ts`
- `src/components/hackathon/ProjectEditor.tsx`
- `src/pages/ProjectView.tsx`
- `src/components/hackathon/LearnTab.tsx`

