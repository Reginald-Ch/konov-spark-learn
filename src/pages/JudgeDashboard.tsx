import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Trophy, ExternalLink, Star, Users, Play, Eye, Lock,
  CheckCircle2, Loader2, Send, ArrowLeft, Rocket, Flame, Award
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

// Access code validated server-side in production; client-side gate for hackathon convenience
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
  status: 'upcoming' | 'live' | 'ended';
  start_date: string;
  end_date: string;
  current_participants: number;
}

const TEMPLATE_META: Record<string, { icon: string; label: string }> = {
  chatbot: { icon: '🤖', label: 'Chatbot' },
  agent: { icon: '🧠', label: 'Agent' },
};

const JudgeDashboard = () => {
  const [accessCode, setAccessCode] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [projects, setProjects] = useState<(Project & { is_published: boolean })[]>([]);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
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
    if (accessCode.trim() === JUDGE_ACCESS_CODE) {
      if (!judgeName.trim()) { toast.error('Please enter your name'); return; }
      setAuthenticated(true);
      sessionStorage.setItem('judge-authenticated', 'true');
      sessionStorage.setItem('judge-name', judgeName);
      fetchData();
      toast.success('Welcome, Judge!');
    } else {
      toast.error('Invalid access code');
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [projectsRes, hackathonsRes, existingScores] = await Promise.all([
        supabase.from('ai_projects').select('*').order('created_at', { ascending: false }),
        supabase.from('hackathons').select('*').order('start_date', { ascending: false }),
        supabase.from('point_events').select('*').eq('event_type', 'judge_score') as any,
      ]);
      if (projectsRes.data) setProjects(projectsRes.data);
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
  };

  const handleSubmitScore = async (project: Project) => {
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
      } as any);
      if (error) throw error;
      setSubmittedScores(prev => new Set([...prev, project.id]));
      toast.success(`Score submitted for ${project.project_name}`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to submit score');
    }
  };

  const handleGoLive = async (hackathonId: string) => {
    try {
      const { error } = await supabase
        .from('hackathons')
        .update({ status: 'live' } as any)
        .eq('id', hackathonId);
      if (error) throw error;
      toast.success('Hackathon is now LIVE!');
      fetchData();
    } catch (e) {
      toast.error('Failed to update hackathon status');
    }
  };

  const handleEndHackathon = async (hackathonId: string) => {
    try {
      const { error } = await supabase
        .from('hackathons')
        .update({ status: 'ended' } as any)
        .eq('id', hackathonId);
      if (error) throw error;
      toast.success('Hackathon ended');
      fetchData();
    } catch (e) {
      toast.error('Failed to end hackathon');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[hsl(var(--discord-darker))] flex items-center justify-center p-4">
        <SEO title="Judge Dashboard - FORGE" description="Judge dashboard for hackathon scoring" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[hsl(var(--discord-dark))] rounded-xl border border-[hsl(var(--discord-light)/0.3)] max-w-sm w-full p-6"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FFD700, #F7941D)' }}>
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Judge Dashboard</h2>
            <p className="text-sm text-[hsl(var(--discord-text-muted))]">Enter access code to continue</p>
          </div>
          <div className="space-y-3">
            <Input
              value={judgeName}
              onChange={e => setJudgeName(e.target.value)}
              placeholder="Your name"
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white"
            />
            <Input
              value={accessCode}
              onChange={e => setAccessCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Access code"
              type="password"
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white"
            />
            <Button onClick={handleLogin} className="w-full" style={{ background: 'linear-gradient(135deg, #FFD700, #F7941D)' }}>
              <Lock className="w-4 h-4 mr-2" /> Enter Dashboard
            </Button>
          </div>
          <Link to="/hackathons" className="block text-center mt-4 text-xs text-[hsl(var(--discord-text-muted))] hover:text-white">
            <ArrowLeft className="w-3 h-3 inline mr-1" /> Back to FORGE
          </Link>
        </motion.div>
      </div>
    );
  }

  const handleTogglePublish = async (project: Project) => {
    try {
      const newStatus = !project.is_published;
      const { error } = await supabase
        .from('ai_projects')
        .update({ is_published: newStatus } as any)
        .eq('id', project.id);
      if (error) throw error;
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_published: newStatus } : p));
      toast.success(newStatus ? 'Project is now LIVE' : 'Project taken offline');
    } catch (e) {
      toast.error('Failed to update project status');
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--discord-darker))]">
      <SEO title="Judge Dashboard - FORGE" description="Judge dashboard for hackathon scoring" />
      
      {/* Header */}
      <div className="border-b border-[hsl(var(--discord-light)/0.2)] bg-[hsl(var(--discord-dark))]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFD700, #F7941D)' }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Judge Dashboard</h1>
              <p className="text-xs text-[hsl(var(--discord-text-muted))]">Welcome, {judgeName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30">{projects.length} Projects</Badge>
            <Link to="/hackathons">
              <Button size="sm" variant="ghost" className="text-[hsl(var(--discord-text-muted))] hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-1" /> FORGE
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Hackathon Controls */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Rocket className="w-5 h-5 text-[#F7941D]" /> Hackathon Control
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {hackathons.map(h => (
              <div key={h.id} className="bg-[hsl(var(--discord-dark))] rounded-lg p-4 border border-[hsl(var(--discord-light)/0.2)]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white text-sm">{h.title}</h3>
                  <Badge className={
                    h.status === 'live' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    h.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                    'bg-gray-500/20 text-gray-400 border-gray-500/30'
                  }>
                    {h.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-[hsl(var(--discord-text-muted))] mb-3">
                  <Users className="w-3 h-3 inline mr-1" /> {h.current_participants} participants
                </p>
                <div className="flex gap-2">
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
                </div>
              </div>
            ))}
            {hackathons.length === 0 && (
              <p className="text-[hsl(var(--discord-text-muted))] text-sm col-span-full">No hackathons found</p>
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
              {projects.map(project => {
                const meta = TEMPLATE_META[project.template_id || ''] || { icon: '📦', label: 'Project' };
                const isScored = submittedScores.has(project.id);
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-[hsl(var(--discord-dark))] rounded-lg border transition-all ${
                      isScored ? 'border-green-500/30 bg-green-500/5' : 'border-[hsl(var(--discord-light)/0.2)]'
                    }`}
                  >
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
                      
                      {/* Actions */}
                      <div className="flex gap-1.5 mb-3">
                        <a href={`${window.location.origin}/projects/${project.id}`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="h-7 text-xs bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)] text-white">
                            <ExternalLink className="w-3 h-3 mr-1" /> Try Live
                          </Button>
                        </a>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleTogglePublish(project)}
                          className={`h-7 text-xs ${project.is_published ? 'text-red-400 border-red-500/30 hover:bg-red-500/10' : 'text-green-400 border-green-500/30 hover:bg-green-500/10'}`}
                        >
                          {project.is_published ? '⏸ Take Offline' : '▶ Make Live'}
                        </Button>
                      </div>

                      {/* Scoring */}
                      <div className="space-y-2 pt-3 border-t border-[hsl(var(--discord-light)/0.1)]">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))]">Score (0-25)</label>
                          {isScored && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                        </div>
                        <div className="flex items-center gap-2">
                          {[5, 10, 15, 20, 25].map(val => (
                            <button
                              key={val}
                              onClick={() => setScores(prev => ({ ...prev, [project.id]: val }))}
                              disabled={isScored}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                scores[project.id] === val
                                  ? 'bg-[#FFD700] text-black'
                                  : 'bg-[hsl(var(--discord-darker))] text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light))]'
                              } ${isScored ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                        <Textarea
                          value={feedback[project.id] || ''}
                          onChange={e => setFeedback(prev => ({ ...prev, [project.id]: e.target.value }))}
                          placeholder="Optional feedback..."
                          disabled={isScored}
                          rows={2}
                          className="text-xs bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)] text-white resize-none"
                        />
                        {!isScored && (
                          <Button
                            size="sm"
                            onClick={() => handleSubmitScore(project)}
                            disabled={scores[project.id] === undefined}
                            className="w-full h-8 text-xs font-bold"
                            style={{ background: scores[project.id] !== undefined ? 'linear-gradient(135deg, #FFD700, #F7941D)' : undefined }}
                          >
                            <Send className="w-3 h-3 mr-1" /> Submit Score
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JudgeDashboard;
