import { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PublishModal } from './PublishModal';
import { 
  Code, Maximize2, Minimize2, Play, Sparkles, 
  Brain, MessageSquare, Lightbulb, ExternalLink,
  ChevronDown, Loader2, Copy, Check, Trash2,
  Rocket, Send, X
} from 'lucide-react';
import { toast } from 'sonner';

interface CodePlaygroundProps {
  initialCode?: string;
  initialTemplate?: string;
}

const AI_MODELS = [
  { id: 'langchain', name: 'LangChain', category: 'NLP', icon: '🔗', starter: `# LangChain Chatbot Starter\nfrom langchain.llms import OpenAI\nfrom langchain.prompts import PromptTemplate\n\nllm = OpenAI(temperature=0.7)\nprompt = PromptTemplate(\n    input_variables=["topic"],\n    template="Tell me something cool about {topic}"\n)\n\nresult = llm(prompt.format(topic="space"))\nprint(result)` },
  { id: 'pytorch', name: 'PyTorch', category: 'Vision', icon: '🔥', starter: `# PyTorch Image Classifier\nimport torch\nimport torchvision\nfrom torchvision import transforms, models\n\nmodel = models.resnet18(pretrained=True)\nmodel.eval()\n\ntransform = transforms.Compose([\n    transforms.Resize(256),\n    transforms.CenterCrop(224),\n    transforms.ToTensor(),\n    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])\n])\n\nprint("✅ Model loaded! Ready to classify images.")` },
  { id: 'huggingface', name: 'Hugging Face', category: 'NLP', icon: '🤗', starter: `# Hugging Face Sentiment Analysis\nfrom transformers import pipeline\n\nsentiment = pipeline("sentiment-analysis")\n\ntexts = ["I love AI!", "This is frustrating.", "Nice weather today."]\nfor text in texts:\n    result = sentiment(text)[0]\n    emoji = "😊" if result["label"] == "POSITIVE" else "😞"\n    print(f'{emoji} "{text}" → {result["label"]} ({result["score"]:.1%})')` },
  { id: 'sklearn', name: 'scikit-learn', category: 'Data', icon: '📊', starter: `# scikit-learn ML Predictor\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.metrics import accuracy_score\n\niris = load_iris()\nX_train, X_test, y_train, y_test = train_test_split(iris.data, iris.target, test_size=0.3)\n\nmodel = RandomForestClassifier(n_estimators=100)\nmodel.fit(X_train, y_train)\n\naccuracy = accuracy_score(y_test, model.predict(X_test))\nprint(f"🎯 Accuracy: {accuracy:.1%}")` },
  { id: 'whisper', name: 'Whisper', category: 'Audio', icon: '🎙️', starter: `# OpenAI Whisper Speech-to-Text\nimport whisper\n\nmodel = whisper.load_model("tiny")\nresult = model.transcribe("audio.mp3")\n\nprint("📝 Transcription:")\nprint(result["text"])` },
  { id: 'stable-diffusion', name: 'Stable Diffusion', category: 'GenAI', icon: '🎨', starter: `# Stable Diffusion Text-to-Image\nfrom diffusers import StableDiffusionPipeline\nimport torch\n\npipe = StableDiffusionPipeline.from_pretrained("runwayml/stable-diffusion-v1-5", torch_dtype=torch.float16)\npipe = pipe.to("cuda")\n\nimage = pipe("a cute robot painting, digital art").images[0]\nimage.save("ai_art.png")\nprint("🎨 Image saved!")` },
];

const STARTER_CODE = `# 🐍 Python AI Lab — Start coding!
# Pick an AI model from the sidebar,
# or write your own Python AI project here.

print("Hello, AI World! 🤖")

# Quick start:
# 1. Select an AI model from the left
# 2. Click "AI Help" for coding assistance
# 3. Click "Open in Colab" to run with GPU
# 4. Click "Publish" to share your project!
`;

