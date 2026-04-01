

# Waitlist Overhaul — Ghana-Optimized, Proven Framework

## What Changes

### 1. WhatsApp-first input (Ghana market)
Replace the email-only field with a toggle: **"Email" or "WhatsApp number"**. WhatsApp is default-selected since 90%+ of Ghanaian traffic is mobile via WhatsApp links. The database gets a new nullable `whatsapp` column. The form requires exactly one — email OR WhatsApp number.

### 2. Mobile-first redesign
- Single-column layout, no side-by-side form on any screen size
- Large tap targets (min 48px height inputs/buttons)
- Short scanning chunks — break text into bite-sized pieces
- CTA always visible in first viewport on phone screens
- Reduce hero text length for mobile readability

### 3. Stronger value proposition (Unicorn Platform framework)
Apply the 5-question test: *what is this, who is it for, what problem does it solve, why now, what happens after signup*

- Headline: **"Your Kids Use AI Every Day. Now They Can Understand How It Works."** (keep — it's strong)
- Add a one-line problem statement: *"Most programs teach robot toys, not real AI. MeAI is different."*
- Make the CTA outcome-specific: **"Get Early Access"** (keep)
- Add "what happens next" micro-copy below CTA: *"We'll notify you on WhatsApp/email when spots open. No spam."*

### 4. Trust signals near the form (not buried)
- Add 2-3 short parent endorsement quotes directly below the form
- Add a "Built by educators in Accra" trust line with a Ghana flag
- Move the signup counter closer to the form

### 5. Referral sharing optimized for Ghana
- WhatsApp share button is PRIMARY (larger, first position)
- Pre-written WhatsApp share message in conversational tone
- Twitter/X becomes secondary
- Add "Share with 3 friends to move up" specific prompt

### 6. Post-signup improvements
- Clearer position display with encouraging message
- "What happens next" timeline (3 steps)
- Stronger referral incentive messaging

## Database Changes

**Migration**: Add `whatsapp` column to `waitlist_signups`:
```sql
ALTER TABLE waitlist_signups ADD COLUMN whatsapp text;
-- Make email nullable (since user can provide WhatsApp instead)
ALTER TABLE waitlist_signups ALTER COLUMN email DROP NOT NULL;
-- Add constraint: must have email OR whatsapp
ALTER TABLE waitlist_signups ADD CONSTRAINT email_or_whatsapp 
  CHECK (email IS NOT NULL OR whatsapp IS NOT NULL);
-- Drop unique on email, add unique on both
DROP INDEX IF EXISTS waitlist_signups_email_key;
CREATE UNIQUE INDEX waitlist_signups_email_key ON waitlist_signups(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX waitlist_signups_whatsapp_key ON waitlist_signups(whatsapp) WHERE whatsapp IS NOT NULL;
```

## Files Changed

- **`supabase/migrations/...`** — add `whatsapp` column, constraints
- **`src/pages/Waitlist.tsx`** — full rewrite with:
  - Email/WhatsApp toggle (WhatsApp default)
  - Mobile-first single-column layout
  - Trust signals near form
  - Ghana-localized copy and sharing
  - Post-signup "what happens next" flow
  - WhatsApp-primary sharing

## Key Framework Points Applied (from Unicorn Platform guide)

1. **Define the offer clearly** — specific outcome, audience, timing
2. **Frictionless form** — ONE field (email or WhatsApp), one button
3. **Trust before commitment** — social proof and credibility near the form
4. **Mobile-first** — designed for phone screens, WhatsApp link traffic
5. **Referral logic** — clear incentive to share, WhatsApp-optimized

