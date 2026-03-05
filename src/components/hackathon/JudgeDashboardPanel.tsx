import { useState, useEffect, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Shield, Trophy, ExternalLink, Star, Users, Play, Lock,
  CheckCircle2, Loader2, Send, Rocket, Flame, Award,
  Plus, Pencil, Trash2, Calendar, AlertTriangle
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

interface Hackathon {
  id: string;
  title: string;
  description: string | null;
  theme: string | null;
  status: 'upcoming' | 'live' | 'ended';
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_participants: number;
  current_participants: number;
  prizes: string | null;
  rules: string | null;
}

const TEMPLATE_META: Record<string, { icon: string; label: string }> = {
  chatbot: { icon: '🤖', label: 'Chatbot' },
  agent: { icon: '🧠', label: 'Agent' },
};

const emptyHackathon = (): Partial<Hackathon> => ({
  title: '',
  description: '',
  theme: '',
  start_date: new Date().toISOString().slice(0, 16),
  end_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  registration_deadline: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 16),
  max_participants: 100,
  prizes: '',
  rules: '',
});

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
          <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))]">Score (0-25)</label>
          {isScored && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
        </div>
        <div className="flex items-center gap-2">
          {[5, 10, 15, 20, 25].map(val => (
            <button key={val} onClick={() => onScoreChange(project.id, val)} disabled={isScored}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${score === val ? 'bg-[#FFD700] text-black' : 'bg-[hsl(var(--discord-darker))] text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light))]'} ${isScored ? 'opacity-60 cursor-not-allowed' : ''}`}>
              {val}
            </button>
          ))}
        </div>
        <Textarea value={feedbackText} onChange={e => onFeedbackChange(project.id, e.target.value)}
          placeholder="Optional feedback..." disabled={isScored} rows={2}
          className="text-xs bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)] text-white resize-none" />
        {!isScored && (
          <Button size="sm" onClick={() => onSubmitScore(project)} disabled={score === undefined}
            className="w-full h-8 text-xs font-bold"
            style={{ background: score !== undefined ? 'linear-gradient(135deg, #FFD700, #F7941D)' : undefined }}>
            <Send className="w-3 h-3 mr-1" /> Submit Score
          </Button>
        )}
      </div>
    </div>
  </div>
));
ProjectCard.displayName = 'ProjectCard';

interface JudgeDashboardPanelProps {
  onRefreshHackathons?: () => void;
}

export const JudgeDashboardPanel = ({ onRefreshHackathons }: JudgeDashboardPanelProps) => {
  const [accessCode, setAccessCode] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [submittedScores, setSubmittedScores] = useState<Set<string>>(new Set());
  const [judgeName, setJudgeName] = useState('');

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState<Partial<Hackathon>>(emptyHackathon());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deleteEventTarget, setDeleteEventTarget] = useState<Hackathon | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

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
      const [projectsRes, hackathonsRes, existingScores] = await Promise.all([
        supabase.from('ai_projects').select('id, project_name, description, author_name, author_email, template_id, is_published, points_earned, created_at, code').eq('is_published', true).order('created_at', { ascending: false }).limit(100),
        supabase.from('hackathons').select('id, title, description, theme, status, start_date, end_date, registration_deadline, max_participants, current_participants, prizes, rules').order('start_date', { ascending: false }).limit(50),
        supabase.from('point_events').select('participant_email, points, metadata').eq('event_type', 'judge_score').limit(500),
      ]);
      if (projectsRes.data) setProjects(projectsRes.data as Project[]);
      if (hackathonsRes.data) setHackathons(hackathonsRes.data as Hackathon[]);
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
    if (score === undefined || score < 0 || score > 25) {
      toast.error('Score must be between 0 and 25');
      return;
    }
    try {
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
      if (error) throw error;
      setSubmittedScores(prev => new Set([...prev, project.id]));
      toast.success(`Score submitted for ${project.project_name}`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to submit score');
    }
  }, [scores, feedback, judgeName]);

  const handleGoLive = useCallback(async (hackathonId: string) => {
    try {
      // Find the hackathon to calculate original duration
      const hackathon = hackathons.find(h => h.id === hackathonId);
      const now = new Date();
      let updatePayload: Record<string, string> = { status: 'live' };
      
      if (hackathon) {
        const originalStart = new Date(hackathon.start_date);
        const originalEnd = new Date(hackathon.end_date);
        const durationMs = originalEnd.getTime() - originalStart.getTime();
        // Set start to now, end to now + original duration so timer counts down properly
        updatePayload.start_date = now.toISOString();
        updatePayload.end_date = new Date(now.getTime() + durationMs).toISOString();
      }
      
      const { error } = await supabase.from('hackathons').update(updatePayload).eq('id', hackathonId);
      if (error) throw error;
      toast.success('Hackathon is now LIVE! Timer started.');
      fetchData();
      onRefreshHackathons?.();
    } catch (e) { toast.error('Failed to update hackathon status'); }
  }, [fetchData, onRefreshHackathons, hackathons]);

  const handleEndHackathon = useCallback(async (hackathonId: string) => {
    try {
      const { error } = await supabase.from('hackathons').update({ status: 'ended' }).eq('id', hackathonId);
      if (error) throw error;
      toast.success('Hackathon ended');
      fetchData();
      onRefreshHackathons?.();
    } catch (e) { toast.error('Failed to end hackathon'); }
  }, [fetchData, onRefreshHackathons]);

  const openCreateEvent = () => {
    setEditingEventId(null);
    setEventForm(emptyHackathon());
    setEventModalOpen(true);
  };

  const openEditEvent = (h: Hackathon) => {
    setEditingEventId(h.id);
    setEventForm({
      title: h.title,
      description: h.description || '',
      theme: h.theme || '',
      start_date: h.start_date.slice(0, 16),
      end_date: h.end_date.slice(0, 16),
      registration_deadline: h.registration_deadline.slice(0, 16),
      max_participants: h.max_participants,
      prizes: h.prizes || '',
      rules: h.rules || '',
    });
    setEventModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title?.trim()) { toast.error('Title is required'); return; }
    setIsSavingEvent(true);
    try {
      const payload = {
        title: eventForm.title,
        description: eventForm.description || null,
        theme: eventForm.theme || null,
        start_date: new Date(eventForm.start_date!).toISOString(),
        end_date: new Date(eventForm.end_date!).toISOString(),
        registration_deadline: new Date(eventForm.registration_deadline!).toISOString(),
        max_participants: eventForm.max_participants || 100,
        prizes: eventForm.prizes || null,
        rules: eventForm.rules || null,
      };

      if (editingEventId) {
        const { error } = await supabase.from('hackathons').update(payload as any).eq('id', editingEventId);
        if (error) throw error;
        toast.success('Event updated');
      } else {
        const { error } = await supabase.from('hackathons').insert(payload as any);
        if (error) throw error;
        toast.success('Event created');
      }
      setEventModalOpen(false);
      fetchData();
      onRefreshHackathons?.();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save event');
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventTarget) return;
    try {
      const { error } = await supabase.from('hackathons').delete().eq('id', deleteEventTarget.id);
      if (error) throw error;
      toast.success('Event deleted');
      setDeleteEventTarget(null);
      fetchData();
      onRefreshHackathons?.();
    } catch (e) {
      toast.error('Failed to delete event');
    }
  };

  const handleTogglePublish = useCallback(async (project: Project) => {
    try {
      const newStatus = !project.is_published;
      const { error } = await supabase.from('ai_projects').update({ is_published: newStatus } as any).eq('id', project.id);
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
            <Button onClick={handleLogin} className="w-full" style={{ background: 'linear-gradient(135deg, #FFD700, #F7941D)' }}>
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

      {/* Hackathon Controls */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Rocket className="w-5 h-5 text-[#F7941D]" /> Hackathon Control
          </h2>
          <Button size="sm" onClick={openCreateEvent} className="h-8 text-xs bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)] text-white">
            <Plus className="w-3 h-3 mr-1" /> Create Event
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {hackathons.map(h => (
            <div key={h.id} className="bg-[hsl(var(--discord-darker))] rounded-lg p-4 border border-[hsl(var(--discord-light)/0.2)]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white text-sm truncate flex-1 mr-2">{h.title}</h3>
                <Badge className={
                  h.status === 'live' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  h.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                  'bg-gray-500/20 text-gray-400 border-gray-500/30'
                }>
                  {h.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-[hsl(var(--discord-text-muted))] mb-1">
                <Users className="w-3 h-3 inline mr-1" /> {h.current_participants} participants
              </p>
              <p className="text-xs text-[hsl(var(--discord-text-muted))] mb-3">
                <Calendar className="w-3 h-3 inline mr-1" /> {new Date(h.start_date).toLocaleDateString()} — {new Date(h.end_date).toLocaleDateString()}
              </p>
              <div className="flex gap-2 flex-wrap">
                {h.status === 'upcoming' && (
                  <Button size="sm" onClick={() => handleGoLive(h.id)} className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white">
                    <Play className="w-3 h-3 mr-1" /> Go Live
                  </Button>
                )}
                {h.status === 'live' && (
                  <Button size="sm" onClick={() => handleEndHackathon(h.id)} className="flex-1 h-8 text-xs bg-red-600 hover:bg-red-700 text-white">
                    End Hackathon
                  </Button>
                )}
                {h.status === 'ended' && (
                  <Button size="sm" onClick={() => handleGoLive(h.id)} className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                    <Play className="w-3 h-3 mr-1" /> Restart
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openEditEvent(h)}
                  className="h-8 text-xs border-[hsl(var(--discord-light)/0.3)] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.2)]">
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteEventTarget(h)}
                  className="h-8 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          {hackathons.length === 0 && (
            <div className="col-span-full text-center py-8">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-[hsl(var(--discord-text-muted))] opacity-50" />
              <p className="text-[hsl(var(--discord-text-muted))] text-sm mb-3">No hackathon events yet</p>
              <Button size="sm" onClick={openCreateEvent} className="bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)] text-white">
                <Plus className="w-3 h-3 mr-1" /> Create Your First Event
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Projects to Score */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Award className="w-5 h-5 text-[#FFD700]" /> Projects to Score
          <span className="text-xs text-[hsl(var(--discord-text-muted))] font-normal ml-2">Max 25 points per project</span>
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

      {/* Create/Edit Event Modal */}
      <Dialog open={eventModalOpen} onOpenChange={setEventModalOpen}>
        <DialogContent className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.3)] text-white sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              {editingEventId ? <Pencil className="w-5 h-5 text-[#F7941D]" /> : <Plus className="w-5 h-5 text-[hsl(var(--discord-green))]" />}
              {editingEventId ? 'Edit Event' : 'Create New Event'}
            </DialogTitle>
            <DialogDescription className="text-[hsl(var(--discord-text-muted))]">
              {editingEventId ? 'Update hackathon event details.' : 'Set up a new hackathon event for participants.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-white mb-1 block">Title *</label>
              <Input value={eventForm.title || ''} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                placeholder="AI Innovation Hackathon" className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white" />
            </div>
            <div>
              <label className="text-sm font-medium text-white mb-1 block">Description</label>
              <Textarea value={eventForm.description || ''} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Build innovative AI solutions..." rows={2}
                className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-white mb-1 block">Theme</label>
                <Input value={eventForm.theme || ''} onChange={e => setEventForm(f => ({ ...f, theme: e.target.value }))}
                  placeholder="Education, Health..." className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white" />
              </div>
              <div>
                <label className="text-sm font-medium text-white mb-1 block">Max Participants</label>
                <Input type="number" value={eventForm.max_participants || 100} onChange={e => setEventForm(f => ({ ...f, max_participants: parseInt(e.target.value) || 100 }))}
                  className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-white mb-1 block">Start Date</label>
                <Input type="datetime-local" value={eventForm.start_date || ''} onChange={e => setEventForm(f => ({ ...f, start_date: e.target.value }))}
                  className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white" />
              </div>
              <div>
                <label className="text-sm font-medium text-white mb-1 block">End Date</label>
                <Input type="datetime-local" value={eventForm.end_date || ''} onChange={e => setEventForm(f => ({ ...f, end_date: e.target.value }))}
                  className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-white mb-1 block">Registration Deadline</label>
              <Input type="datetime-local" value={eventForm.registration_deadline || ''} onChange={e => setEventForm(f => ({ ...f, registration_deadline: e.target.value }))}
                className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white" />
            </div>
            <div>
              <label className="text-sm font-medium text-white mb-1 block">Prizes</label>
              <Textarea value={eventForm.prizes || ''} onChange={e => setEventForm(f => ({ ...f, prizes: e.target.value }))}
                placeholder="1st: Certificate + Feature, 2nd: Certificate..." rows={2}
                className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-white mb-1 block">Rules</label>
              <Textarea value={eventForm.rules || ''} onChange={e => setEventForm(f => ({ ...f, rules: e.target.value }))}
                placeholder="1. Teams of 1-5 members..." rows={2}
                className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white resize-none" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEventModalOpen(false)} className="flex-1 text-[hsl(var(--discord-text-muted))]">Cancel</Button>
              <Button onClick={handleSaveEvent} disabled={isSavingEvent} className="flex-1"
                style={{ background: 'linear-gradient(135deg, #FFD700, #F7941D)' }}>
                {isSavingEvent ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {editingEventId ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Event Confirmation */}
      <Dialog open={!!deleteEventTarget} onOpenChange={() => setDeleteEventTarget(null)}>
        <DialogContent className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.3)] text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-red-400" /> Delete Event
            </DialogTitle>
            <DialogDescription className="text-[hsl(var(--discord-text-muted))]">
              Are you sure you want to delete "{deleteEventTarget?.title}"? This will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" onClick={() => setDeleteEventTarget(null)} className="flex-1 text-[hsl(var(--discord-text-muted))]">Cancel</Button>
            <Button onClick={handleDeleteEvent} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
