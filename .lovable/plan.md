

# Rebrand "Konov Artechtist" → "Konov" + Waitlist Polish

## Two changes

### 1. Remove "Built by educators in Accra 🇬🇭" from Waitlist
Delete lines 346-351 in `src/pages/Waitlist.tsx` (the trust badge below the form).

### 2. Rename "Konov Artechtist" → "Konov" site-wide

Every instance of "Konov Artechtist" becomes "Konov" across ~10 files:

| File | What changes |
|---|---|
| `index.html` | Page title |
| `src/components/SEO.tsx` | SITE_NAME, alternateName, descriptions |
| `src/components/Footer.tsx` | Brand name, copyright |
| `src/components/Navbar.tsx` | Logo alt text |
| `src/components/FAQ.tsx` | FAQ Q&A text |
| `src/pages/Index.tsx` | FAQ data |
| `src/pages/About.tsx` | SEO, headings, body text |
| `src/pages/Contact.tsx` | Schema, SEO, content |
| `src/pages/ProgramsPage.tsx` | SEO description |
| `src/pages/Community.tsx` | SEO description |
| `src/pages/Resources.tsx` | Schema data |

Email addresses like `konovartechtist@gmail.com` and domain `konovartechtist.com` stay unchanged (those are real accounts/domains).

### 3. Waitlist scrutiny — minor improvements

While editing the waitlist, apply these refinements:
- Make the bottom CTA section visible even after signup (currently hidden) — users who scrolled down should still see the value props
- Add a subtle urgency element: show "Only X early access spots remaining" near the form (static number, e.g. 100)

## Files changed
- `index.html`
- `src/components/SEO.tsx`
- `src/components/Footer.tsx`
- `src/components/Navbar.tsx`
- `src/components/FAQ.tsx`
- `src/pages/Index.tsx`
- `src/pages/About.tsx`
- `src/pages/Contact.tsx`
- `src/pages/ProgramsPage.tsx`
- `src/pages/Community.tsx`
- `src/pages/Resources.tsx`
- `src/pages/Waitlist.tsx`

