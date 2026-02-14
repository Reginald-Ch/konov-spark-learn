import { motion } from 'framer-motion';
import { HelpCircle, MessageSquare, Mail, ExternalLink } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const HackathonFAQ = () => {
  const faqs = [
    {
      question: 'What is a Python AI hackathon?',
      answer: 'A Python AI hackathon is a creative coding event where participants build AI-powered projects using Python. Teams use libraries like PyTorch, TensorFlow, scikit-learn, and Hugging Face Transformers to create chatbots, image classifiers, data dashboards, and more within a set timeframe.'
    },
    {
      question: 'Do I need to know machine learning to participate?',
      answer: 'Not at all! Many Python AI tools have simple APIs that don\'t require deep ML knowledge. You can use pre-built models from Hugging Face or call OpenAI\'s API with just a few lines of Python. Focus on building a great project around the AI.'
    },
    {
      question: 'What Python libraries should I learn first?',
      answer: 'Start with the basics: Pandas for data, Requests for API calls, and Streamlit for building quick UIs. For AI specifically, learn the OpenAI Python SDK (easiest), Hugging Face Transformers (tons of free models), or scikit-learn (classic ML). You don\'t need to master them all — pick one and go!'
    },
    {
      question: 'How do I get free GPU access?',
      answer: 'Google Colab offers free GPU/TPU access — just open a notebook and select Runtime > Change runtime type > GPU. Kaggle Notebooks also provide free GPUs with 30 hours/week. Both come with PyTorch and TensorFlow pre-installed!'
    },
    {
      question: 'Can I use Jupyter notebooks?',
      answer: 'Absolutely! Jupyter notebooks are perfect for AI hackathons. Use Google Colab (cloud-based Jupyter), Kaggle Notebooks, or run Jupyter locally. Notebooks let you iterate fast, visualize data inline, and document your approach — all things judges love.'
    },
    {
      question: 'How do I handle API keys safely in Python?',
      answer: 'Never hardcode API keys in your Python files! Use environment variables with python-dotenv (load_dotenv() + os.getenv("API_KEY")), or use Google Colab\'s secrets manager. For deployed apps, use Streamlit secrets or environment variables on your hosting platform.'
    },
    {
      question: 'How do I deploy my Python AI project?',
      answer: 'The easiest options: Streamlit Community Cloud (free, one-click deploy from GitHub), Hugging Face Spaces (free, supports Gradio & Streamlit), or Google Colab (share your notebook link). For more control, try Railway or Render with FastAPI.'
    },
    {
      question: 'What AI APIs can I use?',
      answer: 'Any AI API that works with Python! Popular options: OpenAI (GPT, DALL·E, Whisper), Hugging Face (thousands of free models), Google AI (Gemini), Stability AI (Stable Diffusion), and Cohere. Most offer free tiers perfect for hackathons.'
    },
    {
      question: 'Do I need coding experience to participate?',
      answer: 'Basic Python knowledge helps, but hackathons are for all levels. Beginners can start with simple API calls and Streamlit UIs. You can also contribute through ideas, testing, data collection, or presenting. Teammates and mentors are always available to help.'
    },
    {
      question: 'How do teams work?',
      answer: 'After registering, you can view teams in the "Teams" section. Join a team looking for members, or create your own and recruit teammates. Look for complementary skills — someone good at Python ML, someone for UI with Streamlit/Gradio, and someone for presenting.'
    },
    {
      question: 'What should I submit?',
      answer: 'Submit your project with: a GitHub repository (with requirements.txt and README), a working demo link (Streamlit/Gradio/Colab), and optionally a short video showing your AI in action. Make sure your README explains the problem, your approach, and how to run the project.'
    },
    {
      question: 'How are Python AI projects judged?',
      answer: 'Projects are judged on: creativity of the AI application, quality of Python implementation, user experience of the demo (Streamlit/Gradio), and presentation. A clean Streamlit app with a clever use of AI beats a messy notebook with a complex model!'
    },
    {
      question: 'What are the prizes?',
      answer: 'Prizes vary by hackathon and may include certificates, gift cards, tech gadgets, AI API credits, GPU cloud credits, learning subscriptions, or other rewards. Check each hackathon\'s details for specific prize information.'
    },
    {
      question: 'Is there an age requirement?',
      answer: 'Our Python AI hackathons are designed for young tech enthusiasts, typically ages 8-18. Some events may have specific age brackets. Check each event\'s requirements for details.'
    }
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #5865F2 0%, #7289DA 100%)' }}
          >
            <HelpCircle className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Python AI Hackathon FAQ</h1>
            <p className="text-[hsl(var(--discord-text-muted))]">Everything you need to know about building AI with Python</p>
          </div>
        </div>
      </motion.div>

      {/* FAQ Accordion */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="bg-[hsl(var(--discord-darker))] rounded-lg border border-[hsl(var(--discord-light)/0.2)] px-4 data-[state=open]:border-[hsl(var(--discord-blurple)/0.5)]"
            >
              <AccordionTrigger className="hover:no-underline py-4 text-left">
                <span className="text-white font-medium">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-[hsl(var(--discord-text-muted))] pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>

      {/* Still Need Help */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10 p-6 rounded-lg bg-gradient-to-br from-[hsl(var(--discord-blurple)/0.2)] to-[hsl(var(--discord-darker))] border border-[hsl(var(--discord-blurple)/0.3)]"
      >
        <div className="text-center">
          <MessageSquare className="w-10 h-10 mx-auto mb-4 text-[hsl(var(--discord-blurple))]" />
          <h3 className="text-xl font-semibold text-white mb-2">Still Have Questions?</h3>
          <p className="text-[hsl(var(--discord-text-muted))] mb-6 max-w-md mx-auto">
            Need help with Python setup, AI libraries, or hackathon rules? Our team is here to help!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/contact">
              <Button 
                className="bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Us
              </Button>
            </Link>
            <Link to="/community">
              <Button 
                variant="outline" 
                className="border-[hsl(var(--discord-light)/0.3)] text-white hover:bg-[hsl(var(--discord-light)/0.1)]"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Join Community
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Quick Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {[
          { 
            emoji: '🐍', 
            title: 'Python First', 
            text: 'All projects must be built with Python — use Colab, Kaggle, or Replit' 
          },
          { 
            emoji: '🤗', 
            title: 'Use Pre-trained Models', 
            text: 'Hugging Face has thousands of free models ready to use with Python' 
          },
          { 
            emoji: '🚀', 
            title: 'Demo with Streamlit', 
            text: 'Build a polished demo UI in minutes with Streamlit or Gradio' 
          }
        ].map((tip, index) => (
          <div 
            key={index}
            className="bg-[hsl(var(--discord-darker))] rounded-lg p-4 border border-[hsl(var(--discord-light)/0.2)] text-center"
          >
            <span className="text-2xl mb-2 block">{tip.emoji}</span>
            <h4 className="font-semibold text-white mb-1">{tip.title}</h4>
            <p className="text-xs text-[hsl(var(--discord-text-muted))]">{tip.text}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};
