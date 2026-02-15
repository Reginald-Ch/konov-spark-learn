import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Code, Maximize2, Minimize2, X, Play, Sparkles, 
  Brain, MessageSquare, Lightbulb, ExternalLink,
  ChevronDown, Loader2, Copy, Check, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface CodePlaygroundProps {
  isOpen: boolean;
  onClose: () => void;
}

const AI_MODELS = [
  { id: 'langchain', name: 'LangChain', category: 'NLP', description: 'Build chatbots & document Q&A', icon: '🔗', starter: `# LangChain Chatbot Starter\nfrom langchain.llms import OpenAI\nfrom langchain.prompts import PromptTemplate\n\n# Set up your model\nllm = OpenAI(temperature=0.7)\n\n# Create a prompt template\nprompt = PromptTemplate(\n    input_variables=["topic"],\n    template="Tell me something cool about {topic}"\n)\n\n# Run the chain\nresult = llm(prompt.format(topic="space"))\nprint(result)` },
  { id: 'pytorch', name: 'PyTorch', category: 'Vision', description: 'Image classification & neural networks', icon: '🔥', starter: `# PyTorch Image Classifier\nimport torch\nimport torchvision\nfrom torchvision import transforms, models\n\n# Load a pre-trained model\nmodel = models.resnet18(pretrained=True)\nmodel.eval()\n\n# Transform your image\ntransform = transforms.Compose([\n    transforms.Resize(256),\n    transforms.CenterCrop(224),\n    transforms.ToTensor(),\n    transforms.Normalize(\n        mean=[0.485, 0.456, 0.406],\n        std=[0.229, 0.224, 0.225]\n    )\n])\n\nprint("✅ Model loaded! Ready to classify images.")` },
  { id: 'huggingface', name: 'Hugging Face', category: 'NLP', description: 'Sentiment analysis & text generation', icon: '🤗', starter: `# Hugging Face Sentiment Analysis\nfrom transformers import pipeline\n\n# Load pre-trained sentiment model\nsentiment = pipeline("sentiment-analysis")\n\n# Analyze some text\ntexts = [\n    "I love building AI projects!",\n    "This is really frustrating.",\n    "The weather is nice today."\n]\n\nfor text in texts:\n    result = sentiment(text)[0]\n    emoji = "😊" if result["label"] == "POSITIVE" else "😞"\n    print(f'{emoji} "{text}"')\n    print(f'   → {result["label"]} ({result["score"]:.1%})\\n')` },
  { id: 'sklearn', name: 'scikit-learn', category: 'Data', description: 'ML predictions & data analysis', icon: '📊', starter: `# scikit-learn ML Predictor\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.metrics import accuracy_score\n\n# Load dataset\niris = load_iris()\nX_train, X_test, y_train, y_test = train_test_split(\n    iris.data, iris.target, test_size=0.3, random_state=42\n)\n\n# Train the model\nmodel = RandomForestClassifier(n_estimators=100)\nmodel.fit(X_train, y_train)\n\n# Make predictions\npredictions = model.predict(X_test)\naccuracy = accuracy_score(y_test, predictions)\n\nprint(f"🎯 Model Accuracy: {accuracy:.1%}")\nprint(f"📈 Trained on {len(X_train)} samples")\nprint(f"🧪 Tested on {len(X_test)} samples")` },
  { id: 'whisper', name: 'Whisper', category: 'Audio', description: 'Speech-to-text transcription', icon: '🎙️', starter: `# OpenAI Whisper - Speech to Text\nimport whisper\n\n# Load the model (tiny is fastest)\nmodel = whisper.load_model("tiny")\n\n# Transcribe an audio file\nresult = model.transcribe("audio.mp3")\n\nprint("📝 Transcription:")\nprint(result["text"])\n\n# You can also detect the language\nprint(f"\\n🌍 Detected language: {result['language']}")` },
  { id: 'stable-diffusion', name: 'Stable Diffusion', category: 'GenAI', description: 'Generate images from text prompts', icon: '🎨', starter: `# Stable Diffusion - Text to Image\nfrom diffusers import StableDiffusionPipeline\nimport torch\n\n# Load the model\npipe = StableDiffusionPipeline.from_pretrained(\n    "runwayml/stable-diffusion-v1-5",\n    torch_dtype=torch.float16\n)\npipe = pipe.to("cuda")  # Use GPU\n\n# Generate an image\nprompt = "a cute robot painting on a canvas, digital art"\nimage = pipe(prompt).images[0]\n\n# Save the image\nimage.save("ai_art.png")\nprint("🎨 Image generated and saved!")` },
];

const STARTER_CODE = `# 🐍 Python AI Lab — Start coding!\n# Pick an AI model above to load starter code,\n# or write your own Python AI project here.\n\nprint("Hello, AI World! 🤖")\n\n# Try these:\n# 1. Select an AI model from the panel\n# 2. Click "AI Help" to get coding assistance\n# 3. Click "Open in Colab" to run with GPU\n`;

