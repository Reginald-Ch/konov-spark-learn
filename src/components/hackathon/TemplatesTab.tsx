import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Bot, Eye, BarChart3, Palette, Brain, Mic, BookOpen, Swords,
  Clock, Star, Zap, ChevronRight, Play
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
  techStack: string[];
  icon: React.ElementType;
  emoji: string;
  color: string;
  starterCode: string;
  popularity: number;
}

interface TemplatesTabProps {
  onStartBuilding: (code: string, templateId: string) => void;
}

const TEMPLATES: Template[] = [
  {
    id: 'chatbot',
    title: 'AI Chatbot',
    description: 'Build a conversational AI chatbot that can answer questions and have smart conversations.',
    category: 'NLP',
    difficulty: 'Beginner',
    estimatedTime: '30 min',
    techStack: ['Python', 'LangChain', 'Streamlit'],
    icon: Bot,
    emoji: '🤖',
    color: '#5865F2',
    popularity: 95,
    starterCode: `# 🤖 AI Chatbot Starter
# Build a smart chatbot with LangChain!

from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory

# Set up your AI model
llm = OpenAI(temperature=0.7)
memory = ConversationBufferMemory()

# Create conversation chain
conversation = ConversationChain(
    llm=llm,
    memory=memory,
    verbose=True
)

# Chat loop
print("🤖 AI Chatbot Ready! Type 'quit' to exit.\\n")
while True:
    user_input = input("You: ")
    if user_input.lower() == 'quit':
        break
    response = conversation.predict(input=user_input)
    print(f"Bot: {response}\\n")
`
  },
  {
    id: 'image-classifier',
    title: 'Image Classifier',
    description: 'Classify images using a pre-trained neural network. Upload any photo and see what AI thinks it is!',
    category: 'Vision',
    difficulty: 'Intermediate',
    estimatedTime: '45 min',
    techStack: ['Python', 'PyTorch', 'Gradio'],
    icon: Eye,
    emoji: '👁️',
    color: '#006600',
    popularity: 88,
    starterCode: `# 👁️ Image Classifier with PyTorch
# Classify any image using a pre-trained model!

import torch
import torchvision
from torchvision import transforms, models
from PIL import Image

# Load pre-trained ResNet model
model = models.resnet18(pretrained=True)
model.eval()

# Image preprocessing
transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# Load and classify an image
def classify_image(image_path):
    img = Image.open(image_path)
    img_tensor = transform(img).unsqueeze(0)
    
    with torch.no_grad():
        outputs = model(img_tensor)
        _, predicted = outputs.max(1)
    
    print(f"✅ Predicted class: {predicted.item()}")
    return predicted.item()

print("📸 Image Classifier Ready!")
print("Upload an image to classify it.")
`
  },
  {
    id: 'sentiment',
    title: 'Sentiment Analyzer',
    description: 'Analyze emotions in text using Hugging Face. Detect if text is positive, negative, or neutral.',
    category: 'NLP',
    difficulty: 'Beginner',
    estimatedTime: '20 min',
    techStack: ['Python', 'Hugging Face', 'Streamlit'],
    icon: Brain,
    emoji: '🧠',
    color: '#00B894',
    popularity: 92,
    starterCode: `# 🧠 Sentiment Analysis with Hugging Face
# Detect emotions in any text!

from transformers import pipeline

# Load pre-trained sentiment model
sentiment = pipeline("sentiment-analysis")

# Analyze sample texts
texts = [
    "I love building AI projects! This is amazing!",
    "This homework is really frustrating.",
    "The weather is nice today.",
    "I'm so excited about the hackathon!",
    "I can't figure out this bug..."
]

print("🎭 Sentiment Analysis Results:\\n")
for text in texts:
    result = sentiment(text)[0]
    emoji = "😊" if result["label"] == "POSITIVE" else "😞"
    bar = "█" * int(result["score"] * 20)
    print(f'{emoji} "{text}"')
    print(f'   → {result["label"]} {bar} {result["score"]:.1%}\\n')
`
  },
  {
    id: 'quiz-generator',
    title: 'AI Quiz Generator',
    description: 'Generate quiz questions on any topic using AI. Perfect for studying and testing knowledge!',
    category: 'NLP',
    difficulty: 'Beginner',
    estimatedTime: '25 min',
    techStack: ['Python', 'OpenAI', 'Streamlit'],
    icon: BookOpen,
    emoji: '📝',
    color: '#F7941D',
    popularity: 85,
    starterCode: `# 📝 AI Quiz Generator
# Generate quiz questions on any topic!

import openai

def generate_quiz(topic, num_questions=5):
    prompt = f"""Generate {num_questions} multiple choice quiz questions about {topic}.
    
    Format each question like:
    Q: [question]
    A) [option]
    B) [option]
    C) [option]
    D) [option]
    Answer: [letter]
    """
    
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a quiz generator for students."},
            {"role": "user", "content": prompt}
        ]
    )
    
    return response.choices[0].message.content

# Generate a quiz
topic = input("📚 Enter a topic: ")
print(f"\\n🎯 Generating quiz about '{topic}'...\\n")
quiz = generate_quiz(topic)
print(quiz)
`
  },
  {
    id: 'data-viz',
    title: 'ML Data Visualizer',
    description: 'Upload data, train a model, and visualize predictions with beautiful charts.',
    category: 'Data',
    difficulty: 'Intermediate',
    estimatedTime: '40 min',
    techStack: ['Python', 'scikit-learn', 'Matplotlib'],
    icon: BarChart3,
    emoji: '📊',
    color: '#C70110',
    popularity: 78,
    starterCode: `# 📊 ML Data Visualizer
# Train a model and visualize predictions!

from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import matplotlib.pyplot as plt
import numpy as np

# Load dataset
iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.3, random_state=42
)

# Train the model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Make predictions
predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)

print(f"🎯 Model Accuracy: {accuracy:.1%}")
print(f"📈 Trained on {len(X_train)} samples")
print(f"🧪 Tested on {len(X_test)} samples")
print(f"\\n📋 Classification Report:")
print(classification_report(y_test, predictions, target_names=iris.target_names))
`
  },
  {
    id: 'image-gen',
    title: 'AI Art Generator',
    description: 'Generate stunning images from text descriptions using Stable Diffusion.',
    category: 'GenAI',
    difficulty: 'Advanced',
    estimatedTime: '60 min',
    techStack: ['Python', 'Stable Diffusion', 'Gradio'],
    icon: Palette,
    emoji: '🎨',
    color: '#9B59B6',
    popularity: 90,
    starterCode: `# 🎨 AI Art Generator with Stable Diffusion
# Generate images from text prompts!

from diffusers import StableDiffusionPipeline
import torch

# Load the model (requires GPU)
pipe = StableDiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    torch_dtype=torch.float16
)
pipe = pipe.to("cuda")

# Generate an image
prompt = "a cute robot painting on a canvas, digital art, vibrant colors"
print(f"🎨 Generating: '{prompt}'...")

image = pipe(prompt, num_inference_steps=30).images[0]
image.save("ai_art.png")

print("✅ Image saved as 'ai_art.png'!")
print("🖼️ Try different prompts to create unique art!")
`
  },
];

const CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: Zap },
  { id: 'NLP', name: 'NLP / Chatbots', icon: Bot },
  { id: 'Vision', name: 'Computer Vision', icon: Eye },
  { id: 'Data', name: 'Data Science', icon: BarChart3 },
  { id: 'GenAI', name: 'Generative AI', icon: Palette },
];

export const TemplatesTab = ({ onStartBuilding }: TemplatesTabProps) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filtered = selectedCategory === 'all' 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.category === selectedCategory);

  const getDifficultyColor = (d: string) => {
    if (d === 'Beginner') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (d === 'Intermediate') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F7941D, #FFD700)' }}>
            <Rocket className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">1-Click Templates</h1>
            <p className="text-[hsl(var(--discord-text-muted))]">Pick a template and start building instantly — no blank screen!</p>
          </div>
        </div>
      </motion.div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map(cat => (
          <Button
            key={cat.id}
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className={`${
              selectedCategory === cat.id
                ? 'bg-[hsl(var(--discord-blurple))] text-white'
                : 'bg-[hsl(var(--discord-darker))] text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light))]'
            } border border-[hsl(var(--discord-light)/0.2)]`}
          >
            <cat.icon className="w-4 h-4 mr-2" />
            {cat.name}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="wait">
          {filtered.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[hsl(var(--discord-darker))] rounded-xl border border-[hsl(var(--discord-light)/0.2)] overflow-hidden hover:border-[hsl(var(--discord-light)/0.5)] transition-all group"
            >
              {/* Card Header */}
              <div className="p-4 pb-3">
                <div className="flex items-start gap-3 mb-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: `${template.color}20` }}
                  >
                    {template.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-lg leading-tight">{template.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-[10px] border ${getDifficultyColor(template.difficulty)}`}>
                        {template.difficulty}
                      </Badge>
                      <span className="text-[10px] text-[hsl(var(--discord-text-muted))] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {template.estimatedTime}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[hsl(var(--discord-text-muted))] line-clamp-2 mb-3">
                  {template.description}
                </p>

                {/* Tech Stack */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.techStack.map(tech => (
                    <span key={tech} className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--discord-light)/0.3)] text-[hsl(var(--discord-text))]">
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Popularity */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-1.5 bg-[hsl(var(--discord-light)/0.3)] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${template.popularity}%` }}
                      transition={{ delay: 0.3 + index * 0.05, duration: 0.8 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: template.color }}
                    />
                  </div>
                  <span className="text-[10px] text-[hsl(var(--discord-text-muted))] flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-[hsl(var(--discord-yellow))]" />
                    {template.popularity}%
                  </span>
                </div>
              </div>

              {/* Start Building Button */}
              <div className="px-4 pb-4">
                <Button
                  onClick={() => onStartBuilding(template.starterCode, template.id)}
                  className="w-full font-bold text-white"
                  style={{ backgroundColor: template.color }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Building
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
