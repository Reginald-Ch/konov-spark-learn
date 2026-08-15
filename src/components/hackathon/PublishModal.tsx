import { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Rocket, Trophy, Loader2, CheckCircle2, Copy, Check, ExternalLink, Share2, Globe, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ensureHackathonRegistration } from '@/lib/identity';

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
  lastKnownUpdatedAt?: string | null;
  onUpdatedAtChange?: (updatedAt: string | null) => void;
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

export const PublishModal = forwardRef<HTMLDivElement, PublishModalProps>(({ isOpen, onClose, code, templateId, projectName: prefillName, description: prefillDesc, prefillEmail, prefillAuthorName, currentProjectId, onProjectIdUpdate, lastKnownUpdatedAt, onUpdatedAtChange }, ref) => {
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
      setProjectName(prefillName || '');
      setDescription(prefillDesc || '');
      setAuthorEmail(prefillEmail || '');
      setAuthorName(prefillAuthorName || '');
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
    // Lowercase — matches every other identity-aware surface (registration,
    // Lessons, Community, Daily Challenges). Inconsistent casing here would
    // fragment this author's projects/points from the rest of their identity.
    const finalEmail = (authorEmail.trim() || prefillEmail || `student-${Math.random().toString(36).slice(2, 8)}@forge.local`).toLowerCase();
    
    if (finalName && !finalName.startsWith('Student-')) {
      localStorage.setItem('forge-student-name', finalName);
    }
    if (finalEmail) {
      localStorage.setItem('forge-student-email', finalEmail);
    }

    // Seeds the organizer's roster (CoinsTab, LessonsLeaderboard) for
    // whoever's publishing right now, even if they skipped "Register for
    // Hackathon" and came straight to Templates -> Build -> Publish — the
    // default flow most students actually take. Only for a genuine
    // identity (not the auto-generated Student-XXXX / *@forge.local
    // fallback), so this never pollutes the roster with ghost accounts.
    // Fire-and-forget — never blocks the publish flow on it.
    if (finalName && !finalName.startsWith('Student-') && finalEmail && !finalEmail.endsWith('@forge.local')) {
      supabase.from('hackathons').select('id').eq('status', 'live').order('start_date', { ascending: false }).limit(1).maybeSingle()
        .then(({ data }) => ensureHackathonRegistration(finalEmail, finalName, data?.id || null));
    }

    setDeployStep('deploying');
    setDeployMsgIndex(0);

    try {
      await new Promise(r => setTimeout(r, 3000));
      let resultId: string | null = null;

      if (currentProjectId) {
        // Re-publishing an existing project: leave hackathon_id exactly as it
        // was set at creation. Re-stamping here would risk silently moving a
        // project to a different event if the live hackathon changed between
        // saves (e.g. organizer ended one event and started the next).
        // Routed through the owner-checked RPC — the open UPDATE policy this
        // used to rely on let anyone publish/overwrite anyone's project.
        // p_expected_updated_at guards Go Live the same way ProjectEditor's
        // own Save already does — without it, publishing from a stale tab
        // could silently overwrite a newer save made elsewhere.
        const { data: updateData, error } = await supabase.rpc('save_own_project', {
          p_project_id: currentProjectId,
          p_participant_email: finalEmail,
          p_project_name: projectName,
          p_description: description,
          p_code: code,
          p_template_id: templateId,
          p_author_name: finalName,
          p_publish: true,
          p_expected_updated_at: lastKnownUpdatedAt,
        });

        if (error?.message?.includes('CONFLICT')) {
          toast.error('This project changed elsewhere since you last loaded it. Reload the page to see the latest version before going live.', { duration: 10000 });
          setDeployStep('form');
          return;
        }
        if (error || !updateData) {
          console.warn('Update failed for project', currentProjectId, ':', error?.message);
          toast.error('Could not update existing project. Please try saving again.');
          setDeployStep('form');
          return;
        } else {
          resultId = currentProjectId;
          // Keep the editor's save-conflict baseline in sync — without this,
          // the very next "Save Checkpoint" after publishing would compare
          // against the pre-publish timestamp and false-positive a conflict.
          if (onUpdatedAtChange) onUpdatedAtChange(updateData.updated_at ?? null);
        }
      } else {
        // New project: attach it to whichever hackathon is currently live, so
        // judging and the leaderboard can scope to "this event" instead of
        // showing every project ever published mixed together. No live event
        // = a practice/non-event project, left unattached (null).
        const { data: liveHackathon } = await supabase
          .from('hackathons')
          .select('id')
          .eq('status', 'live')
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data, error } = await supabase
          .from('ai_projects')
          .insert({ project_name: projectName, description, code, template_id: templateId, author_name: finalName, author_email: finalEmail, demo_url: null, is_published: true, hackathon_id: liveHackathon?.id || null })
          .select('id, updated_at')
          .single();
        if (error) throw error;
        resultId = data?.id || null;
        if (resultId) {
          if (onProjectIdUpdate) onProjectIdUpdate(resultId);
          localStorage.setItem('forge-current-project-id', resultId);
          if (onUpdatedAtChange) onUpdatedAtChange(data?.updated_at ?? null);
        }
      }

      setPublishedId(resultId);
      setDeployStep('deployed');
      toast.success('🎉 Your AI is live!');
      // Used to also insert 'project_deployed'/'submitted_on_time' point_events
      // here — confirmed dead: nothing anywhere sums or displays them, pure
      // ledger noise. Removed rather than left generating rows forever.
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
      <DialogContent className="bg-[#0d1117] border-[#30363d] text-white sm:max-w-[420px] p-0 gap-0 z-[100] max-h-[90vh] overflow-y-auto" hideCloseButton={deployStep === 'deploying'}>
        <AnimatePresence mode="wait">
          {/* ── DEPLOYING ANIMATION ── */}
          {deployStep === 'deploying' && (
            <motion.div
              key="deploying"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-10 px-6 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-5 relative">
                <div className="absolute inset-0 rounded-full border-[3px] border-[#30363d]" />
                <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#F7941D] border-r-[#C70110] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-[#F7941D]" />
                </div>
              </div>
              <h3 className="text-base font-bold text-white mb-4">Deploying Your AI...</h3>
              <div className="space-y-1 text-left max-w-[280px] mx-auto">
                {DEPLOY_MESSAGES.slice(0, deployMsgIndex + 1).map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-2 text-xs py-0.5 ${i === deployMsgIndex ? 'text-white font-medium' : 'text-white/35'}`}
                  >
                    {i < deployMsgIndex ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 text-[#F7941D] animate-spin flex-shrink-0" />
                    )}
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
            >
              {/* Success header — compact */}
              <div className="px-5 pt-5 pb-4 text-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                  className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                  style={{ background: '#059669' }}
                >
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </motion.div>
                <h3 className="text-lg font-bold text-white">You're Live! 🎉</h3>
                <p className="text-xs text-white/50 mt-0.5">Your AI app is deployed and visible to judges</p>
              </div>

              {/* Body */}
              <div className="px-5 pb-5 space-y-3">
                {/* Points */}
                <div className="flex items-center justify-center gap-2 py-2 rounded-lg" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}>
                  <Trophy className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-sm font-bold text-[#FFD700]">+15 Points Earned</span>
                </div>

                {/* URL */}
                {projectUrl && (
                  <div className="rounded-lg p-3 bg-[#161b22] border border-[#30363d]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Globe className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Live URL</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2 bg-black/40 rounded px-2.5 py-1.5 border border-[#30363d]">
                      <span className="text-[11px] text-white/60 truncate flex-1 font-mono select-all">{projectUrl}</span>
                      <button onClick={handleCopyUrl} className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors">
                        {urlCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/30" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-1">
                  <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full h-10 text-sm font-bold text-white rounded-lg bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.9)]">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open My App
                    </Button>
                  </a>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={handleShareNative} variant="outline" size="sm" className="text-xs text-white/60 border-[#30363d] bg-[#161b22] hover:bg-[#21262d] hover:text-white">
                      <Share2 className="w-3.5 h-3.5 mr-1.5" />
                      Share
                    </Button>
                    <Button onClick={handleCopyUrl} variant="outline" size="sm" className="text-xs text-white/60 border-[#30363d] bg-[#161b22] hover:bg-[#21262d] hover:text-white">
                      {urlCopied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                      {urlCopied ? 'Copied!' : 'Copy URL'}
                    </Button>
                  </div>
                  <Button onClick={handleClose} variant="ghost" className="w-full h-8 text-xs text-white/30 hover:text-white/60 hover:bg-white/5">
                    ← Back to Building
                  </Button>
                </div>
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
              className="p-5 space-y-3.5"
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base text-white">
                  <Send className="w-4 h-4 text-[#F7941D]" />
                  Submit Project
                </DialogTitle>
                <DialogDescription className="text-white/40 text-xs">
                  Publish your AI app to the showcase and judges dashboard.
                </DialogDescription>
              </DialogHeader>

              {/* Always shown, not just when the cached name "looks" auto-generated —
                  on a shared computer the cached identity could be a previous
                  student's REAL name/email, which looked legitimate enough to
                  stay hidden and get submitted to judges under their name. */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-white/70 mb-1 block">Your Name</label>
                  <Input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="What's your name?"
                    className="h-9 bg-black/30 border-[#30363d] text-white text-sm" autoFocus={showNameInput} />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/70 mb-1 block">Your Email</label>
                  <Input value={authorEmail} onChange={e => setAuthorEmail(e.target.value)} placeholder="you@example.com" type="email"
                    className="h-9 bg-black/30 border-[#30363d] text-white text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-white/70 mb-1 block">Project Name</label>
                <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="My AI Chatbot"
                  className="h-9 bg-black/30 border-[#30363d] text-white text-sm" autoFocus={!showNameInput} />
              </div>

              <div>
                <label className="text-xs font-medium text-white/70 mb-1 block">
                  What does your AI do? <span className="text-white/30 font-normal">(1-2 sentences)</span>
                </label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="My AI helps students study for exams by explaining difficult concepts."
                  rows={2}
                  className="bg-black/30 border-[#30363d] text-white text-sm resize-none" />
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.12)' }}>
                <Trophy className="w-3.5 h-3.5 text-[#FFD700] flex-shrink-0" />
                <p className="text-[11px] text-white/50">
                  Submitting earns <strong className="text-[#FFD700]">15 leaderboard points</strong> and sends your project to judges.
                </p>
              </div>

              <Button onClick={handlePublish} disabled={!projectName.trim()}
                className="w-full h-10 text-sm font-bold text-white bg-primary hover:bg-primary/90">
                <Send className="w-4 h-4 mr-2" />
                Submit Project 🚀
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
});
PublishModal.displayName = 'PublishModal';
