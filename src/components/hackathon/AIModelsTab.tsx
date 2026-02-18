import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Eye, Mic, MessageSquare, Sparkles, Play, Upload,
  BarChart3, Loader2, CheckCircle2, Code, ChevronRight, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface AIModelsTabProps {
  onViewCode: (code: string) => void;
}

interface AIModel {
  id: string;
  name: string;
  type: 'Image Classifier' | 'Object Detection' | 'Audio' | 'LLM';
  description: string;
  emoji: string;
  color: string;
  pretrained: boolean;
  dataType: string;
  outputExample: string;
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
  },
  {
    id: 'object-detection',
    name: 'Object Detector',
    type: 'Object Detection',
    description: 'Detect and locate multiple objects within an image with bounding boxes.',
    emoji: '🔍',
    color: '#C70110',
    pretrained: true,
    dataType: 'Images (JPG, PNG)',
    outputExample: 'Found: 2 cars, 1 person, 1 dog',
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
  },
];

export const AIModelsTab = ({ onViewCode }: AIModelsTabProps) => {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingDone, setTrainingDone] = useState(false);
  const [accuracy, setAccuracy] = useState(0);

  const handleTrain = async (modelId: string) => {
    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingDone(false);
    setAccuracy(0);

    // Simulate training progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 150));
      setTrainingProgress(i);
    }

    const finalAccuracy = 85 + Math.random() * 13;
    setAccuracy(finalAccuracy);
    setIsTraining(false);
    setTrainingDone(true);
    toast.success(`🎉 Training complete! Accuracy: ${finalAccuracy.toFixed(1)}%`);
  };

  const generateCode = (model: AIModel) => {
    const codeMap: Record<string, string> = {
      'image-classifier': `# 🖼️ Image Classifier — Auto-generated Code
# Trained with ${accuracy.toFixed(1)}% accuracy

import torch
import torchvision
from torchvision import transforms, models
from PIL import Image

# Load pre-trained ResNet18 model
model = models.resnet18(pretrained=True)
model.eval()

# Preprocessing pipeline
transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

def classify(image_path):
    """Classify an image and return predictions."""
    img = Image.open(image_path).convert('RGB')
    tensor = transform(img).unsqueeze(0)
    
    with torch.no_grad():
        outputs = model(tensor)
        probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
        top5 = torch.topk(probabilities, 5)
    
    print("🎯 Top 5 Predictions:")
    for i in range(5):
        print(f"  {i+1}. Class {top5.indices[i].item()}: {top5.values[i].item():.1%}")
    
    return top5

# Usage
# classify("your_image.jpg")
print("✅ Image Classifier ready! Call classify('image.jpg')")
`,
      'object-detection': `# 🔍 Object Detection — Auto-generated Code
# Using YOLOv5 pre-trained model

import torch

# Load YOLOv5 model
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)

def detect_objects(image_path):
    """Detect objects in an image."""
    results = model(image_path)
    
    print("🔍 Detected Objects:")
    for *box, conf, cls in results.xyxy[0]:
        name = results.names[int(cls)]
        print(f"  • {name}: {conf:.1%} confidence")
    
    # Save annotated image
    results.save()
    print("\\n✅ Annotated image saved!")
    return results

# Usage
# detect_objects("your_image.jpg")
print("✅ Object Detector ready! Call detect_objects('image.jpg')")
`,
      'audio-classifier': `# 🎵 Audio Classifier — Auto-generated Code
# Using OpenAI Whisper for speech-to-text

import whisper

# Load Whisper model
model = whisper.load_model("base")

def transcribe(audio_path):
    """Transcribe audio to text."""
    result = model.transcribe(audio_path)
    
    print(f"🌍 Language: {result['language']}")
    print(f"📝 Transcription:\\n{result['text']}")
    
    return result

# Usage
# transcribe("audio.mp3")
print("✅ Audio Classifier ready! Call transcribe('audio.mp3')")
`,
      'text-llm': `# 💬 Text AI (LLM) — Auto-generated Code
# Using LangChain with OpenAI

from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

# Set up the model
llm = OpenAI(temperature=0.7)

# Create a prompt template
prompt = PromptTemplate(
    input_variables=["topic"],
    template="You are a helpful AI tutor. Explain {topic} in simple terms for a high school student."
)

# Create the chain
chain = LLMChain(llm=llm, prompt=prompt)

def ask_ai(topic):
    """Ask the AI about any topic."""
    response = chain.run(topic)
    print(f"🤖 AI says:\\n{response}")
    return response

# Usage
# ask_ai("machine learning")
print("✅ Text AI ready! Call ask_ai('your question')")
`,
    };

    return codeMap[model.id] || '# No code available for this model';
  };

  const model = selectedModel ? AI_MODELS.find(m => m.id === selectedModel) : null;

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
            <p className="text-[hsl(var(--discord-text-muted))]">Select a model, train it, and export the code — no coding needed to start!</p>
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
              onClick={() => { setSelectedModel(m.id); setTrainingDone(false); setTrainingProgress(0); }}
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
        </div>

        {/* Training Area */}
        <div className="lg:col-span-2">
          {!model ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex items-center justify-center text-center p-10"
            >
              <div>
                <Brain className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--discord-text-muted)/0.3)]" />
                <h3 className="text-xl font-bold text-[hsl(var(--discord-text-muted))] mb-2">Select an AI Model</h3>
                <p className="text-[hsl(var(--discord-text-muted)/0.7)]">Pick a model from the left to start training!</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Model Info Card */}
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

                {/* Upload Area */}
                <div className="border-2 border-dashed border-[hsl(var(--discord-light)/0.3)] rounded-xl p-8 text-center mb-4 hover:border-[hsl(var(--discord-blurple)/0.5)] transition-colors cursor-pointer">
                  <Upload className="w-10 h-10 mx-auto mb-3 text-[hsl(var(--discord-text-muted))]" />
                  <p className="text-white font-medium mb-1">Upload your data</p>
                  <p className="text-xs text-[hsl(var(--discord-text-muted))]">
                    Drag & drop {model.dataType} here, or click to browse
                  </p>
                  <p className="text-[10px] text-[hsl(var(--discord-text-muted)/0.5)] mt-2">
                    Or use the pre-trained model with sample data
                  </p>
                </div>

                {/* Train Button */}
                <Button
                  onClick={() => handleTrain(model.id)}
                  disabled={isTraining}
                  className="w-full h-12 text-lg font-bold"
                  style={{ backgroundColor: model.color }}
                >
                  {isTraining ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Training Model...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      Train Model
                    </>
                  )}
                </Button>
              </div>

              {/* Training Progress */}
              {(isTraining || trainingDone) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[hsl(var(--discord-darker))] rounded-xl border border-[hsl(var(--discord-light)/0.2)] p-6"
                >
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    {trainingDone ? (
                      <CheckCircle2 className="w-5 h-5 text-[hsl(var(--discord-green))]" />
                    ) : (
                      <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--discord-blurple))]" />
                    )}
                    {trainingDone ? 'Training Complete!' : 'Training in Progress...'}
                  </h3>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[hsl(var(--discord-text-muted))]">Progress</span>
                      <span className="text-white font-mono">{trainingProgress}%</span>
                    </div>
                    <Progress value={trainingProgress} className="h-3" />
                  </div>

                  {/* Accuracy */}
                  {trainingDone && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[hsl(var(--discord-dark))] rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-[hsl(var(--discord-green))]">{accuracy.toFixed(1)}%</p>
                          <p className="text-xs text-[hsl(var(--discord-text-muted))]">Accuracy</p>
                        </div>
                        <div className="bg-[hsl(var(--discord-dark))] rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-[hsl(var(--discord-blurple))]">100</p>
                          <p className="text-xs text-[hsl(var(--discord-text-muted))]">Epochs</p>
                        </div>
                        <div className="bg-[hsl(var(--discord-dark))] rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-[hsl(var(--discord-yellow))]">{(100 - accuracy).toFixed(1)}%</p>
                          <p className="text-xs text-[hsl(var(--discord-text-muted))]">Error Rate</p>
                        </div>
                      </div>

                      {/* View Code Button */}
                      <Button
                        onClick={() => onViewCode(generateCode(model))}
                        className="w-full h-11 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] text-white font-bold"
                      >
                        <Code className="w-5 h-5 mr-2" />
                        View Generated Python Code
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
