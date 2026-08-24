import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Code, Eye, User, Rocket, Search, Trash2, AlertTriangle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Project {
  id: string;
  project_name: string;
  description: string | null;
  author_name: string;
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
  agent: { icon: '🧠', label: 'Agent', color: '#006600' },
};

export const ProjectGallery = ({ onViewCode }: ProjectGalleryProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Which of the fetched projects belong to the current student, so the
  // Delete button can be shown without ever needing author_email on the
  // client — see fetchProjects below for why that column is off-limits.
  const [myProjectIds, setMyProjectIds] = useState<Set<string>>(new Set());
  // A failed fetchProjects() used to fall straight through to the same
  // "No submitted projects yet" empty state as a genuinely empty
  // platform — actively misleading every visitor during a real outage
  // into thinking the platform has zero submissions.
  const [fetchError, setFetchError] = useState(false);
  // A card that's filtered out by search fully unmounts (only matching
  // items are rendered below); typing then clearing a query remounted it
  // fresh and replayed its fade/slide-in entrance, making ordinary search
  // refinement look janky. IDs in here skip the entrance animation on any
  // later render — only a genuinely first-ever appearance (initial load,
  // or a newly-published project arriving via realtime) still animates in.
  const animatedIdsRef = useRef<Set<string>>(new Set());

  const currentEmail = localStorage.getItem('forge-student-email') || '';

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!currentEmail) { setMyProjectIds(new Set()); return; }
    // p_device_token added (security audit) — this RPC used to trust a bare
    // email with no proof of identity.
    supabase.rpc('get_my_projects', { p_participant_email: currentEmail, p_device_token: localStorage.getItem('forge-device-token') || null }).then(({ data }) => {
      if (data) setMyProjectIds(new Set((data as { id: string }[]).map(p => p.id)));
    });
  }, [currentEmail]);

  // Without this, republishing/unpublishing/deleting a project elsewhere
  // never showed up here until you navigated away and back — this gallery
  // isn't scoped to one hackathon (fetchProjects has no hackathon_id
  // filter), so the subscription below isn't either. Debounced: every
  // student's private-draft autosave (ProjectEditor.tsx, every 2 min per
  // active editor) also writes to this same table, so an undebounced
  // refetch here re-queried the full public gallery on unrelated,
  // unpublished activity platform-wide.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const debouncedRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchProjects(true), 800);
    };
    const channel = supabase
      .channel('project-gallery-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_projects' }, debouncedRefetch)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // silent=true skips the full-page spinner — used for background
  // refreshes (the realtime handler, the post-delete safety-net refetch)
  // where the gallery is already rendered. Without this, ANY student
  // anywhere publishing/editing/deleting a project blanked every visitor's
  // already-open gallery to a spinner and re-mounted the grid (replaying
  // every card's entrance animation) on every refresh, not just the first
  // load.
  const fetchProjects = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setFetchError(false);
    try {
      // Explicit column list — author_email must never reach the client here.
      // It's the app's entire ownership credential for save/delete/publish
      // RPCs (see save_own_project's migration), so broadcasting it to every
      // visitor of a public gallery would let anyone harvest a classmate's
      // email and hijack their projects through those RPCs directly.
      // Unscoped by hackathon (by design — this is a cross-event showcase),
      // so the published-project set only grows over time. A cap keeps a
      // single query bounded as more events run on this platform, matching
      // the same defensive limit other unbounded RPCs in this app use.
      const { data, error } = await supabase
        .from('ai_projects')
        .select('id, project_name, description, author_name, template_id, code, points_earned, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Failed to fetch projects:', error);
        setFetchError(true);
      } else if (data) {
        setProjects(data);
      }
    } catch (e) {
      console.error('Unexpected error fetching projects:', e);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      // Routed through the owner-checked RPC — the open DELETE policy this
      // used to rely on let anyone delete anyone's project by id; the UI's
      // currentEmail === project.author_email check above was the only
      // thing actually stopping that, and it's trivially bypassed via
      // devtools/a raw API call. p_device_token added (security audit) —
      // the RPC's own ownership check still only verified the CLAIMED
      // email textually matched author_email, with no proof of identity
      // behind that claim at all.
      const { error } = await supabase.rpc('delete_own_project', {
        p_project_id: deleteTarget.id,
        p_participant_email: currentEmail,
        p_device_token: localStorage.getItem('forge-device-token') || null,
      });
      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
      toast.success('Project deleted');
      setDeleteTarget(null);
      // Safety-net resync, not the primary update — the optimistic filter
      // above already reflects the deletion instantly. Silent so this
      // doesn't blank the grid to a spinner right after the confirm click
      // (the realtime subscription will also pick up this same DELETE and
      // silently resync a second time, which is fine — both are no-ops
      // once the row is actually gone).
      fetchProjects(true);
    } catch (e) {
      console.error('Failed to delete project:', e);
      toast.error('Failed to delete project.');
    } finally {
      setIsDeleting(false);
    }
  };

  const q = search.toLowerCase();
  const filtered = projects.filter(p => {
    const meta = TEMPLATE_META[p.template_id || ''];
    return p.project_name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      p.author_name.toLowerCase().includes(q) ||
      (meta?.label.toLowerCase().includes(q) ?? false);
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
          background: 'linear-gradient(135deg, #5865F2 0%, #9B59B6 100%)'
        }}>
          <Rocket className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Project Showcase</h2>
          <p className="text-[hsl(var(--discord-text-muted))] text-sm">Browse submitted AI projects</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--discord-text-muted))]" />
        <label htmlFor="project-gallery-search" className="sr-only">Search projects</label>
        <Input
          id="project-gallery-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="pl-10 pr-9 bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--discord-text-muted))] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 mx-auto mb-4 border-4 border-[hsl(var(--discord-blurple))] border-t-transparent rounded-full animate-spin" />
          <p className="text-[hsl(var(--discord-text-muted))]">Loading projects...</p>
        </div>
      ) : fetchError ? (
        <div className="text-center py-20">
          <Code className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--discord-text-muted))]" />
          <h3 className="text-lg font-semibold text-white mb-2">Couldn't load projects</h3>
          <p className="text-[hsl(var(--discord-text-muted))] mb-4">We ran into a problem loading the showcase. Please try again.</p>
          <Button size="sm" onClick={() => fetchProjects()} className="bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]">Retry</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Code className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--discord-text-muted))]" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {projects.length === 0 ? 'No submitted projects yet' : 'No matching projects'}
          </h3>
          <p className="text-[hsl(var(--discord-text-muted))] mb-4">
            {projects.length === 0 ? 'Be the first to submit a project from the Build tab!' : `No results for "${search}".`}
          </p>
          {projects.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setSearch('')} className="border-[hsl(var(--discord-light)/0.3)] text-[hsl(var(--discord-text-muted))] hover:text-white">
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project, index) => {
            const meta = TEMPLATE_META[project.template_id || ''] || { icon: '📦', label: 'Project', color: '#5865F2' };
            // Only a genuinely first-ever appearance animates in — see
            // animatedIdsRef above for why (search remount replay).
            const alreadyAnimated = animatedIdsRef.current.has(project.id);
            if (!alreadyAnimated) animatedIdsRef.current.add(project.id);
            return (
              <motion.div
                key={project.id}
                initial={alreadyAnimated ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                // Capped — with up to 500 results, an uncapped per-index
                // delay left later cards invisible for many seconds after
                // mount, even ones already in the viewport on a fast scroll.
                transition={{ delay: Math.min(index, 12) * 0.05 }}
                className="bg-[hsl(var(--discord-darker))] border border-[hsl(var(--discord-light)/0.2)] rounded-lg overflow-hidden transition-all"
              >
                <div className="p-4 border-b border-[hsl(var(--discord-light)/0.1)]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-white truncate min-w-0 flex-1">
                      {project.project_name}
                    </h4>
                    <Badge className="text-[10px] flex-shrink-0" style={{ backgroundColor: `${meta.color}30`, color: meta.color, border: `1px solid ${meta.color}50` }}>
                      {meta.icon} {meta.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--discord-text-muted))] min-w-0">
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{project.author_name}</span>
                  </div>
                </div>

                <div className="p-4">
                  {project.description && (
                    <p className="text-sm text-[hsl(var(--discord-text-muted))] line-clamp-2 mb-4">{project.description}</p>
                  )}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                     <span className="text-xs text-[hsl(var(--discord-text-muted))]" title={new Date(project.created_at).toLocaleString()}>
                       {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                     </span>
                     <div className="flex gap-2 flex-wrap">
                       {myProjectIds.has(project.id) && (
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={(e) => { e.stopPropagation(); setDeleteTarget(project); }}
                           className="h-7 px-2 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                         >
                           <Trash2 className="w-3 h-3 mr-1" />
                           Delete
                         </Button>
                       )}
                      {/* asChild renders this as a real <a>, not a <button>
                          nested inside one — the previous <a><Button/></a>
                          markup was two natively-interactive elements
                          nested together (an HTML5-invalid, AT-confusing
                          pattern), and only "worked" because the inner
                          button had no click handler of its own for the
                          click to bubble past. This keeps real link
                          semantics (visible href, right-click "open in new
                          tab", role="link") instead of faking navigation
                          through a button's onClick. */}
                      <Button asChild size="sm" className="h-7 text-xs bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)] text-white">
                        <a href={`${window.location.origin}/projects/${project.id}`} target="_blank" rel="noopener noreferrer">
                          💬 Try It
                        </a>
                      </Button>
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

      {/* Delete Confirmation Dialog */}
      {/* Cancel/overlay-close disabled while isDeleting — previously both
          stayed active mid-request, so closing and opening a DIFFERENT
          project's delete dialog before the first RPC resolved left the
          new dialog showing a stale "Deleting..."/disabled state that
          actually belonged to the first, unrelated request. isDeleting
          isn't scoped per-project, so blocking the switch entirely (rather
          than trying to track per-id state for a single-dialog-at-a-time
          UI) is the simplest correct fix. */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <DialogContent className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.3)] text-white sm:max-w-sm" hideCloseButton={isDeleting}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-red-400" /> Delete Project
            </DialogTitle>
            <DialogDescription className="text-[hsl(var(--discord-text-muted))]">
              Are you sure you want to delete "{deleteTarget?.project_name}"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" disabled={isDeleting} onClick={() => setDeleteTarget(null)} className="flex-1 text-[hsl(var(--discord-text-muted))]">Cancel</Button>
            <Button onClick={handleDelete} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
