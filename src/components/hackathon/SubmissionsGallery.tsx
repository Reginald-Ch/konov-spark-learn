import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Github, Video, Code } from 'lucide-react';
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
      <div className="text-center py-8 text-muted-foreground">Loading submissions...</div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8">
        <Code className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No submissions yet. Be the first to submit!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {submissions.map((submission, index) => (
        <motion.div
          key={submission.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="h-full hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg leading-tight">{submission.project_name}</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                by {submission.hackathon_teams.team_name}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {submission.description}
              </p>

              {submission.technologies && (
                <div className="flex flex-wrap gap-1">
                  {submission.technologies.split(',').slice(0, 4).map((tech, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tech.trim()}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {submission.demo_url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={submission.demo_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Demo
                    </a>
                  </Button>
                )}
                {submission.repo_url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={submission.repo_url} target="_blank" rel="noopener noreferrer">
                      <Github className="w-3 h-3 mr-1" />
                      Code
                    </a>
                  </Button>
                )}
                {submission.video_url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={submission.video_url} target="_blank" rel="noopener noreferrer">
                      <Video className="w-3 h-3 mr-1" />
                      Video
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