export const CodePlayground = ({ isOpen, onClose }: CodePlaygroundProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [code, setCode] = useState(STARTER_CODE);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [showModels, setShowModels] = useState(true);
  const [aiOutput, setAiOutput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeAiAction, setActiveAiAction] = useState<string | null>(null);
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
    const encoded = encodeURIComponent(code);
    window.open(`https://colab.research.google.com/#create=true`, '_blank');
    toast.success('Opening Google Colab — paste your code there!');
  };

  const handleAiAssist = async (action: string) => {
    if (!code.trim()) {
      toast.error('Write some code first!');
      return;
    }
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
          body: JSON.stringify({ code, model: selectedModel, action }),
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAiOutput(fullText);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to connect to AI assistant');
    } finally {
      setIsAiLoading(false);
      setActiveAiAction(null);
    }
  };

  const currentModel = AI_MODELS.find(m => m.id === selectedModel);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton
        className={`bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white p-0 overflow-hidden ${
          isFullscreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none'
            : 'sm:max-w-[95vw] sm:max-h-[92vh] h-[88vh] w-[95vw]'
        }`}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[hsl(var(--discord-dark))] border-b border-[hsl(var(--discord-light)/0.3)]">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-[hsl(var(--discord-blurple))]" />
            <span className="font-bold text-sm">Python AI Lab</span>
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
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} className="h-7 w-7 text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light))]">
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light))]">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 h-[calc(100%-40px)] overflow-hidden">
          {/* Left: Model Selector Panel */}
          <AnimatePresence>
            {showModels && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 220, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-r border-[hsl(var(--discord-light)/0.3)] bg-[hsl(var(--discord-dark))] overflow-y-auto flex-shrink-0"
              >
                <div className="p-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))] mb-3 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" />
                    AI Models
                  </h3>
                  <div className="space-y-1.5">
                    {AI_MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleModelSelect(model.id)}
                        className={`w-full text-left p-2.5 rounded-lg transition-all text-xs group ${
                          selectedModel === model.id
                            ? 'bg-[hsl(var(--discord-blurple)/0.2)] border border-[hsl(var(--discord-blurple)/0.4)]'
                            : 'hover:bg-[hsl(var(--discord-light)/0.4)] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-base">{model.icon}</span>
                          <span className={`font-semibold ${selectedModel === model.id ? 'text-white' : 'text-[hsl(var(--discord-text))]'}`}>
                            {model.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-[hsl(var(--discord-text-muted))] leading-tight ml-6">
                          {model.description}
                        </p>
                        <span className="inline-block mt-1 ml-6 text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--discord-light)/0.5)] text-[hsl(var(--discord-text-muted))]">
                          {model.category}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Center: Code Editor + AI Output */}
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

              <Button
                size="sm"
                onClick={() => handleAiAssist('review')}
                disabled={isAiLoading}
                className="h-7 text-xs bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] text-white"
              >
                {isAiLoading && activeAiAction === 'review' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Review
              </Button>
              <Button
                size="sm"
                onClick={() => handleAiAssist('explain')}
                disabled={isAiLoading}
                variant="ghost"
                className="h-7 text-xs text-[hsl(var(--discord-text))] hover:text-white hover:bg-[hsl(var(--discord-light))]"
              >
                {isAiLoading && activeAiAction === 'explain' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <MessageSquare className="w-3 h-3 mr-1" />}
                Explain
              </Button>
              <Button
                size="sm"
                onClick={() => handleAiAssist('suggest')}
                disabled={isAiLoading}
                variant="ghost"
                className="h-7 text-xs text-[hsl(var(--discord-text))] hover:text-white hover:bg-[hsl(var(--discord-light))]"
              >
                {isAiLoading && activeAiAction === 'suggest' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Lightbulb className="w-3 h-3 mr-1" />}
                Suggest
              </Button>

              <div className="flex-1" />

              <Button
                size="sm"
                onClick={() => { setCode(STARTER_CODE); setSelectedModel(null); setAiOutput(''); }}
                variant="ghost"
                className="h-7 text-xs text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light))]"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleOpenInColab}
                className="h-7 text-xs bg-[hsl(38,100%,50%)] hover:bg-[hsl(38,100%,45%)] text-black font-semibold"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open in Colab
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
                    onChange={(e) => setCode(e.target.value)}
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
                      AI Assistant
                      {isAiLoading && <Loader2 className="w-3 h-3 animate-spin text-[hsl(var(--discord-blurple))]" />}
                    </div>
                    <button onClick={() => setAiOutput('')} className="hover:text-white transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 text-sm text-[hsl(var(--discord-text))] leading-relaxed whitespace-pre-wrap font-mono bg-[hsl(var(--discord-darker))]">
                    {aiOutput}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
