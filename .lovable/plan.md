

# Web Push Notifications for Waitlist

## What You Get

After someone joins the waitlist, they'll see a prompt asking to allow notifications. Once allowed, you can send custom messages directly to their device — with your own title, body text, icon, and link. These appear as native notifications on Android (and desktop browsers). On iPhone, it only works if they add your site to their home screen.

## How It Works

```text
User joins waitlist → "Enable notifications?" prompt → User allows
     ↓
Push subscription saved to database
     ↓
You tell me in chat: "Send notification: title, message, link"
     ↓
Edge function sends push to all subscribers
```

## Technical Plan

### 1. Generate VAPID keys (Web Push credentials)
- Create an edge function `generate-vapid-keys` to generate a key pair
- Store the private key as a secret, public key in code
- These are free, no third-party service needed

### 2. New database table: `push_subscriptions`
| Column | Type |
|---|---|
| id | uuid (PK) |
| waitlist_signup_id | uuid (FK, nullable) |
| endpoint | text |
| p256dh | text |
| auth | text |
| created_at | timestamp |

### 3. Service Worker for receiving push (`public/push-sw.js`)
- Lightweight, separate from any PWA service worker
- Listens for `push` events, shows notification with custom title/body/icon/link
- Handles notification click to open the link

### 4. Frontend: Ask permission after signup
- After successful waitlist signup, show a friendly prompt: "Want to know the moment we launch? Enable notifications!"
- On accept, register `push-sw.js`, get subscription, save to `push_subscriptions` table
- No intrusive browser prompt on page load — only after signup action

### 5. Edge function: `send-push-notification`
- Accepts: `title`, `body`, `url` (link on click), `icon` (optional)
- Fetches all subscriptions from `push_subscriptions`
- Sends Web Push to each using the VAPID private key
- **You design every message** — just tell me what to send in chat, or we can build a simple form later

### 6. Custom message design
Yes — every notification you send is fully customizable:
- **Title**: e.g. "Konov is launching! 🚀"
- **Body**: e.g. "Your spot #42 is confirmed. Get ready!"
- **Icon**: your logo
- **Click link**: e.g. `https://konovartechtist.com/waitlist`

## Important Notes

- **Free** — Web Push uses open standards, no paid service needed
- **Android + Desktop**: Works great on Chrome, Firefox, Edge
- **iPhone limitation**: Only works if user adds site to home screen (iOS 16.4+)
- **Ghana market**: Most Android users on Chrome — good coverage
- **No PWA required** — we use a standalone push service worker, not a full PWA setup
- **You control messages** — nothing is auto-sent; you decide when and what to send

## Files Created/Changed
- `public/push-sw.js` — push service worker
- `supabase/functions/send-push-notification/index.ts` — edge function to send notifications
- `src/pages/Waitlist.tsx` — add post-signup notification opt-in
- `src/hooks/usePushNotifications.ts` — push subscription logic
- New migration for `push_subscriptions` table

