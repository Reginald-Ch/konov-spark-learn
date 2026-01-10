import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Github, Video, Code, Trophy, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Submission {
  id: string;
  project_name: string;
  description: string;
  demo_url: string | null;
  repo_url: string | null;
  video_url: string | null;
  technologies: string | null;
  submitted_at: string;
  hackathon_teams: {
    team_name: string;
  };
}

interface SubmissionsGalleryProps {
  hackathonId: string;
}

export const SubmissionsGallery = ({ hackathonId }: SubmissionsGalleryProps) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, [hackathonId]);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('hackathon_submissions' as any)
      .select(`
        *,
        hackathon_teams (team_name)
      `)
      .eq('hackathon_id', hackathonId)
      .order('submitted_at', { ascending: false });

    if (!error && data) {
      setSubmissions(data as unknown as Submission[]);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[hsl(var(--discord-blurple))] border-t-transparent rounded-full animate-spin" />
          <p className="text-[hsl(var(--discord-text-muted))]">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[hsl(var(--discord-light))] flex items-center justify-center">
          <Code className="w-10 h-10 text-[hsl(var(--discord-text-muted))]" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No submissions yet</h3>
        <p className="text-[hsl(var(--discord-text-muted))]">Be the first to submit a project!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {submissions.map((submission, index) => (
        <motion.div
          key={submission.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-[hsl(var(--discord-dark))] border border-[hsl(var(--discord-light)/0.3)] rounded-lg overflow-hidden hover:border-[hsl(var(--discord-blurple)/0.5)] transition-all group"
        >
          {/* Project Header */}
          <div className="p-4 border-b border-[hsl(var(--discord-light)/0.2)]">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-white group-hover:text-[hsl(var(--discord-blurple))] transition-colors">
                {submission.project_name}
              </h4>
              {index === 0 && (
                <div className="flex items-center gap-1 text-[hsl(var(--discord-yellow))]">
                  <Trophy className="w-4 h-4" />
                  <Star className="w-3 h-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-[hsl(var(--discord-text-muted))] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--discord-green))]" />
              {submission.hackathon_teams.team_name}
            </p>
          </div>

          {/* Description */}
          <div className="p-4">
            <p className="text-sm text-[hsl(var(--discord-text-muted))] line-clamp-3 mb-4">
              {submission.description}
            </p>

            {/* Technologies */}
            {submission.technologies && (
              <div className="flex flex-wrap gap-1 mb-4">
                {submission.technologies.split(',').slice(0, 4).map((tech, i) => (
                  <Badge 
                    key={i} 
                    className="bg-[hsl(var(--discord-lighter))] text-[hsl(var(--discord-text))] border-0 text-xs px-2 py-0"
                  >
                    {tech.trim()}
                  </Badge>
                ))}
                {submission.technologies.split(',').length > 4 && (
                  <Badge className="bg-[hsl(var(--discord-light))] text-[hsl(var(--discord-text-muted))] border-0 text-xs px-2 py-0">
                    +{submission.technologies.split(',').length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* Links */}
            <div className="flex flex-wrap gap-2">
              {submission.demo_url && (
                <Button 
                  size="sm" 
                  className="h-7 text-xs bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]"
                  asChild
                >
                  <a href={submission.demo_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Demo
                  </a>
                </Button>
              )}
              {submission.repo_url && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-7 text-xs border-[hsl(var(--discord-light))] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.3)]"
                  asChild
                >
                  <a href={submission.repo_url} target="_blank" rel="noopener noreferrer">
                    <Github className="w-3 h-3 mr-1" />
                    Code
                  </a>
                </Button>
              )}
              {submission.video_url && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-7 text-xs border-[hsl(var(--discord-light))] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.3)]"
                  asChild
                >
                  <a href={submission.video_url} target="_blank" rel="noopener noreferrer">
                    <Video className="w-3 h-3 mr-1" />
                    Video
                  </a>
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};