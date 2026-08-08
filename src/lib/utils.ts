import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Gate before ever rendering participant-submitted text as a clickable
// `href` — `new URL()` happily parses `javascript:`/`data:`/`vbscript:` as
// valid URLs (it only throws on strings with no parseable scheme at all),
// so schema validity alone doesn't make a link safe. Only http(s) may be
// rendered as a real anchor; everything else must fall back to plain text.
export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Extracts a YouTube video ID from any of the URL shapes a lesson author
// might paste in (watch?v=, youtu.be/, embed/, shorts/) and returns a
// ready-to-render youtube-nocookie.com embed URL — or null if the input
// isn't a recognizable YouTube video URL. The returned string is always
// OUR OWN constructed nocookie URL, never the caller's input reflected
// back — a pasted string only ever supplies the 11-character video ID
// after it's been validated against YouTube's actual ID shape, so there's
// no path from a crafted string to an arbitrary iframe origin (checked
// against lookalike-domain and javascript:/data:-scheme inputs).
// youtube-nocookie.com + rel=0 avoids surfacing other channels' "related"
// videos once one ends — worth the extra care since this app's users are
// teenagers.
export function getYouTubeEmbedUrl(url: string): string | null {
  if (!isSafeExternalUrl(url)) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, '');
  let videoId: string | null = null;
  if (host === 'youtu.be') {
    videoId = parsed.pathname.slice(1);
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
    if (parsed.pathname === '/watch') {
      videoId = parsed.searchParams.get('v');
    } else if (parsed.pathname.startsWith('/embed/')) {
      videoId = parsed.pathname.slice('/embed/'.length);
    } else if (parsed.pathname.startsWith('/shorts/')) {
      videoId = parsed.pathname.slice('/shorts/'.length);
    }
  } else {
    return null;
  }
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
}
