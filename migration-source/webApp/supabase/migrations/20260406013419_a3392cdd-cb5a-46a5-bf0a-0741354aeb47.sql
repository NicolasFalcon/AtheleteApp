
-- Add ELLIE context fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS training_environment text DEFAULT 'gym',
  ADD COLUMN IF NOT EXISTS available_equipment text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS restrictions_notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS injury_notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS exercise_preferences text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exercise_avoidances text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS diet_preferences text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS food_avoidances text[] DEFAULT '{}';

-- Add AI source tracking to workout_templates
ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS created_by_ai boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text DEFAULT null;

-- Add AI source tracking to nutrition_plans
ALTER TABLE public.nutrition_plans
  ADD COLUMN IF NOT EXISTS created_by_ai boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text DEFAULT null;
