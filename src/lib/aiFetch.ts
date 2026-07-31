// Every AI-assisted action in FORGE (Run, chat, code review, bot battles) funnels
// through one shared Lovable AI Gateway key with no server-side queue. Left alone,
// a class of students all clicking "Run" in the same few seconds sends a burst of
// simultaneous requests that can trip the gateway's rate limit for everyone at once —
// and each request just fails loudly instead of waiting its turn.
//
// This wrapper smooths that burst two ways:
//  1. A small random delay before the request ever leaves the browser, so a
//     synchronized "everyone click now" moment spreads out over ~1s of wall-clock
//     time instead of landing in the same instant.
//  2. Automatic retry with backoff specifically on 429 (rate limited) — the one
//     failure mode that's transient and worth waiting out. 402 (credits exhausted)
//     and everything else is returned immediately; retrying those can't help.

const PRE_REQUEST_JITTER_MIN_MS = 100;
const PRE_REQUEST_JITTER_MAX_MS = 900;
const MAX_RATE_LIMIT_RETRIES = 3;
const BACKOFF_BASE_MS = 1200;

const jitter = (min: number, max: number) => min + Math.random() * (max - min);

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

export interface FetchAIEndpointOptions extends RequestInit {
  /** Called before each retry after a 429, e.g. to show "server is busy, retrying..." */
  onRetry?: (attempt: number, maxRetries: number) => void;
}

export async function fetchAIEndpoint(url: string, init: FetchAIEndpointOptions): Promise<Response> {
  const { onRetry, ...requestInit } = init;
  const signal = requestInit.signal ?? undefined;

  await abortableSleep(jitter(PRE_REQUEST_JITTER_MIN_MS, PRE_REQUEST_JITTER_MAX_MS), signal ?? undefined);

  let attempt = 0;
  while (true) {
    const response = await fetch(url, requestInit);
    if (response.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) {
      return response;
    }
    attempt += 1;
    onRetry?.(attempt, MAX_RATE_LIMIT_RETRIES);
    const backoff = BACKOFF_BASE_MS * 2 ** (attempt - 1) + jitter(0, 400);
    await abortableSleep(backoff, signal ?? undefined);
  }
}
