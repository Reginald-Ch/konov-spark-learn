import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Code, User, Calendar, Trophy, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: string;
  project_name: string;
  description: string | null;
  code: string;
  author_name: string;
  template_id: string | null;
  created_at: string;
  demo_url: string | null;
  points_earned: number;
}

const ProjectView = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchProject = async () => {
      const { data, error } = await supabase
        .from('ai_projects' as any)
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single();
      if (!error && data) setProject(data as unknown as Project);
      setIsLoading(false);
    };
    fetchProject();
  }, [id]);

  const handleCopy = () => {
    if (!project) return;
    navigator.clipboard.writeText(project.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copied!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--discord-darker))] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[hsl(var(--discord-blurple))] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[hsl(var(--discord-darker))] flex items-center justify-center text-center p-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Project not found</h1>
          <p className="text-[hsl(var(--discord-text-muted))] mb-4">This project may not exist or hasn't been published yet.</p>
          <Link to="/hackathons">
            <Button className="bg-[hsl(var(--discord-blurple))]">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hackathons
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const typeEmoji = project.template_id === 'chatbot' ? '🤖' : project.template_id === 'voice-assistant' ? '🎙️' : project.template_id === 'agent' ? '🧠' : '💻';

  return (
    <div className="min-h-screen bg-[hsl(var(--discord-darker))]">
      <SEO title={`${project.project_name} - AI Project`} description={project.description || 'An AI project built on the hackathon platform'} />

      {/* Header */}
      <div className="border-b border-[hsl(var(--discord-light)/0.2)] bg-[hsl(var(--discord-dark))]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/hackathons" className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))] hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            {project.demo_url && (
              <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="h-8 text-xs bg-[hsl(var(--discord-green))] text-white">
                  <ExternalLink className="w-3 h-3 mr-1" /> Live Demo
                </Button>
              </a>
            )}
            <Button size="sm" onClick={handleCopy} variant="outline" className="h-8 text-xs border-[hsl(var(--discord-light))] text-[hsl(var(--discord-text))]">
              {copied ? <Check className="w-3 h-3 mr-1 text-[hsl(var(--discord-green))]" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </Button>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <span className="text-4xl">{typeEmoji}</span>
            {project.project_name}
          </h1>
          {project.description && (
            <p className="text-[hsl(var(--discord-text-muted))] text-lg max-w-2xl">{project.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-[hsl(var(--discord-text-muted))]">
            <span className="flex items-center gap-1"><User className="w-4 h-4" /> {project.author_name}</span>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(project.created_at).toLocaleDateString()}</span>
            <span className="flex items-center gap-1 text-[hsl(var(--discord-yellow))]"><Trophy className="w-4 h-4" /> {project.points_earned} pts</span>
          </div>
        </div>

        {/* Code View */}
        <div className="rounded-xl border border-[hsl(var(--discord-light)/0.2)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--discord-dark))] border-b border-[hsl(var(--discord-light)/0.1)]">
            <Code className="w-4 h-4 text-[hsl(var(--discord-blurple))]" />
            <span className="text-xs font-mono text-[hsl(var(--discord-text-muted))]">main.py</span>
          </div>
          <pre className="p-4 bg-[hsl(var(--discord-darker))] overflow-x-auto">
            <code className="text-sm font-mono text-[hsl(var(--discord-text))] whitespace-pre">{project.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ProjectView;
