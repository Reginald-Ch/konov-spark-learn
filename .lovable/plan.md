

# AI Hackathon Enhancement Plan

The hackathon page currently uses generic tech/coding language. Since this is an **AI Hackathon**, the entire experience needs to be rebranded and enhanced for AI-specific content. Here's what needs to change:

---

## 1. Rebrand All Content to AI Hackathon Theme

**Welcome Banner** (Hackathons.tsx)
- Change "Welcome to Hackathons!" to "Welcome to AI Hackathons!"
- Update description to focus on AI: "Build AI-powered solutions. Experiment with machine learning, chatbots, computer vision, and more!"
- Add AI-themed icons and language

**Server Header**
- "Tech Kids Hackathons" to "Tech Kids AI Hackathons"

---

## 2. Update Project Ideas for AI Focus

**Replace all 8 project ideas** in `ProjectIdeas.tsx` with AI-specific ones:
- AI Chatbot Assistant (Beginner) - Build a conversational bot using an LLM API
- Image Classifier (Intermediate) - Use a pre-trained model to classify images
- AI Story Generator (Beginner) - Generate creative stories with AI prompts
- Smart Study Planner (Intermediate) - AI-powered study schedule optimization
- Sentiment Analyzer (Beginner) - Analyze text sentiment from social media posts
- AI Art Gallery (Intermediate) - Generate and curate AI-created artwork
- Voice Command App (Advanced) - Speech-to-text powered app controls
- AI Debate Partner (Advanced) - An AI that argues different perspectives

Update **category filters** to: All Ideas, Chatbots, Computer Vision, Creative AI, Data/ML

Update **tech stacks** to include AI-relevant tools: OpenAI API, TensorFlow.js, Hugging Face, Langchain, Stable Diffusion, etc.

---

## 3. Update Getting Started Guide for AI Context

**Modify steps** in `GettingStarted.tsx`:
- Step 3: "Build Your AI Project" - mention AI APIs, prompt engineering, model selection
- Add AI-specific pro tips: "Start with a pre-trained model", "Use free AI API tiers", "Focus on the user experience, not just the AI", "Document your prompts and approach"

---

## 4. Update Code Playground for AI Development

**Enhance `CodePlayground.tsx`**:
- Set default CodeSandbox/StackBlitz templates to AI-relevant starter projects (e.g., React + AI API template)
- Add an "AI Starter Templates" section with pre-configured sandboxes for common AI tasks
- Update descriptions to reference AI development

---

## 5. Update FAQ for AI Hackathon

**Add AI-specific FAQ entries** in `HackathonFAQ.tsx`:
- "Do I need to know machine learning?" 
- "What AI APIs can I use?"
- "Are there free AI tools available?"
- "How do I handle API keys safely?"

---

## 6. Fix Code Playground UX Issue (from screenshot)

The screenshot shows a double close button (X and another X). Clean up the dialog header to have only one close button.

---

## Technical Details

### Files to modify:
1. **`src/pages/Hackathons.tsx`** - Update banner text, server name, and AI-themed messaging
2. **`src/components/hackathon/ProjectIdeas.tsx`** - Replace all project ideas with AI-focused ones, update categories
3. **`src/components/hackathon/GettingStarted.tsx`** - Update steps and tips for AI context
4. **`src/components/hackathon/CodePlayground.tsx`** - Add AI starter templates, fix double close button
5. **`src/components/hackathon/HackathonFAQ.tsx`** - Add AI-specific FAQ entries

### No database changes needed
All changes are frontend content updates - no new tables or migrations required.

