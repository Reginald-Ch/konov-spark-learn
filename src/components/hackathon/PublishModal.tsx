import { useState, useEffect, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Rocket, Trophy, Link2, Loader2, CheckCircle2, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  templateId: string | null;
  projectName?: string;
  description?: string;
}

export const PublishModal = ({ isOpen, onClose, code, templateId, projectName: prefillName, description: prefillDesc }: PublishModalProps) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (prefillName) setProjectName(prefillName);
      if (prefillDesc) setDescription(prefillDesc);
    }
  }, [isOpen, prefillName, prefillDesc]);

  const projectUrl = publishedId ? `${window.location.origin}/projects/${publishedId}` : '';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(projectUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
    toast.success('URL copied!');
  };

  const handlePublish = async () => {
    if (!projectName.trim() || !authorName.trim() || !authorEmail.trim()) {
      toast.error('Please fill in all required fields!');
      return;
    }

    setIsPublishing(true);
    try {
      const { data, error } = await supabase
        .from('ai_projects' as any)
        .insert({
          project_name: projectName,
          description,
          code,
          template_id: templateId,
          author_name: authorName,
          author_email: authorEmail,
          demo_url: demoUrl || null,
          is_published: true,
          points_earned: 10,
        })
        .select('id')
        .single();

      if (error) throw error;

      setPublishedId((data as any)?.id || null);
      setIsPublished(true);
      toast.success('🎉 Project published! You earned 10 points!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to publish. Try again!');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    setIsPublished(false);
    setPublishedId(null);
    setProjectName('');
    setDescription('');
    setAuthorName('');
    setAuthorEmail('');
    setDemoUrl('');
    setUrlCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Rocket className="w-5 h-5 text-[hsl(var(--discord-blurple))]" />
            Deploy to Production
          </DialogTitle>
          <DialogDescription className="text-[hsl(var(--discord-text-muted))]">
            Publish your AI project and get a shareable demo URL.
          </DialogDescription>
        </DialogHeader>

        {isPublished ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[hsl(var(--discord-green)/0.2)] flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-[hsl(var(--discord-green))]" />
            </div>
            <h3 className="text-2xl font-bold mb-2">🚀 Deployed!</h3>
            <p className="text-[hsl(var(--discord-text-muted))] mb-4">
              Your project is live! You earned <span className="text-[hsl(var(--discord-yellow))] font-bold">10 points</span>.
            </p>

            {/* Shareable URL */}
            {projectUrl && (
              <div className="bg-[hsl(var(--discord-dark))] rounded-lg p-3 mb-4 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[hsl(var(--discord-blurple))] flex-shrink-0" />
                <span className="text-xs text-[hsl(var(--discord-text))] truncate flex-1 text-left font-mono">{projectUrl}</span>
                <Button size="icon" variant="ghost" onClick={handleCopyUrl} className="h-7 w-7 flex-shrink-0">
                  {urlCopied ? <Check className="w-3.5 h-3.5 text-[hsl(var(--discord-green))]" /> : <Copy className="w-3.5 h-3.5 text-[hsl(var(--discord-text-muted))]" />}
                </Button>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-[hsl(var(--discord-text-muted))] mb-6">
              <Trophy className="w-4 h-4 text-[hsl(var(--discord-yellow))]" />
              <span>Check the leaderboard to see your ranking!</span>
            </div>
            <Button onClick={handleClose} className="bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]">
              <Sparkles className="w-4 h-4 mr-2" />
              Awesome!
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[hsl(var(--discord-text))] mb-1 block">Project Name *</label>
              <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="My AI Chatbot"
                className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.3)] text-white" />
            </div>
            <div>
              <label className="text-sm font-medium text-[hsl(var(--discord-text))] mb-1 block">Description</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does your project do?" rows={2}
                className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.3)] text-white resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[hsl(var(--discord-text))] mb-1 block">Your Name *</label>
                <Input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Ada Lovelace"
                  className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.3)] text-white" />
              </div>
              <div>
                <label className="text-sm font-medium text-[hsl(var(--discord-text))] mb-1 block">Email *</label>
                <Input value={authorEmail} onChange={e => setAuthorEmail(e.target.value)} placeholder="you@email.com" type="email"
                  className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.3)] text-white" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[hsl(var(--discord-text))] mb-1 block">Demo URL (optional)</label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--discord-text-muted))]" />
                <Input value={demoUrl} onChange={e => setDemoUrl(e.target.value)} placeholder="https://your-demo.streamlit.app"
                  className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.3)] text-white pl-10" />
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--discord-blurple)/0.1)] border border-[hsl(var(--discord-blurple)/0.2)]">
              <Trophy className="w-5 h-5 text-[hsl(var(--discord-yellow))] flex-shrink-0" />
              <p className="text-xs text-[hsl(var(--discord-text))]">
                Publishing earns you <strong>10 leaderboard points</strong> and a shareable project page!
              </p>
            </div>
            <Button onClick={handlePublish} disabled={isPublishing || !projectName.trim() || !authorName.trim() || !authorEmail.trim()}
              className="w-full h-11 text-base font-bold" style={{ background: 'linear-gradient(135deg, #C70110, #F7941D)' }}>
              {isPublishing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deploying...</>
              ) : (
                <><Rocket className="w-4 h-4 mr-2" />Deploy to Production 🚀</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
