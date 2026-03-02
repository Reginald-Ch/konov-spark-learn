import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Rocket, Trophy, Loader2, CheckCircle2, Sparkles, Copy, Check, ExternalLink, Share2, Globe, Send, PartyPopper, ArrowRight } from 'lucide-react';
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
    const finalEmail = authorEmail.trim() || prefillEmail || `student-${Math.random().toString(36).slice(2, 8)}@forge.local`;
    
    // Persist email/name for future use
    if (finalName && !finalName.startsWith('Student-')) {
      localStorage.setItem('forge-student-name', finalName);
    }
    if (finalEmail) {
      localStorage.setItem('forge-student-email', finalEmail);
    }

    setDeployStep('deploying');
    setDeployMsgIndex(0);

    try {
      await new Promise(r => setTimeout(r, 3000));
      let resultId: string | null = null;

      if (currentProjectId) {
        // Try updating existing project
        const { data: updateData, error } = await supabase
          .from('ai_projects')
          .update({ project_name: projectName, description, code, template_id: templateId, author_name: finalName, demo_url: null, is_published: true, points_earned: 10 })
          .eq('id', currentProjectId)
          .eq('author_email', finalEmail)
          .select('id')
          .single();
        
        if (error || !updateData) {
          // Update failed (email mismatch or other issue) — insert new instead
          console.warn('Update failed, inserting new project:', error?.message);
          const { data: insertData, error: insertError } = await supabase
            .from('ai_projects')
            .insert({ project_name: projectName, description, code, template_id: templateId, author_name: finalName, author_email: finalEmail, demo_url: null, is_published: true, points_earned: 10 })
            .select('id')
            .single();
          if (insertError) throw insertError;
          resultId = insertData?.id || null;
          if (resultId && onProjectIdUpdate) onProjectIdUpdate(resultId);
        } else {
          resultId = currentProjectId;
        }
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

      // Auto-award all achievable leaderboard milestones on submission
      const milestones = [
        { event_type: 'project_setup', points: 10, metadata: { project: projectName } },
        { event_type: 'first_run_success', points: 10, metadata: { project: projectName } },
        { event_type: 'project_deployed', points: 20, metadata: { project: projectName } },
        { event_type: 'submitted_on_time', points: 5, metadata: { project: projectName } },
        { event_type: 'app_runs_live', points: 20, metadata: { project: projectName, project_id: resultId } },
      ];
      for (const m of milestones) {
        const key = `forge-scored-${m.event_type}-${finalEmail}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, 'true');
          supabase.from('point_events').insert({ participant_email: finalEmail, ...m } as any).then(({ error }) => {
            if (error) console.warn(`point_events ${m.event_type} insert failed:`, error);
          });
        }
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
      <DialogContent className="bg-[#0d1117] border-[#30363d] text-white sm:max-w-md overflow-hidden p-0" hideCloseButton={deployStep === 'deploying'}>
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
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full border-4 border-[#30363d]" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#F7941D] border-r-[#C70110] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Rocket className="w-8 h-8 text-[#F7941D]" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-4">Deploying Your AI...</h3>
              <div className="space-y-1.5 min-h-[130px]">
                {DEPLOY_MESSAGES.slice(0, deployMsgIndex + 1).map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-2 text-sm px-4 py-1 rounded ${i === deployMsgIndex ? 'text-white font-medium' : 'text-white/40'}`}
                  >
                    {i < deployMsgIndex ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    ) : i === deployMsgIndex ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#F7941D] animate-spin flex-shrink-0" />
                    ) : null}
                    <span>{msg}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── DEPLOYED SUCCESS ── */}
          {deployStep === 'deployed' && (
            <motion.div
              key="deployed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col"
            >
              {/* Green success banner */}
              <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}>
                <div className="px-6 py-8 text-center relative z-10">
                  {/* Confetti particles */}
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 0 }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        y: [0, -60 - Math.random() * 40],
                        x: [(Math.random() - 0.5) * 120],
                        rotate: [0, 360],
                      }}
                      transition={{ delay: 0.1 + i * 0.06, duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                      className="absolute w-1.5 h-1.5 rounded-full"
                      style={{
                        left: `${20 + Math.random() * 60}%`,
                        top: '60%',
                        backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF9FF3', '#54A0FF', '#5F27CD', '#FF6348', '#2ED573'][i],
                      }}
                    />
                  ))}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                    className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"
                  >
                    <CheckCircle2 className="w-9 h-9 text-white" />
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl font-bold text-white mb-1"
                  >
                    You're Live! 🎉
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-white/80"
                  >
                    Your AI app is deployed and visible to judges
                  </motion.p>
                </div>
              </div>

              {/* Content area */}
              <div className="px-6 py-5 space-y-4">
                {/* Points badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35, type: 'spring' }}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg"
                  style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(247,148,29,0.08))', border: '1px solid rgba(255,215,0,0.25)' }}
                >
                  <Trophy className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-sm font-bold text-[#FFD700]">+20 Points Earned</span>
                </motion.div>

                {/* URL card */}
                {projectUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-lg p-3 bg-[#161b22] border border-[#30363d]"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <Globe className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Live URL</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2 bg-black/50 rounded-md px-3 py-2 border border-[#30363d]">
                      <span className="text-[11px] text-white/70 truncate flex-1 font-mono select-all">{projectUrl}</span>
                      <button onClick={handleCopyUrl} className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors">
                        {urlCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-2"
                >
                  <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full h-11 text-sm font-bold text-white rounded-lg" style={{ background: 'linear-gradient(135deg, #5865F2, #7289DA)' }}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open My App
                    </Button>
                  </a>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={handleShareNative} variant="outline" className="h-9 text-xs font-medium text-white/70 rounded-lg border-[#30363d] bg-[#161b22] hover:bg-[#21262d] hover:text-white">
                      <Share2 className="w-3.5 h-3.5 mr-1.5" />
                      Share
                    </Button>
                    <Button onClick={handleCopyUrl} variant="outline" className="h-9 text-xs font-medium text-white/70 rounded-lg border-[#30363d] bg-[#161b22] hover:bg-[#21262d] hover:text-white">
                      {urlCopied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                      {urlCopied ? 'Copied!' : 'Copy URL'}
                    </Button>
                  </div>
                  <Button onClick={handleClose} variant="ghost" className="w-full h-9 text-xs text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg mt-1">
                    ← Back to Building
                  </Button>
                </motion.div>
              </div>
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
                <DialogTitle className="flex items-center gap-2 text-lg text-white">
                  <Send className="w-5 h-5 text-[#F7941D]" />
                  Submit Project
                </DialogTitle>
                <DialogDescription className="text-white/50">
                  Publish your AI app to the showcase and judges dashboard.
                </DialogDescription>
              </DialogHeader>

              {showNameInput && (
                <div>
                  <label className="text-sm font-medium text-white mb-1 block">Your Name</label>
                  <Input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="What's your name?"
                    className="bg-black/30 border-[#30363d] text-white" autoFocus />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-white mb-1 block">Project Name</label>
                <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="My AI Chatbot"
                  className="bg-black/30 border-[#30363d] text-white" autoFocus={!showNameInput} />
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-1 block">
                  What does your AI do? <span className="text-white/40 font-normal">(1-2 sentences)</span>
                </label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="My AI helps students study for exams by explaining difficult concepts."
                  rows={2}
                  className="bg-black/30 border-[#30363d] text-white resize-none" />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)' }}>
                <Trophy className="w-4 h-4 text-[#FFD700] flex-shrink-0" />
                <p className="text-xs text-white/70">
                  Submitting earns <strong className="text-[#FFD700]">20 leaderboard points</strong> and sends your project to judges.
                </p>
              </div>

              <Button onClick={handlePublish} disabled={!projectName.trim()}
                className="w-full h-11 text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #C70110, #F7941D)' }}>
                <Send className="w-4 h-4 mr-2" />
                Submit Project 🚀
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
