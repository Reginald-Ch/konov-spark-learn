import { useState, useEffect, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Trophy, ExternalLink, Star, Lock,
  CheckCircle2, Loader2, Send, Flame, Award, Settings2,
} from 'lucide-react';
import { toast } from 'sonner';

const JUDGE_ACCESS_CODE = '2059';

interface Project {
  id: string;
  project_name: string;
  description: string | null;
  author_name: string;
  author_email: string;
  template_id: string | null;
  code: string;
  is_published: boolean;
  points_earned: number;
  created_at: string;
}

const TEMPLATE_META: Record<string, { icon: string; label: string }> = {
  chatbot: { icon: '🤖', label: 'Chatbot' },
  agent: { icon: '🧠', label: 'Agent' },
};

const ProjectCard = memo(({ project, meta, isScored, score, feedbackText, onScoreChange, onFeedbackChange, onSubmitScore, onTogglePublish }: {
  project: Project;
  meta: { icon: string; label: string };
  isScored: boolean;
  score: number | undefined;
  feedbackText: string;
  onScoreChange: (id: string, val: number) => void;
  onFeedbackChange: (id: string, val: string) => void;
  onSubmitScore: (project: Project) => void;
  onTogglePublish: (project: Project) => void;
}) => (
  <div className={`bg-[hsl(var(--discord-dark))] rounded-lg border transition-all ${isScored ? 'border-green-500/30 bg-green-500/5' : 'border-[hsl(var(--discord-light)/0.2)]'}`}>
    <div className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">{project.project_name}</h3>
          <p className="text-xs text-[hsl(var(--discord-text-muted))]">by {project.author_name}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge className="text-[10px]" style={{ backgroundColor: '#5865F220', color: '#5865F2' }}>
            {meta.icon} {meta.label}
          </Badge>
          <Badge className={`text-[10px] ${project.is_published ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
            {project.is_published ? '🟢 Live' : '🔴 Offline'}
          </Badge>
        </div>
      </div>
      {project.description && (
        <p className="text-xs text-[hsl(var(--discord-text-muted))] line-clamp-2 mb-3">{project.description}</p>
      )}
      
      <div className="flex gap-1.5 mb-3">
        <a href={`${window.location.origin}/projects/${project.id}`} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="h-7 text-xs bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)] text-white">
            <ExternalLink className="w-3 h-3 mr-1" /> Try Live
          </Button>
        </a>
        <Button size="sm" variant="outline" onClick={() => onTogglePublish(project)}
          className={`h-7 text-xs ${project.is_published ? 'text-red-400 border-red-500/30 hover:bg-red-500/10' : 'text-green-400 border-green-500/30 hover:bg-green-500/10'}`}>
          {project.is_published ? '⏸ Take Offline' : '▶ Make Live'}
        </Button>
      </div>

      <div className="space-y-2 pt-3 border-t border-[hsl(var(--discord-light)/0.1)]">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))]">Score (0-70)</label>
          {isScored && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[10, 20, 30, 40, 50, 60, 70].map(val => (
            <button key={val} onClick={() => onScoreChange(project.id, val)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${score === val ? 'bg-[#FFD700] text-black' : 'bg-[hsl(var(--discord-darker))] text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light))]'}`}>
              {val}
            </button>
          ))}
        </div>
        <Textarea value={feedbackText} onChange={e => onFeedbackChange(project.id, e.target.value)}
          placeholder="Optional feedback..." rows={2}
          className="text-xs bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)] text-white resize-none" />
        <Button size="sm" onClick={() => onSubmitScore(project)} disabled={score === undefined}
          className="w-full h-8 text-xs font-bold"
          style={{ background: score !== undefined ? 'hsl(var(--secondary))' : undefined }}>
          <Send className="w-3 h-3 mr-1" /> {isScored ? 'Update Score' : 'Submit Score'}
        </Button>
      </div>
    </div>
  </div>
));
ProjectCard.displayName = 'ProjectCard';

