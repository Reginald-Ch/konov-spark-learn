import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Mic, MessageSquare, Sparkles, Upload,
  Loader2, CheckCircle2, Code, ChevronRight, Zap,
  TestTube, Layout, Bot, ArrowRight, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface AIModelsTabProps {
  onViewCode: (code: string) => void;
}

interface AIModel {
  id: string;
  name: string;
  type: string;
  description: string;
  emoji: string;
  color: string;
  pretrained: boolean;
  dataType: string;
  outputExample: string;
  testInputPlaceholder: string;
  testLabels: string[];
}

const AI_MODELS: AIModel[] = [
  {
    id: 'image-classifier',
    name: 'Image Classifier',
    type: 'Image Classifier',
    description: 'Upload images and train a model to recognize objects, animals, or scenes.',
    emoji: '🖼️',
    color: '#006600',
    pretrained: true,
    dataType: 'Images (JPG, PNG)',
    outputExample: 'Cat: 94%, Dog: 5%, Bird: 1%',
    testInputPlaceholder: 'e.g. a photo of a sunflower',
    testLabels: ['Rose', 'Sunflower', 'Daisy', 'Tulip', 'Orchid'],
  },
  {
    id: 'audio-classifier',
    name: 'Audio Classifier',
    type: 'Audio',
    description: 'Classify sounds or transcribe speech to text using Whisper.',
    emoji: '🎵',
    color: '#9B59B6',
    pretrained: true,
    dataType: 'Audio (MP3, WAV)',
    outputExample: '"Hello, welcome to our AI project!"',
    testInputPlaceholder: 'e.g. a recording of someone saying hello',
    testLabels: ['Speech', 'Music', 'Noise', 'Silence'],
  },
  {
    id: 'text-llm',
    name: 'Text AI (LLM)',
    type: 'LLM',
    description: 'Build chatbots, summarizers, or text generators with large language models.',
    emoji: '💬',
    color: '#5865F2',
    pretrained: true,
    dataType: 'Text prompts',
    outputExample: 'Generates human-like responses',
    testInputPlaceholder: 'e.g. "Explain quantum computing simply"',
    testLabels: ['Positive', 'Neutral', 'Negative'],
  },
  {
    id: 'ai-agent',
    name: 'AI Agent',
    type: 'Agent',
    description: 'Build an autonomous agent with tools like search, calculator, and custom actions.',
    emoji: '🤖',
    color: '#E67E22',
    pretrained: true,
    dataType: 'Goals & Tools',
    outputExample: 'Agent reasons, plans, and acts step-by-step',
    testInputPlaceholder: 'e.g. "Find the weather in Lagos and convert to Fahrenheit"',
    testLabels: ['Reasoning', 'Action', 'Observation', 'Final Answer'],
  },
];

type Step = 'select' | 'train' | 'test' | 'build-ui';

interface EpochData {
  epoch: number;
  accuracy: number;
  loss: number;
}

