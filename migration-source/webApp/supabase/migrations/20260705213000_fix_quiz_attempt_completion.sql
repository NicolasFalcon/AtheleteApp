-- Persist the full answer snapshot for every completed quiz attempt.
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'quiz_attempts_answers_is_array'
  ) THEN
    ALTER TABLE public.quiz_attempts
      ADD CONSTRAINT quiz_attempts_answers_is_array
      CHECK (jsonb_typeof(answers) = 'array');
  END IF;
END $$;

-- The deployed RPC uses ON CONFLICT (user_id, event_type, reference_id).
-- Older environments used event_key instead, so keep this migration compatible
-- with both schemas.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gamification_events'
      AND column_name = 'reference_id'
  ) THEN
    DELETE FROM public.gamification_events newer
    USING public.gamification_events older
    WHERE newer.user_id = older.user_id
      AND newer.event_type = older.event_type
      AND newer.reference_id = older.reference_id
      AND newer.id > older.id;

    CREATE UNIQUE INDEX IF NOT EXISTS gamification_events_user_type_reference_uidx
      ON public.gamification_events (user_id, event_type, reference_id);
  END IF;
END $$;