export const JudgeDashboardPanel = () => {
  const [accessCode, setAccessCode] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [submittedScores, setSubmittedScores] = useState<Set<string>>(new Set());
  const [judgeName, setJudgeName] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('judge-authenticated');
    const storedName = sessionStorage.getItem('judge-name');
    if (stored === 'true') {
      setAuthenticated(true);
      if (storedName) setJudgeName(storedName);
      fetchData();
    }
  }, []);

  const handleLogin = () => {
    if (!judgeName.trim()) { toast.error('Please enter your name'); return; }
    if (accessCode.trim() !== JUDGE_ACCESS_CODE) { toast.error('Invalid access code'); return; }
    setAuthenticated(true);
    sessionStorage.setItem('judge-authenticated', 'true');
    sessionStorage.setItem('judge-name', judgeName);
    fetchData();
    toast.success('Welcome, Judge!');
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projectsRes, existingScores] = await Promise.all([
        supabase.from('ai_projects').select('id, project_name, description, author_name, author_email, template_id, is_published, points_earned, created_at, code').order('created_at', { ascending: false }).limit(100),
        supabase.from('point_events').select('participant_email, points, metadata').eq('event_type', 'judge_score').limit(500),
      ]);
      if (projectsRes.data) setProjects(projectsRes.data as Project[]);
      if (existingScores.data) {
        const scored = new Set<string>();
        const scoreMap: Record<string, number> = {};
        (existingScores.data as any[]).forEach((evt: any) => {
          if (evt.metadata?.project_id) {
            scored.add(evt.metadata.project_id);
            scoreMap[evt.metadata.project_id] = evt.points;
          }
        });
        setSubmittedScores(scored);
        setScores(prev => ({ ...prev, ...scoreMap }));
      }
    } catch (e) {
      console.error('Failed to fetch data:', e);
      toast.error('Failed to load data. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmitScore = useCallback(async (project: Project) => {
    const score = scores[project.id];
    if (score === undefined || score < 0 || score > 70) {
      toast.error('Score must be between 0 and 70');
      return;
    }
    try {
      // Delete any existing judge score for this specific project first (prevents score inflation)
      await supabase
        .from('point_events')
        .delete()
        .eq('event_type', 'judge_score')
        .eq('participant_email', project.author_email)
        .filter('metadata->>project_id', 'eq', project.id);

      const { error } = await supabase.from('point_events').insert({
        participant_email: project.author_email,
        event_type: 'judge_score',
        points: score,
        metadata: {
          project_id: project.id,
          project_name: project.project_name,
          judge_name: judgeName,
          feedback: feedback[project.id] || '',
        },
      });
      if (error) {
        console.error('Score insert error:', error);
        toast.error(`Failed to submit score: ${error.message}`);
        return;
      }
      setSubmittedScores(prev => new Set([...prev, project.id]));
      toast.success(`Score submitted for ${project.project_name}`);
    } catch (e: any) {
      console.error('Score submit exception:', e);
      toast.error(`Failed to submit score: ${e?.message || 'Unknown error'}`);
    }
  }, [scores, feedback, judgeName]);

  const handleTogglePublish = useCallback(async (project: Project) => {
    try {
      const newStatus = !project.is_published;
      const { error } = await supabase.from('ai_projects').update({ is_published: newStatus }).eq('id', project.id);
      if (error) throw error;
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_published: newStatus } : p));
      toast.success(newStatus ? 'Project is now LIVE' : 'Project taken offline');
    } catch (e) { toast.error('Failed to update project status'); }
  }, []);

  const handleScoreChange = useCallback((id: string, val: number) => {
    setScores(prev => ({ ...prev, [id]: val }));
  }, []);

  const handleFeedbackChange = useCallback((id: string, val: string) => {
    setFeedback(prev => ({ ...prev, [id]: val }));
  }, []);

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="bg-[hsl(var(--discord-darker))] rounded-xl border border-[hsl(var(--discord-light)/0.3)] max-w-sm w-full p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFD700, #F7941D)' }}>
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Judge Dashboard</h2>
            <p className="text-sm text-[hsl(var(--discord-text-muted))]">Enter access code to continue</p>
          </div>
          <div className="space-y-3">
            <Input value={judgeName} onChange={e => setJudgeName(e.target.value)} placeholder="Your name"
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white" />
            <Input value={accessCode} onChange={e => setAccessCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Access code" type="password" className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white" />
            <Button onClick={handleLogin} className="w-full bg-secondary hover:bg-secondary/90">
              <Lock className="w-4 h-4 mr-2" /> Enter Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFD700, #F7941D)' }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Judge Dashboard</h1>
            <p className="text-xs text-[hsl(var(--discord-text-muted))]">Welcome, {judgeName}</p>
          </div>
        </div>
        <Badge className="bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30">{projects.length} Projects</Badge>
      </div>

      {/* Event setup, daily challenges, Forge Coins, and reward boxes now live in the
          passphrase-gated Admin Panel — this view stays focused on scoring submitted projects. */}
      <Link to="/admin" className="flex items-center justify-between gap-3 bg-[hsl(var(--discord-darker))] rounded-lg p-4 border border-[hsl(var(--discord-light)/0.2)] hover:border-[hsl(var(--discord-light)/0.4)] transition-colors">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-[#F7941D]" />
          <span className="text-sm text-white">Manage events, daily challenges, Forge Coins & reward boxes</span>
        </div>
        <span className="text-xs text-[hsl(var(--discord-text-muted))]">Open Admin Panel →</span>
      </Link>

      {/* Projects to Score */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Award className="w-5 h-5 text-[#FFD700]" /> Projects to Score
          <span className="text-xs text-[hsl(var(--discord-text-muted))] font-normal ml-2">Max 70 points per project</span>
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--discord-blurple))]" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-[hsl(var(--discord-text-muted))]">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No published projects yet</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                meta={TEMPLATE_META[project.template_id || ''] || { icon: '📦', label: 'Project' }}
                isScored={submittedScores.has(project.id)}
                score={scores[project.id]}
                feedbackText={feedback[project.id] || ''}
                onScoreChange={handleScoreChange}
                onFeedbackChange={handleFeedbackChange}
                onSubmitScore={handleSubmitScore}
                onTogglePublish={handleTogglePublish}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
