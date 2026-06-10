-- Transactional gamification events for Athelete mobile.
-- This centralizes point awards and badge unlocks behind one idempotent RPC.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.gamification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_key text NOT NULL,
  event_type text NOT NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  badge_ids text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_key)
);

ALTER TABLE public.gamification_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gamification_events'
      AND policyname = 'Users can read own gamification events'
  ) THEN
    CREATE POLICY "Users can read own gamification events"
      ON public.gamification_events
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gamification_events_user_type
  ON public.gamification_events (user_id, event_type, created_at DESC);

-- Ensure every badge id used by the mobile app exists in the catalog.
INSERT INTO public.badges (id, title, description, icon) VALUES
  ('first_workout', 'Primer entreno', 'Completa tu primera sesión de entrenamiento.', 'dumbbell'),
  ('week_consistency', 'Semana constante', 'Completa 3 entrenos en una semana.', 'calendar'),
  ('core33_finisher', 'Core 33 completado', 'Finaliza el reto Athelete Core · 33.', 'trophy'),
  ('streak_7_days', 'Racha de 7 días', 'Mantente activo 7 días seguidos.', 'flame'),
  ('nutrition_started', 'Nutrición activada', 'Activa tu primer plan de nutrición.', 'utensils'),
  ('first_custom_workout', 'Primera rutina propia', 'Crea tu primera rutina personalizada en Athelete.', 'wrench'),
  ('quiz_master', 'Quiz Master', 'Obtén puntuación perfecta en las categorías de quiz.', 'brain'),
  ('first_quiz', 'Primer Quiz', 'Completa tu primer quiz de fitness.', 'file-pen'),
  ('first_pr', 'Primer PR', 'Registra tu primer récord personal.', 'trophy'),
  ('hydration_3_days', 'Hidratación x3', 'Cumple tu meta de agua 3 días seguidos.', 'droplets'),
  ('hydration_7_days', 'Hidratación x7', 'Cumple tu meta de agua 7 días seguidos.', 'waves'),
  ('weekly_hydration_master', 'Semana hidratada', 'Cumple tu meta de agua 5+ días en una semana.', 'medal')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

CREATE OR REPLACE FUNCTION public.award_gamification_event(
  p_user_id uuid,
  p_event_key text,
  p_event_type text,
  p_points integer DEFAULT 0,
  p_badge_ids text[] DEFAULT '{}'::text[],
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_event public.gamification_events%ROWTYPE;
  normalized_badges text[] := COALESCE(p_badge_ids, '{}'::text[]);
  unlocked_badges text[] := '{}'::text[];
  missing_badges text[] := '{}'::text[];
  next_points integer := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'No autorizado para actualizar esta gamificación.';
  END IF;

  IF p_event_key IS NULL OR length(trim(p_event_key)) = 0 THEN
    RAISE EXCEPTION 'event_key es requerido.';
  END IF;

  IF p_event_type IS NULL OR length(trim(p_event_type)) = 0 THEN
    RAISE EXCEPTION 'event_type es requerido.';
  END IF;

  WITH normalized AS (
    SELECT DISTINCT badge_id
    FROM unnest(normalized_badges) AS badges(badge_id)
    WHERE badge_id IS NOT NULL AND length(trim(badge_id)) > 0
  )
  SELECT COALESCE(array_agg(n.badge_id), '{}'::text[])
  INTO missing_badges
  FROM normalized n
  LEFT JOIN public.badges b ON b.id = n.badge_id
  WHERE b.id IS NULL;

  INSERT INTO public.gamification_events (
    user_id,
    event_key,
    event_type,
    points_awarded,
    badge_ids,
    metadata
  )
  VALUES (
    p_user_id,
    p_event_key,
    p_event_type,
    GREATEST(COALESCE(p_points, 0), 0),
    normalized_badges,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (user_id, event_key) DO NOTHING
  RETURNING *
  INTO inserted_event;

  IF inserted_event.id IS NULL THEN
    SELECT points INTO next_points
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'alreadyProcessed', true,
      'pointsAwarded', 0,
      'badgesUnlocked', '[]'::jsonb,
      'missingBadges', to_jsonb(missing_badges),
      'totalPoints', COALESCE(next_points, 0)
    );
  END IF;

  UPDATE public.profiles
  SET points = COALESCE(points, 0) + inserted_event.points_awarded
  WHERE id = p_user_id
  RETURNING points INTO next_points;

  WITH valid_badges AS (
    SELECT DISTINCT badges.badge_id
    FROM unnest(normalized_badges) AS badges(badge_id)
    INNER JOIN public.badges b ON b.id = badges.badge_id
  ),
  inserted_badges AS (
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT p_user_id, badge_id
    FROM valid_badges
    ON CONFLICT (user_id, badge_id) DO NOTHING
    RETURNING badge_id
  )
  SELECT COALESCE(array_agg(badge_id), '{}'::text[])
  INTO unlocked_badges
  FROM inserted_badges;

  RETURN jsonb_build_object(
    'alreadyProcessed', false,
    'pointsAwarded', inserted_event.points_awarded,
    'badgesUnlocked', to_jsonb(unlocked_badges),
    'missingBadges', to_jsonb(missing_badges),
    'totalPoints', COALESCE(next_points, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_gamification_event(
  uuid,
  text,
  text,
  integer,
  text[],
  jsonb
) TO authenticated;
