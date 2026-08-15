import { supabase } from '@/integrations/supabase/client';

// Every surface that captures a student's real name/email (Registration,
// Publish, Lessons, Daily Challenges) independently called
// localStorage.setItem on the two identity keys, with zero connection to
// hackathon_registrations — so a student who never specifically opened
// "Register for Hackathon" (the DEFAULT flow, since Templates->Build skips
// it entirely) stayed invisible to every organizer tool that reads that
// table (CoinsTab, LessonsLeaderboard) despite actively building,
// publishing, and completing challenges under a real identity the whole
// time. Call this wherever a real name/email is captured via a form
// submission (not wherever an already-cached identity is just re-read) —
// it's a best-effort background seed of the roster, not a registration
// flow in its own right, so it never surfaces an error to the user.
export async function ensureHackathonRegistration(email: string, name: string, hackathonId: string | null) {
  if (!hackathonId) return;
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();
  if (!normalizedEmail || !trimmedName) return;

  const { error } = await supabase.from('hackathon_registrations').insert({
    hackathon_id: hackathonId,
    participant_name: trimmedName,
    participant_email: normalizedEmail,
  });
  // 23505 = already registered for this event, which is success, not an
  // error. Anything else is logged but not surfaced — this call is a
  // side-effect of some other action (publishing, saving a lesson, etc.),
  // never something the student is waiting on a result from.
  if (error && error.code !== '23505') {
    console.error('ensureHackathonRegistration failed:', error);
  }
}
