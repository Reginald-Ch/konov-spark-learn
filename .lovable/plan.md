

# AI Hackathon MVP: Python + AI Models Focus

This plan transforms the hackathon into a Python-focused AI building platform where participants build AI projects exclusively using Python and AI models.

---

## What Changes

### 1. Code Playground -- Python-Only IDEs
Replace the current React-focused playgrounds (CodeSandbox, StackBlitz) with Python-friendly environments:
- **Google Colab** (primary) -- Free GPU, pre-installed ML libraries, perfect for AI
- **Replit Python** -- Collaborative Python IDE with package management  
- **Kaggle Notebooks** -- Dataset access + free GPU for ML projects

Update descriptions to emphasize Python + AI model development.

### 2. Project Ideas -- Python AI Projects Only
Replace all 8 project ideas with Python-specific AI projects:
- Chatbot with LangChain (Beginner) -- Python, OpenAI API, Streamlit
- Image Classifier with PyTorch (Intermediate) -- Python, torchvision, Gradio
- AI Story Generator (Beginner) -- Python, OpenAI, Flask
- Data Visualizer with ML Predictions (Intermediate) -- Python, scikit-learn, Matplotlib
- Sentiment Analysis Dashboard (Beginner) -- Python, Hugging Face Transformers, Streamlit
- AI Image Generator (Intermediate) -- Python, Stable Diffusion, Gradio
- Voice-to-Text Transcriber (Advanced) -- Python, Whisper, FastAPI
- AI Code Reviewer (Advanced) -- Python, LangChain, AST parsing

Update categories to: All Ideas, NLP/Chatbots, Computer Vision, Data Science, Generative AI

Update tech stacks to Python ecosystem: Python, PyTorch, TensorFlow, scikit-learn, Hugging Face, LangChain, Streamlit, Gradio, FastAPI, OpenAI API, Pandas, NumPy

### 3. Getting Started Guide -- Python AI Workflow
Update steps:
- Step 1: Same (register)
- Step 2: Same (teams)
- Step 3: "Build Your Python AI Project" -- set up Python environment, choose AI model, build with Streamlit/Gradio for demos
- Step 4: Same (submit)

Update pro tips:
- "Use Google Colab for free GPU access"
- "Start with Hugging Face pre-trained models"
- "Use Streamlit or Gradio to build your demo UI fast"
- "pip install everything you need in requirements.txt"
- "Test your model on small data first, then scale up"

### 4. Banner and Branding
- Update welcome text: "Build AI Projects with Python"
- Update description: "Use Python, PyTorch, TensorFlow, and leading AI models to build innovative solutions"
- Server header: "Tech Kids Python AI Hackathons"
- Channel descriptions updated for Python + AI context

### 5. FAQ Updates
Add/update Python-specific entries:
- "What Python libraries should I learn first?"
- "How do I get free GPU access?"
- "Can I use Jupyter notebooks?"
- "How do I deploy my Python AI project?"
Replace/update existing FAQ entries to reference Python instead of React/JavaScript

### 6. Quick Submit and Submission -- Python Context
- Update placeholder text to reference Python projects (e.g., "https://colab.research.google.com/...", GitHub repos with .py files)
- Update technologies placeholder to "e.g., Python, PyTorch, Hugging Face, Streamlit"

---

## Technical Details

### Files to modify:
1. **`src/components/hackathon/CodePlayground.tsx`** -- Replace playground list with Google Colab, Replit Python, Kaggle Notebooks
2. **`src/components/hackathon/ProjectIdeas.tsx`** -- Replace all ideas with Python AI projects, update categories and tech stacks
3. **`src/components/hackathon/GettingStarted.tsx`** -- Update step 3 and pro tips for Python AI workflow
4. **`src/components/hackathon/HackathonFAQ.tsx`** -- Add Python-specific FAQs, update existing ones
5. **`src/pages/Hackathons.tsx`** -- Update banner text, server name, channel descriptions for Python AI focus
6. **`src/components/hackathon/QuickSubmitModal.tsx`** -- Update placeholder text for Python projects
7. **`src/components/hackathon/SubmissionModal.tsx`** -- Update placeholder text for Python AI context

### No database changes needed
All changes are frontend content and branding updates.

