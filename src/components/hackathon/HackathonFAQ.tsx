import { motion } from 'framer-motion';
import { HelpCircle, ChevronDown, MessageSquare, Mail, ExternalLink } from 'lucide-react';
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
      question: 'What is a hackathon?',
      answer: 'A hackathon is a creative coding event where participants form teams to build projects within a set timeframe. It\'s a fun way to learn new skills, collaborate with others, and turn ideas into working prototypes!'
    },
    {
      question: 'Do I need coding experience to participate?',
      answer: 'Not at all! Hackathons are for all skill levels. Beginners can learn from teammates, and there are always mentors available to help. You can contribute in many ways - design, ideas, testing, or presenting.'
    },
    {
      question: 'How do I register for a hackathon?',
      answer: 'Browse our events in the "All Events" channel, find one that interests you, and click the "Register" button. Fill in your details and you\'re in! You\'ll receive a confirmation with more details.'
    },
    {
      question: 'Can I participate solo or do I need a team?',
      answer: 'You can register solo and either join an existing team or create your own. We encourage teamwork as it\'s more fun and you can build bigger projects. Teams typically have 2-5 members.'
    },
    {
      question: 'How do teams work?',
      answer: 'After registering, you can view teams in the "Teams" section. You can join a team that\'s looking for members, or create your own team and invite others. Team leaders can manage their team composition.'
    },
    {
      question: 'What can I build during a hackathon?',
      answer: 'Almost anything! Web apps, games, tools, creative projects - as long as it fits the hackathon theme (if there is one). Check our "Project Ideas" section for inspiration.'
    },
    {
      question: 'What tools and technologies can I use?',
      answer: 'You\'re free to use any programming languages, frameworks, or tools you prefer. We recommend sticking to what you know for faster development, but hackathons are also great for learning new tech!'
    },
    {
      question: 'How do I submit my project?',
      answer: 'Before the deadline, go to your hackathon and click "Submit Project". You\'ll need to provide a project name, description, tech stack, and links to your demo and code repository (GitHub, GitLab, etc.).'
    },
    {
      question: 'How are projects judged?',
      answer: 'Projects are typically judged on creativity, technical implementation, design, and presentation. Specific criteria may vary by hackathon. Winners are announced after the event ends.'
    },
    {
      question: 'What are the prizes?',
      answer: 'Prizes vary by hackathon and may include certificates, gift cards, tech gadgets, learning subscriptions, or other rewards. Check each hackathon\'s details for specific prize information.'
    },
    {
      question: 'What if I have technical problems during the event?',
      answer: 'Don\'t worry! We have mentors and support channels available during the hackathon. Reach out through our community channels or contact page for help.'
    },
    {
      question: 'Is there an age requirement?',
      answer: 'Our hackathons are designed for young tech enthusiasts, typically ages 8-18. Some events may have specific age brackets. Check each event\'s requirements for details.'
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
            <h1 className="text-3xl font-bold text-white">FAQ & Help</h1>
            <p className="text-[hsl(var(--discord-text-muted))]">Got questions? We've got answers</p>
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
            Can't find what you're looking for? Our team is here to help! Reach out 
            through our contact page and we'll get back to you.
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
            emoji: '🎯', 
            title: 'Start Early', 
            text: 'Register as soon as registration opens to secure your spot' 
          },
          { 
            emoji: '🤝', 
            title: 'Team Up', 
            text: 'Find teammates with complementary skills' 
          },
          { 
            emoji: '🚀', 
            title: 'Ship It', 
            text: 'A working demo beats a perfect idea every time' 
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
