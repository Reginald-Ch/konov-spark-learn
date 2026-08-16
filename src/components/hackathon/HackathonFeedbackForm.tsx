import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface FeedbackRow {
  overall_rating: number;
  lessons_rating: number | null;
  challenges_rating: number | null;
  organization_rating: number | null;
  comment: string | null;
  updated_at: string;
}

const StarRating = ({ value, onChange, label, required }: { value: number; onChange: (v: number) => void; label: string; required?: boolean }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-white/80">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n === value ? 0 : n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star
              className={`w-5 h-5 transition-colors ${
                n <= (hover || value) ? 'fill-amber-400 text-amber-400' : 'text-white/25'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export const HackathonFeedbackForm = ({ hackathonId }: { hackathonId: string | null }) => {
  const [email, setEmail] = useState(localStorage.getItem('forge-student-email') || '');
  const [name, setName] = useState(localStorage.getItem('forge-student-name') || '');
  const [editingIdentity, setEditingIdentity] = useState(!(localStorage.getItem('forge-student-name') && localStorage.getItem('forge-student-email')));

  const [overallRating, setOverallRating] = useState(0);
  const [lessonsRating, setLessonsRating] = useState(0);
  const [challengesRating, setChallengesRating] = useState(0);
  const [organizationRating, setOrganizationRating] = useState(0);
  const [comment, setComment] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const fetchExisting = useCallback(async () => {
    if (!hackathonId || !email.trim()) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc('get_my_hackathon_feedback', {
      p_participant_email: email.trim().toLowerCase(),
      p_hackathon_id: hackathonId,
    });
    if (!error) {
      const row = (Array.isArray(data) ? data[0] : data) as FeedbackRow | undefined;
      if (row) {
        setOverallRating(row.overall_rating || 0);
        setLessonsRating(row.lessons_rating || 0);
        setChallengesRating(row.challenges_rating || 0);
        setOrganizationRating(row.organization_rating || 0);
        setComment(row.comment || '');
        setLastSavedAt(row.updated_at);
      }
    }
    setLoading(false);
  }, [hackathonId, email]);

  useEffect(() => { fetchExisting(); }, [fetchExisting]);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) { toast.error('Enter your name and email first'); return; }
    if (!hackathonId) { toast.error('No event selected to give feedback on'); return; }
    if (overallRating < 1) { toast.error('Please leave an overall rating'); return; }

    localStorage.setItem('forge-student-email', email.trim().toLowerCase());
    localStorage.setItem('forge-student-name', name.trim());

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('submit_hackathon_feedback', {
        p_participant_email: email.trim().toLowerCase(),
        p_hackathon_id: hackathonId,
        p_overall_rating: overallRating,
        p_lessons_rating: lessonsRating || null,
        p_challenges_rating: challengesRating || null,
        p_organization_rating: organizationRating || null,
        p_comment: comment.trim() || null,
      });
      if (error) throw error;
      const row = data as FeedbackRow;
      setLastSavedAt(row.updated_at);
      toast.success(lastSavedAt ? 'Feedback updated — thanks!' : 'Thanks for the feedback!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit feedback');
    } finally {
      setSaving(false);
    }
  };

  if (!hackathonId) {
    return (
      <div className="text-center py-12 text-white/50">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No event to give feedback on right now — check back once one is live or has wrapped up.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-5 h-5 text-[hsl(var(--discord-blurple))]" />
        <h3 className="text-lg font-bold text-white">Event Feedback</h3>
      </div>
      <p className="text-xs text-white/50 mb-4">
        Only you and the organizers can see this — not shown to other participants. You can update it any time.
      </p>

      {editingIdentity ? (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white h-9 text-sm" />
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email"
            className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white h-9 text-sm" />
          {name.trim() && email.trim() && (
            <Button size="sm" onClick={() => setEditingIdentity(false)} className="col-span-2 h-8 text-xs">
              Continue
            </Button>
          )}
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2 flex-wrap text-sm text-white/70">
          <span>Giving feedback as <span className="text-white font-medium">{name}</span></span>
          <button onClick={() => setEditingIdentity(true)} className="text-[hsl(var(--discord-blurple))] hover:underline text-xs">Not you?</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/60" /></div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg p-4 border bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)] space-y-1">
          <StarRating label="Overall experience" value={overallRating} onChange={setOverallRating} required />
          <StarRating label="Lessons & learning" value={lessonsRating} onChange={setLessonsRating} />
          <StarRating label="Challenges & judging" value={challengesRating} onChange={setChallengesRating} />
          <StarRating label="Organization & communication" value={organizationRating} onChange={setOrganizationRating} />

          <div className="pt-2">
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Anything else you want to tell us? (optional)"
              rows={4}
              className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.2)] text-white text-sm resize-none"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button onClick={handleSubmit} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : lastSavedAt ? <CheckCircle2 className="w-4 h-4 mr-1" /> : null}
              {lastSavedAt ? 'Update Feedback' : 'Submit Feedback'}
            </Button>
            {lastSavedAt && (
              <span className="text-[10px] text-white/40">Last saved {new Date(lastSavedAt).toLocaleDateString()}</span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
