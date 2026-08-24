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

  // Was a raw insert until a security audit found it silently broken:
  // hackathon_registrations' anon/authenticated table privileges were
  // correctly revoked to close a real "anyone can write anything" hole,
  // but nothing replaced this specific write path with an RPC, so every
  // call here (and every direct registration via RegistrationModal.tsx)
  // has been failing with a permission-denied error since. Routed through
  // register_for_hackathon, the same device-token TOFU pattern every other
  // write RPC in the app uses — mints on first use, so this can still run
  // as the very first identity-establishing action for someone who lands
  // on Publish/Lessons/Daily Challenges before ever registering formally.
  const deviceToken = localStorage.getItem('forge-device-token') || null;
  const { data, error } = await supabase.rpc('register_for_hackathon', {
    p_hackathon_id: hackathonId,
    p_participant_name: trimmedName,
    p_participant_email: normalizedEmail,
    p_device_token: deviceToken,
  });
  const result = Array.isArray(data) ? data[0] : data;
  if (result?.new_device_token) localStorage.setItem('forge-device-token', result.new_device_token);
  // This call is a side-effect of some other action (publishing, saving a
  // lesson, etc.), never something the student is waiting on a result
  // from — a failure (including "already active on another device", which
  // just means this email's real owner is on a different browser) is
  // logged but not surfaced.
  if (error) {
    console.error('ensureHackathonRegistration failed:', error);
  } else if (result && !result.ok) {
    console.error('ensureHackathonRegistration failed:', result.message);
  }
}
