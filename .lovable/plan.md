

# MeAI Waitlist Page Plan

## Overview
Create a high-converting `/waitlist` page for the MeAI app, replacing the mascot with the MeAI logo, using waitlist best practices for maximum signups.

## Database

**New `waitlist_signups` table** with columns:
- `id` (uuid, PK)
- `email` (text, unique, required)
- `name` (text, optional)
- `referral_code` (text, unique) — auto-generated for viral sharing
- `referred_by` (text, nullable) — referral_code of referrer
- `position` (serial) — queue position
- `created_at` (timestamptz)

RLS: public INSERT (anyone can join), SELECT restricted to own row by email match.

A database function to auto-generate a short referral code on insert.

## Page Structure (`src/pages/Waitlist.tsx`)

Single-page, mobile-first, clean layout with these sections:

1. **Hero / Above the Fold**
   - MeAI logo (fetched from meai.lovable.app or use existing brand asset) replacing the mascot
   - Bold outcome-driven headline: *"Your Kids Use AI Every Day. Now They Can Understand How It Works."*
   - Subheadline explaining MeAI value prop (real AI/ML literacy, not robot toys)
   - Minimal form: just email input + "Get Early Access" CTA button
   - Animated counter showing total waitlist signups as social proof

2. **Post-Signup State (inline, no separate page)**
   - Shows queue position: "You are #X on the waitlist!"
   - Referral share section: unique link + social sharing buttons (Twitter, WhatsApp, copy link)
   - "Refer friends to move up the list" messaging

3. **Social Proof Section**
   - Animated counter of total signups
   - Brief testimonial quotes or parent endorsements
   - Partner logos or trust badges

4. **What You'll Get Section**
   - 3-4 comic-panel styled cards showing MeAI features (chatbot building, ML training, interactive lessons)

5. **Footer** — minimal, reuse existing Footer component

## Key Best Practices Applied
- **Minimal friction**: email-only form (name optional)
- **Action CTA**: "Get Early Access" not "Submit"
- **Position tracking**: show queue number after signup
- **Referral mechanism**: unique code + share buttons for viral growth
- **Social proof**: live signup counter
- **Mobile-first**: single-column layout, large tap targets
- **Urgency**: "Limited early access spots" messaging

## Route
Add `/waitlist` route in `App.tsx`. Add "Waitlist" link to Navbar.

## Technical Details
- Store signups in `waitlist_signups` table via Supabase
- Generate 6-char referral codes via a DB trigger function
- Query total count for social proof counter (public SELECT on count)
- Use existing `ComicPanel`, `AnimatedCounter`, `SpeechBubble` components for brand consistency
- Framer Motion animations for form, counter, and reveal effects
- MeAI logo: fetch from `https://meai.lovable.app` or reference the app's branding

