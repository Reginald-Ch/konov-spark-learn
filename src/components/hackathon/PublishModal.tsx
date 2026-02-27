import { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Rocket, Trophy, Link2, Loader2, CheckCircle2, Sparkles, Copy, Check, ExternalLink, Share2, PartyPopper, Globe } from 'lucide-react';
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

export const PublishModal = forwardRef<HTMLDivElement, PublishModalProps>(({ isOpen, onClose, code, templateId, projectName: prefillName, description: prefillDesc, prefillEmail, prefillAuthorName, currentProjectId, onProjectIdUpdate }, ref) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [deployStep, setDeployStep] = useState<DeployStep>('form');
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [deployMsgIndex, setDeployMsgIndex] = useState(0);
  const [showNameInput, setShowNameInput] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (prefillName) setProjectName(prefillName);
      if (prefillDesc) setDescription(prefillDesc);
      if (prefillEmail) setAuthorEmail(prefillEmail);
      if (prefillAuthorName) setAuthorName(prefillAuthorName);
      const isAutoName = prefillAuthorName?.startsWith('Student-') || !prefillAuthorName;
      setShowNameInput(!!isAutoName);
      setDeployStep('form');
      setPublishedId(null);
      setUrlCopied(false);
      setDeployMsgIndex(0);
    }
  }, [isOpen, prefillName, prefillDesc, prefillEmail, prefillAuthorName]);

  useEffect(() => {
    if (deployStep !== 'deploying') return;
    const interval = setInterval(() => {
      setDeployMsgIndex(prev => prev < DEPLOY_MESSAGES.length - 1 ? prev + 1 : prev);
    }, 600);
    return () => clearInterval(interval);
  }, [deployStep]);

  // Use the published app URL (works on any domain where the app is hosted)
  const projectUrl = publishedId ? `${window.location.origin}/projects/${publishedId}` : '';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(projectUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
    toast.success('URL copied!');
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
    const finalName = authorName.trim() || prefillAuthorName || 'Student';
    const finalEmail = authorEmail || prefillEmail || `student-${Math.random().toString(36).slice(2, 8)}@forge.local`;
    if (finalName && !finalName.startsWith('Student-')) {
      localStorage.setItem('forge-student-name', finalName);
    }

    setDeployStep('deploying');
    setDeployMsgIndex(0);

    try {
      await new Promise(r => setTimeout(r, 3000));
      let resultId: string | null = null;

      if (currentProjectId) {
        const { error } = await supabase
          .from('ai_projects')
          .update({ project_name: projectName, description, code, template_id: templateId, author_name: finalName, demo_url: null, is_published: true, points_earned: 10 })
          .eq('id', currentProjectId)
          .eq('author_email', finalEmail);
        if (error) throw error;
        resultId = currentProjectId;
      } else {
        const { data, error } = await supabase
          .from('ai_projects')
          .insert({ project_name: projectName, description, code, template_id: templateId, author_name: finalName, author_email: finalEmail, demo_url: null, is_published: true, points_earned: 10 })
          .select('id')
          .single();
        if (error) throw error;
        resultId = data?.id || null;
        if (resultId && onProjectIdUpdate) onProjectIdUpdate(resultId);
      }

      setPublishedId(resultId);
      setDeployStep('deployed');
      toast.success('🎉 Your AI is live!');
      // Tier 2: Project Deployed (20 pts, awarded once)
      const deployKey = `forge-scored-project_deployed-${finalEmail}`;
      if (!localStorage.getItem(deployKey)) {
        localStorage.setItem(deployKey, 'true');
        supabase.from('point_events').insert({ participant_email: finalEmail, event_type: 'project_deployed', points: 20, metadata: { project: projectName } } as any).then(({ error }) => { if (error) console.warn('point_events insert failed:', error); });
      }
    } catch (e) {
      console.error(e);
      toast.error('Deploy failed. Try again!');
      setDeployStep('form');
    }
  };

  const handleClose = () => {
    setDeployStep('form');
    setPublishedId(null);
    setUrlCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && deployStep !== 'deploying' && handleClose()}>
      <DialogContent ref={ref} className="bg-[hsl(var(--ide-bg))] border-[hsl(var(--ide-border))] text-[hsl(var(--ide-text))] sm:max-w-lg overflow-hidden p-0">
        <AnimatePresence mode="wait">
          {/* ── DEPLOYING ANIMATION ── */}
          {deployStep === 'deploying' && (
            <motion.div
              key="deploying"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-12 px-6 text-center"
            >
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full border-4 border-[hsl(var(--ide-border))]" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#F7941D] border-r-[#C70110] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Rocket className="w-10 h-10 text-[#F7941D] animate-bounce" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Deploying Your AI...</h3>
              <div className="space-y-2 min-h-[140px]">
                {DEPLOY_MESSAGES.slice(0, deployMsgIndex + 1).map((msg, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: i === deployMsgIndex ? 1 : 0.4, x: 0 }}
                    className={`text-sm ${i === deployMsgIndex ? 'text-white font-semibold' : 'text-[hsl(var(--ide-text-muted))]'}`}
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
              className="text-center py-6 px-6"
            >
              {/* Celebration header */}
              <div className="relative mb-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                  className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #006600, #00CC66)' }}
                >
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
                {/* Confetti particles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, x: 0, y: 0 }}
                    animate={{ 
                      scale: [0, 1, 0], 
                      x: [0, (i % 2 === 0 ? 1 : -1) * (40 + i * 15)], 
                      y: [0, -(30 + i * 10)] 
                    }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.08 }}
                    className="absolute top-8 left-1/2 w-2 h-2 rounded-full"
                    style={{ backgroundColor: ['#F7941D', '#C70110', '#006600', '#5865F2', '#FFD700', '#00CC66'][i] }}
                  />
                ))}
              </div>

              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold mb-1 text-white"
              >
                🎉 You're LIVE!
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-[hsl(var(--ide-text-muted))] mb-4 text-sm"
              >
                Your AI app is deployed. Anyone with the link can use it!
              </motion.p>

              {/* Points earned */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(247,148,29,0.15))', border: '1px solid rgba(255,215,0,0.3)' }}
              >
                <Trophy className="w-4 h-4 text-[#FFD700]" />
                <span className="text-sm font-bold text-[#FFD700]">+20 Points Earned!</span>
              </motion.div>

              {/* URL Box — the main event */}
              {projectUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="rounded-xl p-4 mb-4 text-left"
                  style={{ background: 'linear-gradient(135deg, rgba(88,101,242,0.1), rgba(0,102,0,0.1))', border: '1px solid rgba(88,101,242,0.25)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-[#5865F2]" />
                    <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--ide-text-muted))] font-bold">Your Live URL</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[hsl(var(--ide-bg-deep))] rounded-lg px-3 py-2">
                    <span className="text-xs text-white truncate flex-1 font-mono">{projectUrl}</span>
                    <Button size="icon" variant="ghost" onClick={handleCopyUrl} className="h-7 w-7 flex-shrink-0 hover:bg-white/10">
                      {urlCopied ? <Check className="w-3.5 h-3.5 text-[#00CC66]" /> : <Copy className="w-3.5 h-3.5 text-[hsl(var(--ide-text-muted))]" />}
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
                  <Button className="w-full h-10 text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #5865F2, #3498DB)' }}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open My App
                  </Button>
                </a>
                <Button onClick={handleShareNative} className="w-full h-10 text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #006600, #00CC66)' }}>
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Share with Friends
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-[11px] text-[hsl(var(--ide-text-muted))] mb-4"
              >
                📱 Open the URL on your phone to demo your AI to anyone!
              </motion.p>

              <Button onClick={handleClose} variant="ghost" className="text-[hsl(var(--ide-text-muted))] hover:text-white hover:bg-white/10 w-full">
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
              className="p-6 space-y-4"
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl text-white">
                  <Rocket className="w-5 h-5 text-[#F7941D]" />
                  Go Live
                </DialogTitle>
                <DialogDescription className="text-[hsl(var(--ide-text-muted))]">
                  Deploy your AI app and get a real URL anyone can visit.
                </DialogDescription>
              </DialogHeader>

              {showNameInput && (
                <div>
                  <label className="text-sm font-medium text-white mb-1 block">Your Name</label>
                  <Input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="What's your name?"
                    className="bg-[hsl(var(--ide-bg-deep))] border-[hsl(var(--ide-border))] text-white" autoFocus />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-white mb-1 block">Project Name</label>
                <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="My AI Chatbot"
                  className="bg-[hsl(var(--ide-bg-deep))] border-[hsl(var(--ide-border))] text-white" autoFocus={!showNameInput} />
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-1 block">
                  What does your AI do? <span className="text-[hsl(var(--ide-text-muted))] font-normal">(1-2 sentences)</span>
                </label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} 
                  placeholder="My AI helps students study for exams by explaining difficult concepts in simple language."
                  rows={2}
                  className="bg-[hsl(var(--ide-bg-deep))] border-[hsl(var(--ide-border))] text-white resize-none" />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(247,148,29,0.1), rgba(199,1,16,0.1))', border: '1px solid rgba(247,148,29,0.2)' }}>
                <Trophy className="w-5 h-5 text-[#FFD700] flex-shrink-0" />
                <p className="text-xs text-white">
                  Going live earns you <strong className="text-[#FFD700]">20 leaderboard points</strong> and a real public URL!
                </p>
              </div>

              <Button onClick={handlePublish} disabled={!projectName.trim()}
                className="w-full h-12 text-base font-bold text-white" style={{ background: 'linear-gradient(135deg, #C70110, #F7941D)' }}>
                <Rocket className="w-5 h-5 mr-2" />
                Deploy My AI 🚀
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
});

PublishModal.displayName = 'PublishModal';
