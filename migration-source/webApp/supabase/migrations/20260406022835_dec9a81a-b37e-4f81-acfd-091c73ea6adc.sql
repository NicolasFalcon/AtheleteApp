
ALTER TABLE public.workout_sessions 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS completed_exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

-- Update existing rows: set status based on completed column
UPDATE public.workout_sessions SET status = CASE WHEN completed = true THEN 'completed' ELSE 'canceled' END;
