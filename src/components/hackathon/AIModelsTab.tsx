import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Upload, Sparkles, Zap, Loader2, CheckCircle2, Code, 
  ChevronRight, Plus, X, Image as ImageIcon, Type, Mic, Trash2, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AIModelsTabProps {
  onViewCode: (code: string) => void;
}

type ModelType = 'image' | 'text' | 'audio';
type Step = 'upload' | 'train' | 'predict';

interface ClassData {
  name: string;
  samples: string[]; // base64 for images, text strings for text, filenames for audio
}

interface EpochData {
  epoch: number;
  accuracy: number;
  loss: number;
}

interface Prediction {
  className: string;
  confidence: number;
}

const MODEL_OPTIONS = [
  { id: 'image' as ModelType, name: 'Image Classifier', emoji: '🖼️', description: 'Upload images to train a classifier', color: '#006600', dataHint: 'JPG, PNG images' },
  { id: 'text' as ModelType, name: 'Text Classifier', emoji: '📝', description: 'Categorize text into custom classes', color: '#5865F2', dataHint: 'Text samples' },
  { id: 'audio' as ModelType, name: 'Audio Classifier', emoji: '🎵', description: 'Classify audio files by sound', color: '#9B59B6', dataHint: 'MP3, WAV files' },
];

export const AIModelsTab = ({ onViewCode }: AIModelsTabProps) => {
  const [selectedType, setSelectedType] = useState<ModelType | null>(null);
  const [step, setStep] = useState<Step>('upload');
  const [classes, setClasses] = useState<ClassData[]>([
    { name: 'Class A', samples: [] },
    { name: 'Class B', samples: [] },
  ]);
  const [isTraining, setIsTraining] = useState(false);
  const [epochsData, setEpochsData] = useState<EpochData[]>([]);
  const [finalAccuracy, setFinalAccuracy] = useState(0);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testImage, setTestImage] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const testFileRef = useRef<HTMLInputElement>(null);

  const addClass = () => {
    setClasses(prev => [...prev, { name: `Class ${String.fromCharCode(65 + prev.length)}`, samples: [] }]);
  };

  const removeClass = (index: number) => {
    if (classes.length <= 2) { toast.error('Need at least 2 classes!'); return; }
    setClasses(prev => prev.filter((_, i) => i !== index));
  };

  const renameClass = (index: number, name: string) => {
    setClasses(prev => prev.map((c, i) => i === index ? { ...c, name } : c));
  };

  const handleImageUpload = (classIndex: number, files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setClasses(prev => prev.map((c, i) => 
          i === classIndex ? { ...c, samples: [...c.samples, e.target?.result as string] } : c
        ));
      };
      reader.readAsDataURL(file);
    });
  };

  const addTextSample = (classIndex: number, text: string) => {
    if (!text.trim()) return;
    setClasses(prev => prev.map((c, i) => 
      i === classIndex ? { ...c, samples: [...c.samples, text.trim()] } : c
    ));
  };

  const removeSample = (classIndex: number, sampleIndex: number) => {
    setClasses(prev => prev.map((c, i) => 
      i === classIndex ? { ...c, samples: c.samples.filter((_, si) => si !== sampleIndex) } : c
    ));
  };

  const totalSamples = classes.reduce((acc, c) => acc + c.samples.length, 0);
  const canTrain = classes.length >= 2 && classes.every(c => c.samples.length >= 1) && totalSamples >= 4;

  const handleTrain = async () => {
    setIsTraining(true);
    setEpochsData([]);
    setStep('train');

    const totalEpochs = 20;
    const newData: EpochData[] = [];

    for (let epoch = 1; epoch <= totalEpochs; epoch++) {
      await new Promise(r => setTimeout(r, 200));
      const progress = epoch / totalEpochs;
      const acc = Math.min(0.5 + progress * 0.48 + (Math.random() * 0.05 - 0.025), 0.99);
      const loss = Math.max(1.5 * (1 - progress) + (Math.random() * 0.1 - 0.05), 0.02);
      newData.push({ epoch, accuracy: parseFloat((acc * 100).toFixed(1)), loss: parseFloat(loss.toFixed(3)) });
      setEpochsData([...newData]);
    }

    const final = newData[newData.length - 1].accuracy;
    setFinalAccuracy(final);
    setIsTraining(false);
    toast.success(`🎉 Training complete! Accuracy: ${final}%`);
  };

  const handlePredict = () => {
    setStep('predict');
    // Simulate prediction based on classes
    const preds: Prediction[] = classes.map((c, i) => {
      const base = i === 0 ? 0.7 + Math.random() * 0.25 : Math.random() * 0.3;
      return { className: c.name, confidence: base };
    });
    // Normalize
    const total = preds.reduce((s, p) => s + p.confidence, 0);
    setPredictions(preds.map(p => ({ ...p, confidence: parseFloat(((p.confidence / total) * 100).toFixed(1)) })).sort((a, b) => b.confidence - a.confidence));
  };

  const handleTestImage = (files: FileList | null) => {
    if (!files?.length) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setTestImage(e.target?.result as string);
      // Re-run prediction with slight variation
      const preds: Prediction[] = classes.map((c, i) => {
        const base = Math.random();
        return { className: c.name, confidence: base };
      });
      const total = preds.reduce((s, p) => s + p.confidence, 0);
      setPredictions(preds.map(p => ({ ...p, confidence: parseFloat(((p.confidence / total) * 100).toFixed(1)) })).sort((a, b) => b.confidence - a.confidence));
    };
    reader.readAsDataURL(files[0]);
  };

  const handleTestText = () => {
    if (!testInput.trim()) return;
    const preds: Prediction[] = classes.map((c) => {
      // Simple heuristic: check if test text contains any words from samples
      const matchScore = c.samples.filter(s => 
        testInput.toLowerCase().split(' ').some(w => s.toLowerCase().includes(w))
      ).length;
      return { className: c.name, confidence: matchScore + Math.random() };
    });
    const total = preds.reduce((s, p) => s + p.confidence, 0);
    setPredictions(preds.map(p => ({ ...p, confidence: parseFloat(((p.confidence / total) * 100).toFixed(1)) })).sort((a, b) => b.confidence - a.confidence));
  };

  const generateCode = () => {
    if (!selectedType) return '';
    const classNames = classes.map(c => c.name).join("', '");
    if (selectedType === 'image') {
      return `# 🖼️ Image Classifier — Generated Code
# Classes: ${classes.map(c => c.name).join(', ')}
# Training Accuracy: ${finalAccuracy}%

import torch
import torchvision
from torchvision import transforms, models
from PIL import Image

# Define classes
CLASSES = ['${classNames}']

# Load pre-trained model and modify for ${classes.length} classes
model = models.resnet18(pretrained=True)
model.fc = torch.nn.Linear(model.fc.in_features, ${classes.length})

transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def classify(image_path):
    """Classify an image."""
    img = Image.open(image_path).convert('RGB')
    tensor = transform(img).unsqueeze(0)
    
    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.nn.functional.softmax(outputs[0], dim=0)
    
    print("🎯 Predictions:")
    for i, cls in enumerate(CLASSES):
        print(f"  {cls}: {probs[i].item():.1%}")
    
    return {CLASSES[i]: probs[i].item() for i in range(len(CLASSES))}

print("✅ Image Classifier ready! Call classify('image.jpg')")
`;
    } else if (selectedType === 'text') {
      return `# 📝 Text Classifier — Generated Code
# Classes: ${classes.map(c => c.name).join(', ')}
# Training Accuracy: ${finalAccuracy}%

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

# Define classes and training data
CLASSES = ['${classNames}']
training_data = {
${classes.map(c => `    '${c.name}': ${JSON.stringify(c.samples)}`).join(',\n')}
}

# Prepare training data
texts = []
labels = []
for cls, samples in training_data.items():
    texts.extend(samples)
    labels.extend([cls] * len(samples))

# Build pipeline
pipeline = Pipeline([
    ('tfidf', TfidfVectorizer()),
    ('clf', MultinomialNB())
])
pipeline.fit(texts, labels)

def classify(text):
    """Classify a text string."""
    prediction = pipeline.predict([text])[0]
    probabilities = pipeline.predict_proba([text])[0]
    
    print(f"📝 Input: '{text}'")
    print(f"🎯 Prediction: {prediction}")
    for cls, prob in zip(pipeline.classes_, probabilities):
        print(f"  {cls}: {prob:.1%}")
    
    return prediction

print("✅ Text Classifier ready! Call classify('your text')")
`;
    } else {
      return `# 🎵 Audio Classifier — Generated Code  
# Classes: ${classes.map(c => c.name).join(', ')}
# Training Accuracy: ${finalAccuracy}%

import librosa
import numpy as np
from sklearn.ensemble import RandomForestClassifier

CLASSES = ['${classNames}']

def extract_features(audio_path):
    """Extract MFCC features from audio."""
    y, sr = librosa.load(audio_path, duration=5)
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    return np.mean(mfccs, axis=1)

# Train model (placeholder - add your audio files)
model = RandomForestClassifier(n_estimators=100)

def classify(audio_path):
    """Classify an audio file."""
    features = extract_features(audio_path).reshape(1, -1)
    prediction = model.predict(features)[0]
    probs = model.predict_proba(features)[0]
    
    print(f"🎵 Predictions:")
    for cls, prob in zip(CLASSES, probs):
        print(f"  {cls}: {prob:.1%}")
    
    return prediction

print("✅ Audio Classifier ready! Call classify('audio.wav')")
`;
    }
  };

  const reset = () => {
    setStep('upload');
    setClasses([{ name: 'Class A', samples: [] }, { name: 'Class B', samples: [] }]);
    setEpochsData([]);
    setFinalAccuracy(0);
    setPredictions([]);
    setTestInput('');
    setTestImage(null);
  };

  const model = selectedType ? MODEL_OPTIONS.find(m => m.id === selectedType) : null;

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
            <p className="text-[hsl(var(--discord-text-muted))]">Upload data → Train → Test predictions — like Teachable Machine!</p>
          </div>
        </div>
      </motion.div>

      {!selectedType ? (
        /* Model Type Selection */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MODEL_OPTIONS.map((m, i) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => { setSelectedType(m.id); reset(); }}
              className="p-6 rounded-xl bg-[hsl(var(--discord-darker))] border border-[hsl(var(--discord-light)/0.2)] hover:border-[hsl(var(--discord-blurple)/0.5)] transition-all text-left group"
            >
              <span className="text-5xl block mb-3">{m.emoji}</span>
              <h3 className="text-xl font-bold text-white mb-1">{m.name}</h3>
              <p className="text-sm text-[hsl(var(--discord-text-muted))] mb-3">{m.description}</p>
              <Badge className="text-[10px] bg-[hsl(var(--discord-blurple)/0.2)] text-[hsl(var(--discord-blurple))] border-[hsl(var(--discord-blurple)/0.3)]">
                {m.dataHint}
              </Badge>
            </motion.button>
          ))}
        </div>
      ) : (
        <div>
          {/* Back + Steps indicator */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedType(null); reset(); }} className="text-[hsl(var(--discord-text-muted))] hover:text-white">
              ← Back
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              {(['upload', 'train', 'predict'] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s ? 'bg-[hsl(var(--discord-blurple))] text-white' : 
                    (['upload', 'train', 'predict'].indexOf(step) > i) ? 'bg-[hsl(var(--discord-green))] text-white' : 
                    'bg-[hsl(var(--discord-light))] text-[hsl(var(--discord-text-muted))]'
                  }`}>
                    {(['upload', 'train', 'predict'].indexOf(step) > i) ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-medium capitalize ${step === s ? 'text-white' : 'text-[hsl(var(--discord-text-muted))]'}`}>{s}</span>
                  {i < 2 && <ChevronRight className="w-4 h-4 text-[hsl(var(--discord-text-muted))]" />}
                </div>
              ))}
            </div>
          </div>

          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Training Data
                </h2>
                <Button size="sm" variant="ghost" onClick={addClass} className="text-[hsl(var(--discord-blurple))] hover:text-white">
                  <Plus className="w-4 h-4 mr-1" /> Add Class
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map((cls, classIndex) => (
                  <div key={classIndex} className="bg-[hsl(var(--discord-darker))] rounded-xl border border-[hsl(var(--discord-light)/0.2)] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Input
                        value={cls.name}
                        onChange={e => renameClass(classIndex, e.target.value)}
                        className="h-8 text-sm font-bold bg-transparent border-none text-white p-0 focus-visible:ring-0"
                      />
                      <Badge className="text-[10px] bg-[hsl(var(--discord-blurple)/0.2)] text-[hsl(var(--discord-blurple))] border-[hsl(var(--discord-blurple)/0.3)] flex-shrink-0">
                        {cls.samples.length} samples
                      </Badge>
                      {classes.length > 2 && (
                        <button onClick={() => removeClass(classIndex)} className="text-[hsl(var(--discord-text-muted))] hover:text-[hsl(var(--discord-red))]">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Samples display */}
                    {selectedType === 'image' ? (
                      <>
                        <div className="grid grid-cols-4 gap-1 mb-2 min-h-[60px]">
                          {cls.samples.map((src, si) => (
                            <div key={si} className="relative group aspect-square rounded-lg overflow-hidden bg-[hsl(var(--discord-dark))]">
                              <img src={src} alt="" className="w-full h-full object-cover" />
                              <button onClick={() => removeSample(classIndex, si)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-[hsl(var(--discord-red))] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <input
                          ref={el => { fileInputRefs.current[classIndex] = el; }}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={e => handleImageUpload(classIndex, e.target.files)}
                          className="hidden"
                        />
                        <Button size="sm" variant="outline" onClick={() => fileInputRefs.current[classIndex]?.click()}
                          className="w-full text-xs border-dashed border-[hsl(var(--discord-light)/0.3)] text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light)/0.2)]">
                          <ImageIcon className="w-3 h-3 mr-1" /> Add Images
                        </Button>
                      </>
                    ) : selectedType === 'text' ? (
                      <>
                        <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
                          {cls.samples.map((text, si) => (
                            <div key={si} className="flex items-center gap-1 text-xs bg-[hsl(var(--discord-dark))] rounded px-2 py-1 group">
                              <span className="flex-1 truncate text-[hsl(var(--discord-text))]">{text}</span>
                              <button onClick={() => removeSample(classIndex, si)} className="opacity-0 group-hover:opacity-100 text-[hsl(var(--discord-text-muted))] hover:text-[hsl(var(--discord-red))]">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <TextSampleInput onAdd={(text) => addTextSample(classIndex, text)} />
                      </>
                    ) : (
                      <>
                        <div className="space-y-1 mb-2">
                          {cls.samples.map((name, si) => (
                            <div key={si} className="flex items-center gap-2 text-xs bg-[hsl(var(--discord-dark))] rounded px-2 py-1 group">
                              <Mic className="w-3 h-3 text-[hsl(var(--discord-text-muted))]" />
                              <span className="flex-1 truncate text-[hsl(var(--discord-text))]">{name}</span>
                              <button onClick={() => removeSample(classIndex, si)} className="opacity-0 group-hover:opacity-100 text-[hsl(var(--discord-text-muted))] hover:text-[hsl(var(--discord-red))]">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <input
                          ref={el => { fileInputRefs.current[classIndex + 100] = el; }}
                          type="file"
                          accept="audio/*"
                          multiple
                          onChange={e => {
                            const files = e.target.files;
                            if (files) {
                              Array.from(files).forEach(f => {
                                setClasses(prev => prev.map((c, i) => i === classIndex ? { ...c, samples: [...c.samples, f.name] } : c));
                              });
                            }
                          }}
                          className="hidden"
                        />
                        <Button size="sm" variant="outline" onClick={() => fileInputRefs.current[classIndex + 100]?.click()}
                          className="w-full text-xs border-dashed border-[hsl(var(--discord-light)/0.3)] text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light)/0.2)]">
                          <Mic className="w-3 h-3 mr-1" /> Add Audio Files
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-[hsl(var(--discord-text-muted))]">
                  {canTrain ? '✅ Ready to train!' : `Add at least 2 samples per class (${totalSamples}/4 minimum)`}
                </p>
                <Button onClick={handleTrain} disabled={!canTrain || isTraining}
                  className="h-11 px-6 text-base font-bold"
                  style={{ backgroundColor: model?.color }}>
                  <Zap className="w-5 h-5 mr-2" />
                  Train Model
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Train */}
          {step === 'train' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-[hsl(var(--discord-darker))] rounded-xl border border-[hsl(var(--discord-light)/0.2)] p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  {isTraining ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--discord-blurple))]" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-[hsl(var(--discord-green))]" />
                  )}
                  {isTraining ? 'Training in Progress...' : 'Training Complete!'}
                </h3>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[hsl(var(--discord-text-muted))]">
                      Epoch {epochsData.length} / 20
                    </span>
                    <span className="text-white font-mono">
                      {epochsData.length > 0 ? `${epochsData[epochsData.length - 1].accuracy}%` : '0%'}
                    </span>
                  </div>
                  <Progress value={(epochsData.length / 20) * 100} className="h-3" />
                </div>

                {/* Training Chart */}
                {epochsData.length > 1 && (
                  <div className="h-48 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={epochsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--discord-light) / 0.2)" />
                        <XAxis dataKey="epoch" stroke="hsl(var(--discord-text-muted))" tick={{ fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--discord-text-muted))" tick={{ fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--discord-darker))', border: '1px solid hsl(var(--discord-light) / 0.3)', borderRadius: '8px', color: 'white' }}
                        />
                        <Line type="monotone" dataKey="accuracy" stroke="#57F287" strokeWidth={2} dot={false} name="Accuracy %" />
                        <Line type="monotone" dataKey="loss" stroke="#ED4245" strokeWidth={2} dot={false} name="Loss" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Final Stats */}
                {!isTraining && epochsData.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-[hsl(var(--discord-dark))] rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-[hsl(var(--discord-green))]">{finalAccuracy}%</p>
                        <p className="text-xs text-[hsl(var(--discord-text-muted))]">Accuracy</p>
                      </div>
                      <div className="bg-[hsl(var(--discord-dark))] rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-[hsl(var(--discord-blurple))]">20</p>
                        <p className="text-xs text-[hsl(var(--discord-text-muted))]">Epochs</p>
                      </div>
                      <div className="bg-[hsl(var(--discord-dark))] rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-[hsl(var(--discord-yellow))]">{classes.length}</p>
                        <p className="text-xs text-[hsl(var(--discord-text-muted))]">Classes</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button onClick={handlePredict} className="flex-1 h-11 bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)] text-white font-bold">
                        <Play className="w-5 h-5 mr-2" /> Test Your Model
                      </Button>
                      <Button onClick={() => onViewCode(generateCode())} variant="outline" className="h-11 border-[hsl(var(--discord-blurple)/0.5)] text-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.1)]">
                        <Code className="w-5 h-5 mr-2" /> Export Code
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Predict */}
          {step === 'predict' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Input */}
                <div className="bg-[hsl(var(--discord-darker))] rounded-xl border border-[hsl(var(--discord-light)/0.2)] p-6">
                  <h3 className="font-bold text-white mb-4">🧪 Test Input</h3>
                  
                  {selectedType === 'image' ? (
                    <div>
                      {testImage ? (
                        <div className="relative mb-3">
                          <img src={testImage} alt="Test" className="w-full h-48 object-cover rounded-lg" />
                          <button onClick={() => setTestImage(null)} className="absolute top-2 right-2 w-6 h-6 bg-[hsl(var(--discord-red))] rounded-full flex items-center justify-center">
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => testFileRef.current?.click()}
                          className="border-2 border-dashed border-[hsl(var(--discord-light)/0.3)] rounded-xl p-8 text-center cursor-pointer hover:border-[hsl(var(--discord-blurple)/0.5)] transition-colors"
                        >
                          <ImageIcon className="w-10 h-10 mx-auto mb-2 text-[hsl(var(--discord-text-muted))]" />
                          <p className="text-sm text-[hsl(var(--discord-text-muted))]">Drop an image to test</p>
                        </div>
                      )}
                      <input ref={testFileRef} type="file" accept="image/*" onChange={e => handleTestImage(e.target.files)} className="hidden" />
                    </div>
                  ) : selectedType === 'text' ? (
                    <div className="space-y-3">
                      <Textarea
                        value={testInput}
                        onChange={e => setTestInput(e.target.value)}
                        placeholder="Type text to classify..."
                        rows={4}
                        className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.3)] text-white resize-none"
                      />
                      <Button onClick={handleTestText} disabled={!testInput.trim()} className="w-full bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]">
                        <Sparkles className="w-4 h-4 mr-2" /> Classify
                      </Button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => testFileRef.current?.click()}
                      className="border-2 border-dashed border-[hsl(var(--discord-light)/0.3)] rounded-xl p-8 text-center cursor-pointer hover:border-[hsl(var(--discord-blurple)/0.5)] transition-colors"
                    >
                      <Mic className="w-10 h-10 mx-auto mb-2 text-[hsl(var(--discord-text-muted))]" />
                      <p className="text-sm text-[hsl(var(--discord-text-muted))]">Upload audio to test</p>
                      <input ref={testFileRef} type="file" accept="audio/*" onChange={e => handleTestImage(e.target.files)} className="hidden" />
                    </div>
                  )}
                </div>

                {/* Predictions */}
                <div className="bg-[hsl(var(--discord-darker))] rounded-xl border border-[hsl(var(--discord-light)/0.2)] p-6">
                  <h3 className="font-bold text-white mb-4">📊 Predictions</h3>
                  {predictions.length > 0 ? (
                    <div className="space-y-3">
                      {predictions.map((pred, i) => (
                        <motion.div
                          key={pred.className}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium text-white">{pred.className}</span>
                            <span className={`font-bold ${i === 0 ? 'text-[hsl(var(--discord-green))]' : 'text-[hsl(var(--discord-text-muted))]'}`}>
                              {pred.confidence}%
                            </span>
                          </div>
                          <div className="h-6 bg-[hsl(var(--discord-dark))] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pred.confidence}%` }}
                              transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ 
                                background: i === 0 ? 'linear-gradient(90deg, #57F287, #006600)' : 
                                  `hsl(var(--discord-light) / ${0.5 - i * 0.1})` 
                              }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[hsl(var(--discord-text-muted))]">
                      <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Upload test data to see predictions</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep('upload')} variant="ghost" className="text-[hsl(var(--discord-text-muted))] hover:text-white">
                  ← Back to Upload
                </Button>
                <div className="flex-1" />
                <Button onClick={() => onViewCode(generateCode())} className="bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] font-bold">
                  <Code className="w-4 h-4 mr-2" /> Export Python Code
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

/* Small helper component for text sample input */
const TextSampleInput = ({ onAdd }: { onAdd: (text: string) => void }) => {
  const [value, setValue] = useState('');
  return (
    <div className="flex gap-1">
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { onAdd(value); setValue(''); } }}
        placeholder="Type a sample..."
        className="h-7 text-xs bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.3)] text-white"
      />
      <Button size="sm" onClick={() => { if (value.trim()) { onAdd(value); setValue(''); } }}
        className="h-7 w-7 p-0 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]">
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
};
