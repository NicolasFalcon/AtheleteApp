
-- Create exercises table
CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  muscle_group text NOT NULL DEFAULT 'full_body',
  primary_muscles text[] DEFAULT '{}',
  secondary_muscles text[] DEFAULT '{}',
  equipment text DEFAULT 'bodyweight',
  difficulty text DEFAULT 'intermediate',
  category text DEFAULT 'strength',
  how_to_steps text[] DEFAULT '{}',
  technique_cues text[] DEFAULT '{}',
  common_mistakes text[] DEFAULT '{}',
  recommended_sets_reps jsonb DEFAULT '{}',
  thumbnail_url text,
  video_url text,
  video_orientation text DEFAULT 'landscape',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read exercises" ON public.exercises
  FOR SELECT TO authenticated USING (true);

-- Add missing columns to workout_templates
ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add missing columns to template_exercises
ALTER TABLE public.template_exercises
  ADD COLUMN IF NOT EXISTS exercise_id uuid REFERENCES public.exercises(id),
  ADD COLUMN IF NOT EXISTS notes text;
