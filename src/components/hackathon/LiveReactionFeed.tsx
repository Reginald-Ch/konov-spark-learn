import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Rocket } from 'lucide-react';

/**
 * LiveReactionFeed — listens for new published projects via Supabase Realtime
 * and shows a toast notification to everyone when someone publishes.
 * 
 * Drop this component anywhere in the hackathon page tree. It renders nothing visible.
 */
export const LiveReactionFeed = () => {
  useEffect(() => {
    const channel = supabase
      .channel('live-reaction-feed')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_projects',
          filter: 'is_published=eq.true',
        },
        (payload) => {
          const project = payload.new as any;
          if (project?.is_published && project?.author_name && project?.project_name) {
            // Only show if this is a fresh publish (check old record wasn't already published)
            const old = payload.old as any;
            if (old && !old.is_published) {
              showDeployToast(project.author_name, project.project_name);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_projects',
        },
        (payload) => {
          const project = payload.new as any;
          if (project?.is_published && project?.author_name && project?.project_name) {
            showDeployToast(project.author_name, project.project_name);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
};

function showDeployToast(authorName: string, projectName: string) {
  toast(
    `🚀 ${authorName} just deployed ${projectName}!`,
    {
      duration: 5000,
      icon: <Rocket className="w-4 h-4 text-[hsl(var(--discord-green))]" />,
      style: {
        background: 'hsl(225 7% 11%)',
        border: '1px solid hsl(139 47% 44% / 0.4)',
        color: '#fff',
      },
    }
  );
}
