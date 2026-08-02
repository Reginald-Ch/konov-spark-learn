# Ship the AI concurrency gate to the live backend

The gate code is already complete in `python-ai-assist`: both AI gateway call sites (the tool-routing classification call and the main streaming chat call) acquire and release a slot, and the streaming response releases its slot only when the stream ends, errors, or is cancelled.

What is missing is that the database side of the gate does not exist in the live project yet. A query against the live database confirms there is no `acquire_ai_slot` / `release_ai_slot` function, so today every gate call fails and the function falls back to "fail open" (no throttling at all). The migration file exists locally but was never applied, and there is no CI pipeline to apply it.

## Steps

1. Apply the concurrency-gate database change (creates `ai_gateway_slots` with a pool of 10 slots, plus the `acquire_ai_slot` and `release_ai_slot` functions restricted to backend/service access only). This is submitted for your approval before it runs.
2. Deploy `python-ai-assist` so the running function talks to the newly created gate functions.
3. Smoke test: call the deployed function once and confirm a normal AI response streams back, then check the slot table returns to fully unlocked afterwards (proving release works and slots are not leaking).
4. Check function logs for `acquire_ai_slot error` lines — none should appear after the migration.

## Technical notes

- The SQL is taken from `supabase/migrations/20260730120000_a4c1f7e2-...sql` as written; no logic changes.
- `ai_gateway_slots` has RLS enabled with no policies on purpose — it is reachable only through the two `SECURITY DEFINER` functions, which are granted to `service_role` only.
- Pool size of 10 is a starting value. After the smoke test we can raise or lower it based on observed load; that is a follow-up migration, not part of this one.
- Behaviour once live: when all slots are busy, the main call returns a retryable 429 with a friendly "FORGE is busy right now" message, and tool routing is silently skipped rather than queued.
