import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Rocket, Trophy, Link2, Loader2, CheckCircle2, Sparkles, Copy, Check, ExternalLink, QrCode, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  templateId: string | null;
  projectName?: string;
  description?: string;
  prefillEmail?: string;
  prefillAuthorName?: string;
  currentProjectId?: string | null;
  onProjectIdUpdate?: (id: string) => void;
}

type DeployStep = 'form' | 'deploying' | 'deployed';

const DEPLOY_MESSAGES = [
  '📦 Packaging your code...',
  '🔑 Injecting API keys...',
  '🧠 Connecting AI model...',
  '🌐 Deploying to the cloud...',
  '🔗 Generating your URL...',
  '✅ Running final checks...',
];

export const PublishModal = ({ isOpen, onClose, code, templateId, projectName: prefillName, description: prefillDesc, prefillEmail, prefillAuthorName, currentProjectId, onProjectIdUpdate }: PublishModalProps) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [deployStep, setDeployStep] = useState<DeployStep>('form');
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [deployMsgIndex, setDeployMsgIndex] = useState(0);

  // Whether identity is already known (from Save Checkpoint)
  const hasIdentity = !!(prefillEmail && prefillAuthorName);

  useEffect(() => {
    if (isOpen) {
      if (prefillName) setProjectName(prefillName);
      if (prefillDesc) setDescription(prefillDesc);
      if (prefillEmail) setAuthorEmail(prefillEmail);
      if (prefillAuthorName) setAuthorName(prefillAuthorName);
      setDeployStep('form');
      setPublishedId(null);
      setUrlCopied(false);
      setDeployMsgIndex(0);
    }
  }, [isOpen, prefillName, prefillDesc, prefillEmail, prefillAuthorName]);

  // Animate deploy messages
  useEffect(() => {
    if (deployStep !== 'deploying') return;
    const interval = setInterval(() => {
      setDeployMsgIndex(prev => {
        if (prev < DEPLOY_MESSAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [deployStep]);

  const projectUrl = publishedId ? `${window.location.origin}/projects/${publishedId}` : '';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(projectUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
    toast.success('URL copied to clipboard!');
  };

  const handleShareNative = () => {
    if (navigator.share) {
      navigator.share({ title: projectName, text: `Check out my AI project: ${projectName}`, url: projectUrl });
    } else {
      handleCopyUrl();
    }
  };

  const handlePublish = async () => {
    if (!projectName.trim()) { toast.error('Give your project a name!'); return; }
    if (!authorName.trim() || !authorEmail.trim()) { toast.error('Please fill in your name and email!'); return; }

    setDeployStep('deploying');
    setDeployMsgIndex(0);

    try {
      // Simulate deployment time for the feel
      await new Promise(r => setTimeout(r, 3000));

      let resultId: string | null = null;

      if (currentProjectId) {
        const { error } = await supabase
          .from('ai_projects')
          .update({
            project_name: projectName,
            description,
            code,
            template_id: templateId,
            author_name: authorName,
            demo_url: null,
            is_published: true,
            points_earned: 10,
          })
          .eq('id', currentProjectId)
          .eq('author_email', authorEmail);

        if (error) throw error;
        resultId = currentProjectId;
      } else {
        const { data, error } = await supabase
          .from('ai_projects')
          .insert({
            project_name: projectName,
            description,
            code,
            template_id: templateId,
            author_name: authorName,
            author_email: authorEmail,
            demo_url: null,
            is_published: true,
            points_earned: 10,
          })
          .select('id')
          .single();

        if (error) throw error;
        resultId = data?.id || null;
        if (resultId && onProjectIdUpdate) onProjectIdUpdate(resultId);
      }

      setPublishedId(resultId);
      setDeployStep('deployed');
      toast.success('🎉 Your AI is live!');

      // Award points
      supabase.from('point_events').insert({ participant_email: authorEmail, event_type: 'go_live', points: 10, metadata: { project: projectName } } as any).then(({ error }) => { if (error) console.warn('point_events insert failed:', error); });
    } catch (e) {
      console.error(e);
      toast.error('Deploy failed. Try again!');
      setDeployStep('form');
    }
  };

  const handleClose = () => {
    setDeployStep('form');
    setPublishedId(null);
    setProjectName('');
    setDescription('');
    if (!hasIdentity) {
      setAuthorName('');
      setAuthorEmail('');
    }
    setUrlCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && deployStep !== 'deploying' && handleClose()}>
      <DialogContent className="bg-[hsl(var(--ide-bg))] border-[hsl(var(--ide-border))] text-[hsl(var(--ide-text))] sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-[hsl(var(--ide-text))]">
            <Rocket className="w-5 h-5 text-[hsl(var(--ide-accent))]" />
            {deployStep === 'deployed' ? "You're Live!" : deployStep === 'deploying' ? 'Deploying...' : 'Go Live'}
          </DialogTitle>
          {deployStep === 'form' && (
            <DialogDescription className="text-[hsl(var(--ide-text-muted))]">
              Deploy your AI and get a real URL anyone can visit.
            </DialogDescription>
          )}
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* ── DEPLOYING ANIMATION ── */}
          {deployStep === 'deploying' && (
            <motion.div
              key="deploying"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-10 text-center"
            >
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full border-4 border-[hsl(var(--ide-border))]" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[hsl(var(--ide-accent))] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Rocket className="w-8 h-8 text-[hsl(var(--ide-accent))] animate-bounce" />
                </div>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {DEPLOY_MESSAGES.slice(0, deployMsgIndex + 1).map((msg, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: i === deployMsgIndex ? 1 : 0.5, x: 0 }}
                    className={`text-sm ${i === deployMsgIndex ? 'text-[hsl(var(--ide-text))] font-medium' : 'text-[hsl(var(--ide-text-muted))]'}`}
                  >
                    {msg}
                  </motion.p>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── DEPLOYED SUCCESS ── */}
          {deployStep === 'deployed' && (
            <motion.div
              key="deployed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, hsl(var(--ide-green) / 0.2), hsl(var(--ide-accent) / 0.2))' }}
              >
                <CheckCircle2 className="w-12 h-12 text-[hsl(var(--ide-green))]" />
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold mb-1 text-[hsl(var(--ide-text))]"
              >
                🚀 Your AI is LIVE!
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-[hsl(var(--ide-text-muted))] mb-5 text-sm"
              >
                Anyone in the world can now use your AI. You earned <span className="text-[hsl(var(--ide-yellow))] font-bold">10 points</span>!
              </motion.p>

              {/* URL Box */}
              {projectUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-[hsl(var(--ide-bg-deep))] rounded-lg p-3 mb-4"
                >
                  <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--ide-text-muted))] mb-1.5 font-semibold">Your Live URL</p>
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-[hsl(var(--ide-accent))] flex-shrink-0" />
                    <span className="text-xs text-[hsl(var(--ide-text))] truncate flex-1 text-left font-mono">{projectUrl}</span>
                    <Button size="icon" variant="ghost" onClick={handleCopyUrl} className="h-7 w-7 flex-shrink-0">
                      {urlCopied ? <Check className="w-3.5 h-3.5 text-[hsl(var(--ide-green))]" /> : <Copy className="w-3.5 h-3.5 text-[hsl(var(--ide-text-muted))]" />}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 gap-2 mb-4"
              >
                <a href={projectUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full h-9 text-xs border-[hsl(var(--ide-border))] text-[hsl(var(--ide-text))] hover:bg-[hsl(var(--ide-border)/0.5)]">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open in New Tab
                  </Button>
                </a>
                <Button variant="outline" onClick={handleShareNative} className="w-full h-9 text-xs border-[hsl(var(--ide-border))] text-[hsl(var(--ide-text))] hover:bg-[hsl(var(--ide-border)/0.5)]">
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Share
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-2 text-xs text-[hsl(var(--ide-text-muted))] mb-4"
              >
                <Trophy className="w-3.5 h-3.5 text-[hsl(var(--ide-yellow))]" />
                <span>Open this URL on your phone to test it!</span>
              </motion.div>

              <Button onClick={handleClose} className="bg-[hsl(var(--ide-accent))] hover:bg-[hsl(var(--ide-accent)/0.8)] text-white w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                Back to Building
              </Button>
            </motion.div>
          )}

          {/* ── FORM ── */}
          {deployStep === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Project Name — always show */}
              <div>
                <label className="text-sm font-medium text-[hsl(var(--ide-text))] mb-1 block">Project Name *</label>
                <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="My AI Chatbot"
                  className="bg-[hsl(var(--ide-bg-deep))] border-[hsl(var(--ide-border))] text-[hsl(var(--ide-text))]" />
              </div>

              {/* Description — the "2 sentences" */}
              <div>
                <label className="text-sm font-medium text-[hsl(var(--ide-text))] mb-1 block">
                  What does your AI do? <span className="text-[hsl(var(--ide-text-muted))] font-normal">(1-2 sentences)</span>
                </label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} 
                  placeholder="My AI helps students study for exams by explaining difficult concepts in simple language and creating practice questions."
                  rows={2}
                  className="bg-[hsl(var(--ide-bg-deep))] border-[hsl(var(--ide-border))] text-[hsl(var(--ide-text))] resize-none" />
              </div>

              {/* Name/Email — only show if not already known */}
              {!hasIdentity && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-[hsl(var(--ide-text))] mb-1 block">Your Name *</label>
                    <Input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Ada Lovelace"
                      className="bg-[hsl(var(--ide-bg-deep))] border-[hsl(var(--ide-border))] text-[hsl(var(--ide-text))]" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[hsl(var(--ide-text))] mb-1 block">Email *</label>
                    <Input value={authorEmail} onChange={e => setAuthorEmail(e.target.value)} placeholder="you@email.com" type="email"
                      className="bg-[hsl(var(--ide-bg-deep))] border-[hsl(var(--ide-border))] text-[hsl(var(--ide-text))]" />
                  </div>
                </div>
              )}

              {/* Identity confirmation when known */}
              {hasIdentity && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(var(--ide-bg-deep))] text-xs text-[hsl(var(--ide-text-muted))]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--ide-green))] flex-shrink-0" />
                  Publishing as <span className="text-[hsl(var(--ide-text))] font-medium">{authorName}</span> ({authorEmail})
                </div>
              )}

              {/* Points banner */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--ide-accent)/0.1)] border border-[hsl(var(--ide-accent)/0.2)]">
                <Trophy className="w-5 h-5 text-[hsl(var(--ide-yellow))] flex-shrink-0" />
                <p className="text-xs text-[hsl(var(--ide-text))]">
                  Going live earns you <strong>10 leaderboard points</strong> and a real public URL!
                </p>
              </div>

              <Button onClick={handlePublish} disabled={!projectName.trim() || (!hasIdentity && (!authorName.trim() || !authorEmail.trim()))}
                className="w-full h-12 text-base font-bold" style={{ background: 'linear-gradient(135deg, #C70110, #F7941D)' }}>
                <Rocket className="w-5 h-5 mr-2" />
                Deploy My AI 🚀
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
