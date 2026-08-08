-- Lessons system bug-hunt: unlock_lesson's insufficient-funds message
-- included the caller's exact live coin balance ('you have %s, this costs
-- %s'). Every lesson RPC trusts p_participant_email at face value with no
-- server-side identity check (the same "email as bearer credential"
-- tradeoff used throughout this app) — which means this specific message
-- doubled as a free oracle: anyone could learn any other participant's
-- exact Forge Coin balance just by calling unlock_lesson with that
-- person's email and reading the error, no unlock or spend required. The
-- lesson's coin_cost isn't sensitive (it's already shown in the UI before
-- unlocking), so it stays; the caller's balance is dropped from the message
-- entirely rather than trying to patch around it.
CREATE OR REPLACE FUNCTION public.unlock_lesson(p_participant_email TEXT, p_hackathon_id UUID, p_lesson_id UUID)
RETURNS TABLE (ok BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost INTEGER;
  v_published BOOLEAN;
  v_balance INTEGER;
  v_already BOOLEAN;
  v_coins_enabled BOOLEAN;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_participant_email));

  SELECT coin_cost, is_published INTO v_cost, v_published FROM public.lessons WHERE id = p_lesson_id;
  IF v_cost IS NULL THEN
    RETURN QUERY SELECT false, 'Lesson not found';
    RETURN;
  END IF;
  IF NOT v_published THEN
    RETURN QUERY SELECT false, 'This lesson is not available yet';
    RETURN;
  END IF;

  IF p_hackathon_id IS NOT NULL THEN
    SELECT COALESCE((settings->>'coins_unlock_lessons')::boolean, true) INTO v_coins_enabled
    FROM public.hackathons WHERE id = p_hackathon_id;
    IF v_coins_enabled IS FALSE THEN
      RETURN QUERY SELECT false, 'Lesson unlocking is currently paused by the organizer for this event';
      RETURN;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id
  ) INTO v_already;
  IF v_already THEN
    RETURN QUERY SELECT true, 'Already unlocked';
    RETURN;
  END IF;

  SELECT COALESCE(SUM(points), 0) INTO v_balance
  FROM public.point_events
  WHERE participant_email = p_participant_email
    AND hackathon_id = p_hackathon_id
    AND event_type IN ('forge_coin_grant', 'forge_coin_adjust');

  IF v_balance < v_cost THEN
    RETURN QUERY SELECT false, format('Not enough Forge Coins for this lesson — it costs %s. Check your balance in the app.', v_cost);
    RETURN;
  END IF;

  INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
  VALUES (p_participant_email, 'forge_coin_adjust', -v_cost, p_hackathon_id, jsonb_build_object('reason', 'lesson_unlock', 'lesson_id', p_lesson_id));

  INSERT INTO public.lesson_progress (participant_email, lesson_id)
  VALUES (p_participant_email, p_lesson_id);
  RETURN QUERY SELECT true, 'Unlocked';
END;
$$;
