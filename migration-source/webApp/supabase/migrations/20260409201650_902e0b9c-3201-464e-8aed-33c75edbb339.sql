
-- Create personal_records table
CREATE TABLE public.personal_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  pr_type TEXT NOT NULL CHECK (pr_type IN ('max_weight', 'weight_reps', 'max_reps', 'duration', 'distance')),
  value_weight NUMERIC NULL,
  value_reps INTEGER NULL,
  value_duration_sec INTEGER NULL,
  value_distance_m NUMERIC NULL,
  unit TEXT NULL DEFAULT 'kg',
  notes TEXT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own PRs"
ON public.personal_records FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own PRs"
ON public.personal_records FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own PRs"
ON public.personal_records FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own PRs"
ON public.personal_records FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_personal_records_user_exercise ON public.personal_records (user_id, exercise_id);
CREATE INDEX idx_personal_records_recorded_at ON public.personal_records (recorded_at DESC);
