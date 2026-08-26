-- Found during this session's dedicated audit of CommunityQuestsTab.tsx
-- (the "update a community quest" flow specifically).
--
-- 1) Lost-update race: the admin quest list had no realtime subscription
--    (unlike community_quest_completions, which already got one), and
--    handleSave always sends the FULL form object, not a diff. Two
--    organizers editing the same quest in separate tabs — organizer B
--    saves a change, organizer A (who loaded the quest before B's change)
--    then saves their own unrelated edit — silently reverted B's change
--    with no warning, no version check anywhere. Adds a real optimistic-
--    concurrency guard: updated_at must match what the client last loaded,
--    or the update is rejected with a clear conflict message instead of
--    blindly overwriting. Matches the same p_expected_updated_at pattern
--    save_own_project already uses for the identical class of problem.
--
-- 2) update_community_quest never validated the chat_action-needs-a-
--    channel invariant that create_community_quest already enforces —
--    changing quest_type to chat_action (or clearing the channel while
--    type stays chat_action) via a direct API call could silently create
--    a permanently-unclaimable quest with no signal to the organizer.
--
-- 3) action_url had no protocol check anywhere server-side, and
--    CommunityChat.tsx renders it as a live, clickable href to every
--    participant on self_report quests — a javascript: URI there is a
--    direct path to executing arbitrary script in whichever participant's
--    browser clicks "Open link." Same bug class already closed for daily-
--    challenge submissions' content_url (enforce_submission_integrity).

ALTER TABLE public.community_quests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_community_quests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_quests_set_updated_at ON public.community_quests;
CREATE TRIGGER community_quests_set_updated_at
  BEFORE UPDATE ON public.community_quests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_community_quests_updated_at();

NOTIFY pgrst, 'reload schema';