export const AIModelsTab = ({ onViewCode }: AIModelsTabProps) => {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [epochs, setEpochs] = useState<EpochData[]>([]);
  const [finalAccuracy, setFinalAccuracy] = useState(0);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<{ label: string; confidence: number }[] | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [hasTested, setHasTested] = useState(false);
  const [isGeneratingUI, setIsGeneratingUI] = useState(false);
  const [generatedUI, setGeneratedUI] = useState('');

  const model = selectedModel ? AI_MODELS.find(m => m.id === selectedModel) : null;

  const handleSelectModel = (id: string) => {
    setSelectedModel(id);
    setStep('select');
    setEpochs([]);
    setFinalAccuracy(0);
    setTestResult(null);
    setHasTested(false);
    setGeneratedUI('');
  };

  const handleTrain = async () => {
    if (!model) return;
    setIsTraining(true);
    setTrainingProgress(0);
    setEpochs([]);
    setStep('train');

    const totalEpochs = 10;
    const epochData: EpochData[] = [];

    for (let i = 1; i <= totalEpochs; i++) {
      await new Promise(r => setTimeout(r, 300));
      const acc = Math.min(99, 40 + (i / totalEpochs) * 50 + Math.random() * 8);
      const loss = Math.max(0.02, 1.5 - (i / totalEpochs) * 1.4 + (Math.random() - 0.5) * 0.1);
      epochData.push({ epoch: i, accuracy: acc, loss });
      setEpochs([...epochData]);
      setTrainingProgress(Math.round((i / totalEpochs) * 100));
    }

    const final = epochData[epochData.length - 1].accuracy;
    setFinalAccuracy(final);
    setIsTraining(false);
    setStep('test');

    if (final >= 90) {
      toast.success('🎉 Excellent! Accuracy above 90%!');
    } else if (final >= 80) {
      toast.success(`✅ Training complete! Accuracy: ${final.toFixed(1)}%`);
    } else {
      toast('⚠️ Accuracy below 80%. Consider adding more training data.', { icon: '⚠️' });
    }
  };

  const handleTestModel = async () => {
    if (!model) return;
    setIsTesting(true);
    setTestResult(null);

    await new Promise(r => setTimeout(r, 800));

    // Simulate prediction results
    const labels = model.testLabels;
    const primary = Math.random() * 30 + 65;
    const remaining = 100 - primary;
    const others = labels.slice(1).map((_, i, arr) => {
      const share = remaining / arr.length + (Math.random() - 0.5) * 5;
      return Math.max(1, share);
    });
    const total = primary + others.reduce((a, b) => a + b, 0);
    
    const results = [
      { label: labels[0], confidence: (primary / total) * 100 },
      ...others.map((v, i) => ({ label: labels[i + 1], confidence: (v / total) * 100 })),
    ].sort((a, b) => b.confidence - a.confidence);

    setTestResult(results);
    setIsTesting(false);
    setHasTested(true);
    toast.success('🔬 Test complete! Check the prediction results.');
  };

  const handleBuildUI = async () => {
    if (!model) return;
    setStep('build-ui');
    setIsGeneratingUI(true);
    setGeneratedUI('');

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/python-ai-assist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            code: `${model.name} - ${model.description}. Accuracy: ${finalAccuracy.toFixed(1)}%. Data type: ${model.dataType}`,
            model: model.type,
            action: 'generate-ui',
          }),
        }
      );

      if (!resp.ok || !resp.body) {
        toast.error('Failed to generate UI code');
        setIsGeneratingUI(false);
        return;
      }

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
              setGeneratedUI(fullText);
            }
          } catch {
            buffer = jsonStr;
            break;
          }
        }
      }

      setIsGeneratingUI(false);
      toast.success('🎨 Streamlit UI code generated!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to connect to AI');
      setIsGeneratingUI(false);
    }
  };

  const extractCode = (text: string) => {
    const match = text.match(/```python\n([\s\S]*?)```/);
    return match ? match[1] : text;
  };

  const generateModelCode = (m: AIModel) => {
    const codeMap: Record<string, string> = {
      'image-classifier': `# 🖼️ Image Classifier — Accuracy: ${finalAccuracy.toFixed(1)}%
import torch
import torchvision
from torchvision import transforms, models
from PIL import Image

model = models.resnet18(pretrained=True)
model.eval()

transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def classify(image_path):
    img = Image.open(image_path).convert('RGB')
    tensor = transform(img).unsqueeze(0)
    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.nn.functional.softmax(outputs[0], dim=0)
        top5 = torch.topk(probs, 5)
    for i in range(5):
        print(f"  {i+1}. Class {top5.indices[i].item()}: {top5.values[i].item():.1%}")
    return top5

print("✅ Image Classifier ready!")
`,
      'audio-classifier': `# 🎵 Audio Classifier — Accuracy: ${finalAccuracy.toFixed(1)}%
import whisper

model = whisper.load_model("base")

def transcribe(audio_path):
    result = model.transcribe(audio_path)
    print(f"🌍 Language: {result['language']}")
    print(f"📝 Transcription: {result['text']}")
    return result

print("✅ Audio Classifier ready!")
`,
      'text-llm': `# 💬 Text AI (LLM) — Accuracy: ${finalAccuracy.toFixed(1)}%
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

llm = OpenAI(temperature=0.7)
prompt = PromptTemplate(
    input_variables=["topic"],
    template="Explain {topic} in simple terms for a student."
)
chain = LLMChain(llm=llm, prompt=prompt)

def ask_ai(topic):
    response = chain.run(topic)
    print(f"🤖 AI says: {response}")
    return response

print("✅ Text AI ready!")
`,
      'ai-agent': `# 🤖 AI Agent — Accuracy: ${finalAccuracy.toFixed(1)}%
from langchain.agents import initialize_agent, Tool
from langchain.llms import OpenAI
from langchain.tools import DuckDuckGoSearchRun

llm = OpenAI(temperature=0)
search = DuckDuckGoSearchRun()

tools = [
    Tool(name="Search", func=search.run, description="Search the web for info"),
    Tool(name="Calculator", func=lambda x: str(eval(x)), description="Do math"),
]

agent = initialize_agent(tools, llm, agent="zero-shot-react-description", verbose=True)

def run_agent(task):
    result = agent.run(task)
    print(f"🤖 Agent result: {result}")
    return result

print("✅ AI Agent ready!")
`,
    };
    return codeMap[m.id] || '# No code available';
  };

  // Simple bar chart for epochs
  const maxAcc = epochs.length > 0 ? Math.max(...epochs.map(e => e.accuracy)) : 100;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5865F2, #9B59B6)' }}>
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">AI Models</h1>
            <p className="text-[hsl(var(--discord-text-muted))]">Train → Test → Build UI — no coding needed to start!</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Selection */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))] mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Choose a Model
          </h3>
          {AI_MODELS.map((m, i) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleSelectModel(m.id)}
              className={`w-full text-left p-4 rounded-xl transition-all border ${
                selectedModel === m.id
                  ? 'bg-[hsl(var(--discord-light)/0.3)] border-[hsl(var(--discord-blurple)/0.5)]'
                  : 'bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)] hover:border-[hsl(var(--discord-light)/0.4)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{m.emoji}</span>
                <div className="flex-1">
                  <h4 className="font-bold text-white">{m.name}</h4>
                  <p className="text-xs text-[hsl(var(--discord-text-muted))]">{m.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="text-[9px] bg-[hsl(var(--discord-blurple)/0.2)] text-[hsl(var(--discord-blurple))] border-[hsl(var(--discord-blurple)/0.3)]">
                      {m.type}
                    </Badge>
                    {m.pretrained && (
                      <Badge className="text-[9px] bg-green-500/20 text-green-400 border-green-500/30">
                        Pre-trained
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-[hsl(var(--discord-text-muted))] transition-transform ${selectedModel === m.id ? 'rotate-90' : ''}`} />
              </div>
            </motion.button>
          ))}

          {/* Step Indicator */}
          {model && (
            <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--discord-darker))] border border-[hsl(var(--discord-light)/0.2)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))] mb-3">Progress</h4>
              {['Train Model', 'Test Accuracy', 'Build UI'].map((label, i) => {
                const stepMap: Step[] = ['train', 'test', 'build-ui'];
                const currentIdx = stepMap.indexOf(step);
                const isDone = i < currentIdx || (i === currentIdx && step === 'build-ui' && generatedUI);
                const isActive = i === currentIdx;
                return (
                  <div key={label} className="flex items-center gap-3 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone ? 'bg-[hsl(var(--discord-green))] text-white' : 
                      isActive ? 'bg-[hsl(var(--discord-blurple))] text-white' : 
                      'bg-[hsl(var(--discord-light)/0.3)] text-[hsl(var(--discord-text-muted))]'
                    }`}>
                      {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={`text-sm ${isActive ? 'text-white font-semibold' : isDone ? 'text-[hsl(var(--discord-green))]' : 'text-[hsl(var(--discord-text-muted))]'}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Main Area */}
        <div className="lg:col-span-2">
          {!model ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex items-center justify-center text-center p-10">
              <div>
                <Brain className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--discord-text-muted)/0.3)]" />
                <h3 className="text-xl font-bold text-[hsl(var(--discord-text-muted))] mb-2">Select an AI Model</h3>
                <p className="text-[hsl(var(--discord-text-muted)/0.7)]">Pick a model from the left to start training!</p>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {/* STEP: SELECT / TRAIN */}
              {(step === 'select' || step === 'train') && (
                <motion.div key="train-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="bg-[hsl(var(--discord-darker))] rounded-xl border border-[hsl(var(--discord-light)/0.2)] p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-5xl">{model.emoji}</span>
                      <div>
                        <h2 className="text-2xl font-bold text-white">{model.name}</h2>
                        <p className="text-[hsl(var(--discord-text-muted))]">{model.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-[hsl(var(--discord-dark))] rounded-lg p-3">
                        <p className="text-xs text-[hsl(var(--discord-text-muted))] mb-1">Input Data</p>
                        <p className="text-sm font-medium text-white flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          {model.dataType}
                        </p>
                      </div>
                      <div className="bg-[hsl(var(--discord-dark))] rounded-lg p-3">
                        <p className="text-xs text-[hsl(var(--discord-text-muted))] mb-1">Output Example</p>
                        <p className="text-sm font-medium text-white">{model.outputExample}</p>
                      </div>
                    </div>

                    <Button
                      onClick={handleTrain}
                      disabled={isTraining}
                      className="w-full h-12 text-lg font-bold text-white"
                      style={{ backgroundColor: model.color }}
                    >
                      {isTraining ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Training Model...</>
                      ) : (
                        <><Zap className="w-5 h-5 mr-2" /> Train Model</>
                      )}
                    </Button>
                  </div>

                  {/* Epoch Chart */}
                  {epochs.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-[hsl(var(--discord-darker))] rounded-xl border border-[hsl(var(--discord-light)/0.2)] p-6">
                      <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[hsl(var(--discord-blurple))]" />
                        Training Progress — Epoch {epochs.length}/10
                      </h3>
                      <div className="mb-3">
                        <Progress value={trainingProgress} className="h-2" />
                      </div>
                      {/* Mini bar chart */}
                      <div className="flex items-end gap-1 h-24 mb-3">
                        {epochs.map(ep => (
                          <motion.div
                            key={ep.epoch}
                            initial={{ height: 0 }}
                            animate={{ height: `${(ep.accuracy / maxAcc) * 100}%` }}
                            className="flex-1 rounded-t"
                            style={{
                              backgroundColor: ep.accuracy >= 90 ? 'hsl(var(--discord-green))' :
                                ep.accuracy >= 80 ? 'hsl(var(--discord-blurple))' : 'hsl(var(--discord-yellow))',
                              minHeight: '4px'
                            }}
                            title={`Epoch ${ep.epoch}: ${ep.accuracy.toFixed(1)}%`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-[hsl(var(--discord-text-muted))]">
                        <span>Epoch 1</span>
                        <span>Epoch {epochs.length}</span>
                      </div>

                      {!isTraining && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-3 mt-4">
                          <div className="bg-[hsl(var(--discord-dark))] rounded-lg p-3 text-center">
                            <p className={`text-2xl font-bold ${finalAccuracy >= 90 ? 'text-[hsl(var(--discord-green))]' : finalAccuracy >= 80 ? 'text-[hsl(var(--discord-blurple))]' : 'text-[hsl(var(--discord-yellow))]'}`}>
                              {finalAccuracy.toFixed(1)}%
                            </p>
                            <p className="text-xs text-[hsl(var(--discord-text-muted))]">Accuracy</p>
                          </div>
                          <div className="bg-[hsl(var(--discord-dark))] rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-[hsl(var(--discord-blurple))]">10</p>
                            <p className="text-xs text-[hsl(var(--discord-text-muted))]">Epochs</p>
                          </div>
                          <div className="bg-[hsl(var(--discord-dark))] rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-[hsl(var(--discord-yellow))]">
                              {epochs[epochs.length - 1]?.loss.toFixed(3)}
                            </p>
                            <p className="text-xs text-[hsl(var(--discord-text-muted))]">Final Loss</p>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* STEP: TEST */}
              {step === 'test' && (
                <motion.div key="test-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="bg-[hsl(var(--discord-darker))] rounded-xl border border-[hsl(var(--discord-light)/0.2)] p-6">
                    <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                      <TestTube className="w-5 h-5 text-[hsl(var(--discord-blurple))]" />
                      Test Your Model
                    </h3>
                    <p className="text-sm text-[hsl(var(--discord-text-muted))] mb-4">
                      Test your model with sample input to verify accuracy before exporting.
                    </p>

                    <div className="flex gap-3 mb-4">
                      <input
                        type="text"
                        value={testInput}
                        onChange={e => setTestInput(e.target.value)}
                        placeholder={model.testInputPlaceholder}
                        className="flex-1 px-4 py-3 rounded-lg bg-[hsl(var(--discord-dark))] text-white border border-[hsl(var(--discord-light)/0.3)] focus:outline-none focus:border-[hsl(var(--discord-blurple)/0.5)] placeholder:text-[hsl(var(--discord-text-muted)/0.5)]"
                      />
                      <Button
                        onClick={handleTestModel}
                        disabled={isTesting}
                        className="px-6 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] text-white font-bold"
                      >
                        {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><TestTube className="w-4 h-4 mr-2" /> Test</>}
                      </Button>
                    </div>

                    {/* Test Results */}
                    {testResult && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <h4 className="text-sm font-bold text-white">Prediction Results</h4>
                        {testResult.map((r, i) => (
                          <div key={r.label} className="flex items-center gap-3">
                            <span className="text-sm text-white w-24 truncate">{r.label}</span>
                            <div className="flex-1 bg-[hsl(var(--discord-dark))] rounded-full h-6 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${r.confidence}%` }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="h-full rounded-full flex items-center justify-end pr-2"
                                style={{
                                  backgroundColor: i === 0 ? 'hsl(var(--discord-green))' : 'hsl(var(--discord-blurple))',
                                  opacity: i === 0 ? 1 : 0.5
                                }}
                              >
                                <span className="text-[10px] font-bold text-white">{r.confidence.toFixed(1)}%</span>
                              </motion.div>
                            </div>
                          </div>
                        ))}

                        {testResult[0].confidence >= 60 && (
                          <p className="text-sm text-[hsl(var(--discord-green))] flex items-center gap-1 mt-2">
                            <CheckCircle2 className="w-4 h-4" /> Model is confident! Ready to export or build UI.
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Actions after testing */}
                  {hasTested && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                      <Button
                        onClick={() => onViewCode(generateModelCode(model))}
                        className="flex-1 h-11 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] text-white font-bold"
                      >
                        <Code className="w-5 h-5 mr-2" />
                        Export Python Code
                      </Button>
                      <Button
                        onClick={handleBuildUI}
                        className="flex-1 h-11 font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #E67E22, #F39C12)' }}
                      >
                        <Layout className="w-5 h-5 mr-2" />
                        Build Web UI
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* STEP: BUILD UI */}
              {step === 'build-ui' && (
                <motion.div key="ui-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="bg-[hsl(var(--discord-darker))] rounded-xl border border-[hsl(var(--discord-light)/0.2)] p-6">
                    <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                      <Layout className="w-5 h-5" style={{ color: '#E67E22' }} />
                      Build Web UI — Streamlit App
                    </h3>
                    <p className="text-sm text-[hsl(var(--discord-text-muted))] mb-4">
                      Auto-generated Streamlit web app for your {model.name}. Copy this code and run <code className="text-[hsl(var(--discord-blurple))]">streamlit run app.py</code>
                    </p>

                    {isGeneratingUI && !generatedUI && (
                      <div className="flex items-center gap-3 py-8 justify-center text-[hsl(var(--discord-text-muted))]">
                        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--discord-blurple))]" />
                        <span>Generating your Streamlit app...</span>
                      </div>
                    )}

                    {generatedUI && (
                      <div className="bg-[hsl(var(--discord-dark))] rounded-lg p-4 max-h-[400px] overflow-y-auto">
                        <div className="prose prose-invert prose-sm max-w-none text-sm">
                          <ReactMarkdown>{generatedUI}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>

                  {generatedUI && !isGeneratingUI && (
                    <div className="flex gap-3">
                      <Button
                        onClick={() => onViewCode(extractCode(generatedUI))}
                        className="flex-1 h-11 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] text-white font-bold"
                      >
                        <Code className="w-5 h-5 mr-2" />
                        Open in IDE
                      </Button>
                      <Button
                        onClick={() => onViewCode(generateModelCode(model))}
                        variant="outline"
                        className="flex-1 h-11 font-bold"
                      >
                        <Code className="w-5 h-5 mr-2" />
                        View Model Code
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};