export const CodePlayground = ({ initialCode, initialTemplate }: CodePlaygroundProps) => {
  const [code, setCode] = useState(initialCode || STARTER_CODE);
  const [selectedModel, setSelectedModel] = useState<string | null>(initialTemplate || null);
  const [showModels, setShowModels] = useState(true);
  const [aiOutput, setAiOutput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeAiAction, setActiveAiAction] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [ideaInput, setIdeaInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleModelSelect = (modelId: string) => {
    const model = AI_MODELS.find(m => m.id === modelId);
    if (model) {
      setCode(model.starter);
      setSelectedModel(modelId);
      setAiOutput('');
      toast.success(`${model.icon} ${model.name} template loaded!`);
    }
  };

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copied!');
  }, [code]);

  const handleOpenInColab = () => {
    window.open('https://colab.research.google.com/#create=true', '_blank');
    toast.success('Opening Google Colab — paste your code there!');
  };

  const abortRef = useRef<AbortController | null>(null);

  const handleAiAssist = async (action: string, customInput?: string) => {
    const input = customInput || code;
    if (!input.trim()) {
      toast.error('Write some code or describe your idea first!');
      return;
    }

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsAiLoading(true);
    setActiveAiAction(action);
    setAiOutput('');

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/python-ai-assist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ code: input, model: selectedModel, action }),
          signal: controller.signal,
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'AI service error' }));
        toast.error(err.error || 'AI service error');
        setIsAiLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let streamDone = false;
      let parseRetries = 0;
      const MAX_PARSE_RETRIES = 3;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        parseRetries = 0; // Reset retries on new data

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAiOutput(fullText);
            }
            parseRetries = 0;
          } catch {
            parseRetries++;
            if (parseRetries >= MAX_PARSE_RETRIES) {
              // Skip genuinely malformed line after retries
              console.warn('Skipping malformed SSE line:', line.slice(0, 100));
              parseRetries = 0;
            } else {
              // Partial JSON - put back and wait for more data
              buffer = line + '\n' + buffer;
              break;
            }
          }
        }
      }

      // For idea-to-code, load generated code into editor
      if (action === 'idea-to-code' && fullText) {
        const codeMatch = fullText.match(/```python\n([\s\S]*?)```/);
        if (codeMatch) {
          setCode(codeMatch[1]);
          toast.success('✨ Code generated from your idea!');
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return; // User triggered new action
      console.error(e);
      toast.error('Failed to connect to AI assistant');
    } finally {
      setIsAiLoading(false);
      setActiveAiAction(null);
      abortRef.current = null;
    }
  };

  const handleIdeaSubmit = () => {
    if (!ideaInput.trim()) return;
    handleAiAssist('idea-to-code', ideaInput);
    setIdeaInput('');
  };

  const currentModel = AI_MODELS.find(m => m.id === selectedModel);

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--discord-darker))]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(var(--discord-dark))] border-b border-[hsl(var(--discord-light)/0.3)]">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-[hsl(var(--discord-blurple))]" />
          <span className="font-bold text-sm text-white">Python AI Lab</span>
          {currentModel && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--discord-blurple)/0.2)] text-[hsl(var(--discord-blurple))] border border-[hsl(var(--discord-blurple)/0.3)]">
              {currentModel.icon} {currentModel.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleCopyCode} className="h-7 w-7 text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light))]">
            {copied ? <Check className="w-3.5 h-3.5 text-[hsl(var(--discord-green))]" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <Button
            size="sm"
            onClick={handleOpenInColab}
            className="h-7 text-xs bg-[hsl(38,100%,50%)] hover:bg-[hsl(38,100%,45%)] text-black font-semibold"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Open in Colab
          </Button>
          <Button
            size="sm"
            onClick={() => setPublishOpen(true)}
            className="h-7 text-xs font-bold text-white bg-primary hover:bg-primary/90"
          >
            <Rocket className="w-3 h-3 mr-1" />
            Publish
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Model Selector */}
        <AnimatePresence>
          {showModels && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-[hsl(var(--discord-light)/0.3)] bg-[hsl(var(--discord-dark))] overflow-y-auto flex-shrink-0"
            >
              <div className="p-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))] mb-3 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  AI Models
                </h3>
                <div className="space-y-1">
                  {AI_MODELS.map(model => (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      className={`w-full text-left p-2 rounded-lg transition-all text-xs ${
                        selectedModel === model.id
                          ? 'bg-[hsl(var(--discord-blurple)/0.2)] border border-[hsl(var(--discord-blurple)/0.4)]'
                          : 'hover:bg-[hsl(var(--discord-light)/0.4)] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{model.icon}</span>
                        <div>
                          <span className={`font-semibold block ${selectedModel === model.id ? 'text-white' : 'text-[hsl(var(--discord-text))]'}`}>
                            {model.name}
                          </span>
                          <span className="text-[9px] text-[hsl(var(--discord-text-muted))]">{model.category}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Idea to Code */}
                <div className="mt-4 pt-3 border-t border-[hsl(var(--discord-light)/0.2)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))] mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Idea → Code
                  </h3>
                  <div className="relative">
                    <textarea
                      value={ideaInput}
                      onChange={e => setIdeaInput(e.target.value)}
                      placeholder="Describe your AI idea..."
                      rows={3}
                      className="w-full text-xs p-2 rounded-lg bg-[hsl(var(--discord-darker))] text-[hsl(var(--discord-text))] border border-[hsl(var(--discord-light)/0.3)] resize-none focus:outline-none focus:border-[hsl(var(--discord-blurple)/0.5)] placeholder:text-[hsl(var(--discord-text-muted)/0.5)]"
                    />
                    <Button
                      size="icon"
                      onClick={handleIdeaSubmit}
                      disabled={isAiLoading || !ideaInput.trim()}
                      className="absolute bottom-2 right-2 h-6 w-6 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]"
                    >
                      {isAiLoading && activeAiAction === 'idea-to-code' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center: Code Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Action Bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--discord-dark)/0.5)] border-b border-[hsl(var(--discord-light)/0.2)] flex-wrap">
            <Button
              size="sm"
              onClick={() => setShowModels(!showModels)}
              variant="ghost"
              className="h-7 text-xs text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light))]"
            >
              <Brain className="w-3.5 h-3.5 mr-1" />
              Models
              <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showModels ? 'rotate-180' : ''}`} />
            </Button>

            <div className="h-4 w-px bg-[hsl(var(--discord-light)/0.3)]" />

            <Button size="sm" onClick={() => handleAiAssist('review')} disabled={isAiLoading}
              className="h-7 text-xs bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] text-white">
              {isAiLoading && activeAiAction === 'review' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
              Review
            </Button>
            <Button size="sm" onClick={() => handleAiAssist('explain')} disabled={isAiLoading} variant="ghost"
              className="h-7 text-xs text-[hsl(var(--discord-text))] hover:text-white hover:bg-[hsl(var(--discord-light))]">
              {isAiLoading && activeAiAction === 'explain' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <MessageSquare className="w-3 h-3 mr-1" />}
              Explain
            </Button>
            <Button size="sm" onClick={() => handleAiAssist('suggest')} disabled={isAiLoading} variant="ghost"
              className="h-7 text-xs text-[hsl(var(--discord-text))] hover:text-white hover:bg-[hsl(var(--discord-light))]">
              {isAiLoading && activeAiAction === 'suggest' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Lightbulb className="w-3 h-3 mr-1" />}
              Suggest
            </Button>

            <div className="flex-1" />

            <Button size="sm" onClick={() => { setCode(STARTER_CODE); setSelectedModel(null); setAiOutput(''); }} variant="ghost"
              className="h-7 text-xs text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light))]">
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>

          {/* Editor + Output Split */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Code Editor */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-3 py-1.5 text-[10px] font-mono text-[hsl(var(--discord-text-muted))] bg-[hsl(var(--discord-darker))] border-b border-[hsl(var(--discord-light)/0.1)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[hsl(var(--discord-green))]" />
                main.py
              </div>
              <div className="flex-1 relative min-h-0">
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  spellCheck={false}
                  className="absolute inset-0 w-full h-full resize-none bg-[hsl(var(--discord-darker))] text-[hsl(var(--discord-text))] font-mono text-sm p-4 leading-6 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--discord-blurple)/0.5)] placeholder:text-[hsl(var(--discord-text-muted)/0.5)]"
                  placeholder="# Start writing Python code..."
                />
              </div>
            </div>

            {/* AI Output Panel */}
            {aiOutput && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '40%', opacity: 1 }}
                className="border-l border-[hsl(var(--discord-light)/0.3)] flex flex-col min-h-0 max-md:border-l-0 max-md:border-t max-md:w-full max-md:h-[40%]"
              >
                <div className="px-3 py-1.5 text-[10px] font-mono text-[hsl(var(--discord-text-muted))] bg-[hsl(var(--discord-dark))] border-b border-[hsl(var(--discord-light)/0.1)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-[hsl(var(--discord-blurple))]" />
                    AI Mentor
                    {isAiLoading && <Loader2 className="w-3 h-3 animate-spin text-[hsl(var(--discord-blurple))]" />}
                  </div>
                  <button onClick={() => setAiOutput('')} className="hover:text-white transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="prose prose-invert prose-sm max-w-none text-[hsl(var(--discord-text))] text-sm leading-relaxed">
                    <ReactMarkdown
                      components={{
                        code: ({ children, className }) => {
                          const isBlock = className?.includes('language-');
                          return isBlock ? (
                            <pre className="bg-[hsl(var(--discord-darker))] rounded-lg p-3 overflow-x-auto my-2">
                              <code className="text-xs font-mono text-[hsl(var(--discord-green))]">{children}</code>
                            </pre>
                          ) : (
                            <code className="bg-[hsl(var(--discord-light)/0.3)] px-1.5 py-0.5 rounded text-xs font-mono text-[hsl(var(--discord-blurple))]">{children}</code>
                          );
                        },
                        pre: ({ children }) => <>{children}</>,
                      }}
                    >
                      {aiOutput}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <PublishModal
        isOpen={publishOpen}
        onClose={() => setPublishOpen(false)}
        code={code}
        templateId={selectedModel}
      />
    </div>
  );
};
