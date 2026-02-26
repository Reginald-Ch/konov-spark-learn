import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Code, Eye, User, Sparkles, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Project {
  id: string;
  project_name: string;
  description: string | null;
  author_name: string;
  author_email: string;
  template_id: string | null;
  code: string;
  points_earned: number;
  created_at: string;
}

interface ProjectGalleryProps {
  onViewCode: (code: string) => void;
}

const TEMPLATE_META: Record<string, { icon: string; label: string; color: string }> = {
  chatbot: { icon: '🤖', label: 'Chatbot', color: '#5865F2' },
  'voice-assistant': { icon: '🎙️', label: 'Voice', color: '#F7941D' },
  agent: { icon: '🧠', label: 'Agent', color: '#006600' },
};

export const ProjectGallery = ({ onViewCode }: ProjectGalleryProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('ai_projects')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data);
    }
    setIsLoading(false);
  };

  const filtered = projects.filter(p =>
    p.project_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
    p.author_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
          background: 'linear-gradient(135deg, #5865F2 0%, #9B59B6 100%)'
        }}>
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Project Gallery</h2>
          <p className="text-[hsl(var(--discord-text-muted))] text-sm">Browse published AI projects for inspiration</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--discord-text-muted))]" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="pl-10 bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-[hsl(var(--discord-blurple))] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Code className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--discord-text-muted))]" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {projects.length === 0 ? 'No published projects yet' : 'No matching projects'}
          </h3>
          <p className="text-[hsl(var(--discord-text-muted))]">
            {projects.length === 0 ? 'Be the first to publish a project from the Build tab!' : 'Try a different search term'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project, index) => {
            const meta = TEMPLATE_META[project.template_id || ''] || { icon: '📦', label: 'Project', color: '#5865F2' };
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[hsl(var(--discord-darker))] border border-[hsl(var(--discord-light)/0.2)] rounded-lg overflow-hidden hover:border-[hsl(var(--discord-blurple)/0.5)] transition-all group"
              >
                <div className="p-4 border-b border-[hsl(var(--discord-light)/0.1)]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-white group-hover:text-[hsl(var(--discord-blurple))] transition-colors truncate">
                      {project.project_name}
                    </h4>
                    <Badge className="text-[10px] flex-shrink-0" style={{ backgroundColor: `${meta.color}30`, color: meta.color, border: `1px solid ${meta.color}50` }}>
                      {meta.icon} {meta.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--discord-text-muted))]">
                    <User className="w-3 h-3" />
                    {project.author_name}
                  </div>
                </div>

                <div className="p-4">
                  {project.description && (
                    <p className="text-sm text-[hsl(var(--discord-text-muted))] line-clamp-2 mb-4">{project.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[hsl(var(--discord-text-muted))]">
                      ⭐ {project.points_earned} pts
                    </span>
                    <div className="flex gap-1.5">
                      <a href={`/projects/${project.id}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="h-7 text-xs bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)] text-white">
                          💬 Try It
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        onClick={() => onViewCode(project.code)}
                        className="h-7 text-xs bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Code
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
