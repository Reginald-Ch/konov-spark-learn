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
      question: 'What is FORGE?',
      answer: 'FORGE is an online platform where students aged 8–18 can build AI-powered projects using Python — right in their browser. We provide a code editor, AI mentor, templates, and live hackathon events where you can compete, learn, and earn leaderboard points.'
    },
    {
      question: 'How does a FORGE hackathon work?',
      answer: 'Once an organizer sets an event to "Live", the Build Studio (IDE) and Templates unlock. You pick a template (AI Chatbot or AI Agent), write Python code in the browser editor, test your AI in Live Preview, and deploy it with "Go Live". Each event\'s length is set by its organizer — check the event\'s start and end time on its card. Points are awarded automatically as you hit milestones — from setting up your project to deploying it live!'
    },
    {
      question: 'Do I need to install anything?',
      answer: 'No! Everything runs in your browser. The FORGE IDE includes a Python code editor with syntax highlighting, an AI Mentor that can review your code, and a Live Preview chat to test your AI in real time. Just open the website and start building.'
    },
    {
      question: 'What programming language do I need to know?',
      answer: 'Python! Our templates use LangChain, OpenAI SDK, and other popular Python AI libraries. You don\'t need to be an expert — the templates come with working starter code, and the AI Mentor is always there to help you understand and extend it.'
    },
    {
      question: 'How does scoring work?',
      answer: 'FORGE uses a 100-point automated scoring system across 4 tiers:\n• Tier 1 — Foundation (20 pts): Team formed + project setup\n• Tier 2 — Execution (30 pts): First successful run + project deployed\n• Tier 3 — Quality (25 pts): Submitted on time + app runs live\n• Tier 4 — Judge Score (25 pts): Scored by judges after the event\nPoints are awarded automatically as you complete each milestone!'
    },
    {
      question: 'What is the AI Mentor?',
      answer: 'The AI Mentor is your coding buddy built into the IDE. It can see your code and acts as a "pair programmer" — giving hints, explaining concepts, and suggesting small improvements (2–5 lines). It won\'t write your whole project for you, but it helps you learn as you build. You can ask it questions like "How do I add memory to my chatbot?" or use the Review/Explain/Suggest buttons.'
    },
    {
      question: 'What is the Live Preview?',
      answer: 'The Live Preview panel on the right side of the IDE lets you chat with your AI in real time. It uses your system prompt, knowledge base, and Q&A data to respond — just like a real deployed chatbot. Change your system prompt and instantly see how your AI\'s personality changes!'
    },
    {
      question: 'What are the Knowledge Base and Q&A features?',
      answer: 'In the "Knowledge" tab of the IDE config panel, you can add custom text and Q&A pairs to make your bot smarter. For example, paste study notes in the Knowledge Base, and your bot will reference them when answering. Q&A pairs let you define exact question→answer mappings for precise responses.'
    },
    {
      question: 'How do I deploy my project?',
      answer: 'Click "Go Live" (or "Submit Project") in the IDE. This saves your code, publishes it to the showcase, and generates a shareable URL. You earn up to 45 points automatically for deploying and running live. Judges can then review and score your project from their dashboard.'
    },
    {
      question: 'Can I work with a team?',
      answer: 'Yes! After registering for a hackathon, go to the "Teams" section to join an existing team or create your own. Teams can have 1–5 members. Look for complementary skills — someone for coding, someone for the AI logic, and someone for presenting.'
    },
    {
      question: 'What are the prizes?',
      answer: 'Prizes vary by event and may include certificates, feature on the homepage, gift cards, AI API credits, or other rewards. Top 3 projects always get featured on the leaderboard. Check each event\'s details page for specific prize information.'
    },
    {
      question: 'Is there an age requirement?',
      answer: 'FORGE hackathons are designed for young tech enthusiasts aged 8–18. Some events may have specific age brackets — check each event\'s details for requirements.'
    },
    {
      question: 'What happens after the event ends?',
      answer: 'Your project stays live at its URL! Judges score projects from the Judge Dashboard, and final leaderboard rankings are published. You can continue to view your project and share it. Past events and their leaderboards are always accessible under "Past Events" in the sidebar.'
    },
    {
      question: 'Where is the Judge Dashboard?',
      answer: 'The Judge Dashboard is now integrated right into the platform! Go to the Hackathons tab and click "Judge Dashboard" in the sidebar. Enter the access code provided by the event organizer to unlock scoring, event management, and project controls — all without leaving the page.'
    },
    {
      question: 'I\'m stuck — who can help?',
      answer: 'Use the AI Mentor in the IDE for coding help. Join the Community Chat (click the chat icon in the sidebar) to ask other participants. You can also contact our team via the Contact page or check the "Getting Started" guide under the Hackathons tab.'
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center bg-[#5865F2]"
          >
            <HelpCircle className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">FORGE FAQ</h1>
            <p className="text-[hsl(var(--discord-text-muted))]">Everything you need to know about building AI on FORGE</p>
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
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
            <AccordionContent className="text-[hsl(var(--discord-text-muted))] pb-4 whitespace-pre-line">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Still Need Help */}
      <div className="mt-10 p-6 rounded-lg bg-gradient-to-br from-[hsl(var(--discord-blurple)/0.2)] to-[hsl(var(--discord-darker))] border border-[hsl(var(--discord-blurple)/0.3)]">
        <div className="text-center">
          <MessageSquare className="w-10 h-10 mx-auto mb-4 text-[hsl(var(--discord-blurple))]" />
          <h3 className="text-xl font-semibold text-white mb-2">Still Have Questions?</h3>
          <p className="text-[hsl(var(--discord-text-muted))] mb-6 max-w-md mx-auto">
            Need help with your project, the IDE, or hackathon rules? We're here!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/contact">
              <Button className="bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]">
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
      </div>
    </div>
  );
};
