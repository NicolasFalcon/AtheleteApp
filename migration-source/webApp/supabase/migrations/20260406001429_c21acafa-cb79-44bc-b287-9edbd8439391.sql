
-- Add points to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_calorie_goal integer DEFAULT 2000;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_protein_goal integer DEFAULT 120;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_carbs_goal integer DEFAULT 250;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_fat_goal integer DEFAULT 65;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_water_goal integer DEFAULT 14;

-- Workout templates (catalog)
CREATE TABLE public.workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'strength',
  duration integer NOT NULL DEFAULT 30,
  difficulty text NOT NULL DEFAULT 'intermediate',
  calories integer NOT NULL DEFAULT 0,
  target_muscles text[] DEFAULT '{}',
  is_premium boolean DEFAULT false,
  image_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Template exercises
CREATE TABLE public.template_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.workout_templates(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  sets integer,
  reps integer,
  duration integer,
  rest_time integer DEFAULT 60,
  sort_order integer DEFAULT 0
);

-- Workout sessions (user history)
CREATE TABLE public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workout_id uuid REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  workout_title text NOT NULL DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  completed boolean DEFAULT false,
  duration integer DEFAULT 0,
  calories_burned integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Nutrition plans
CREATE TABLE public.nutrition_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_calories integer NOT NULL DEFAULT 2000,
  target_protein integer NOT NULL DEFAULT 120,
  target_carbs integer,
  target_fats integer,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Daily nutrition logs
CREATE TABLE public.daily_nutrition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  calories integer DEFAULT 0,
  protein integer DEFAULT 0,
  carbs integer DEFAULT 0,
  fats integer DEFAULT 0,
  adherence integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Challenge participations
CREATE TABLE public.challenge_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  habits jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habit logs
CREATE TABLE public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participation_id uuid REFERENCES public.challenge_participations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  habit_index integer NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(participation_id, date, habit_index)
);

-- Badges catalog
CREATE TABLE public.badges (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL
);

-- User badges (earned)
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id text REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Insert default badges
INSERT INTO public.badges (id, title, description, icon) VALUES
  ('first_workout', 'First Workout', 'Complete your first training session.', '💪'),
  ('week_consistency', 'Week Consistency', 'Complete 3 workouts in one week.', '📅'),
  ('core33_finisher', 'Core 33 Finisher', 'Finish the Athelete Core · 33 challenge.', '🏆'),
  ('streak_7_days', '7-Day Streak', 'Stay active 7 days in a row.', '🔥'),
  ('nutrition_started', 'Nutrition Starter', 'Activate your first nutrition plan.', '🥗'),
  ('first_custom_workout', 'First Custom Workout', 'Create your first custom workout in Athelete.', '🛠️');

-- ============ RLS POLICIES ============

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- workout_templates: public read, owner CRUD
CREATE POLICY "Anyone can read public templates" ON public.workout_templates FOR SELECT TO authenticated USING (is_public = true OR created_by = auth.uid());
CREATE POLICY "Users can insert own templates" ON public.workout_templates FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own templates" ON public.workout_templates FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can delete own templates" ON public.workout_templates FOR DELETE TO authenticated USING (created_by = auth.uid());

-- template_exercises: readable if template is accessible
CREATE POLICY "Read exercises for accessible templates" ON public.template_exercises FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workout_templates wt WHERE wt.id = template_id AND (wt.is_public = true OR wt.created_by = auth.uid()))
);
CREATE POLICY "Manage exercises for own templates" ON public.template_exercises FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.workout_templates wt WHERE wt.id = template_id AND wt.created_by = auth.uid())
);
CREATE POLICY "Update exercises for own templates" ON public.template_exercises FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workout_templates wt WHERE wt.id = template_id AND wt.created_by = auth.uid())
);
CREATE POLICY "Delete exercises for own templates" ON public.template_exercises FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workout_templates wt WHERE wt.id = template_id AND wt.created_by = auth.uid())
);

-- workout_sessions: user's own
CREATE POLICY "Users can read own sessions" ON public.workout_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own sessions" ON public.workout_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sessions" ON public.workout_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- nutrition_plans: user's own
CREATE POLICY "Users can read own nutrition plans" ON public.nutrition_plans FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own nutrition plans" ON public.nutrition_plans FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own nutrition plans" ON public.nutrition_plans FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- daily_nutrition_logs: user's own
CREATE POLICY "Users can read own nutrition logs" ON public.daily_nutrition_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own nutrition logs" ON public.daily_nutrition_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own nutrition logs" ON public.daily_nutrition_logs FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- challenge_participations: user's own
CREATE POLICY "Users can read own participations" ON public.challenge_participations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own participations" ON public.challenge_participations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own participations" ON public.challenge_participations FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- habit_logs: user's own
CREATE POLICY "Users can read own habit logs" ON public.habit_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own habit logs" ON public.habit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own habit logs" ON public.habit_logs FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- badges: public catalog
CREATE POLICY "Anyone can read badges" ON public.badges FOR SELECT TO authenticated USING (true);

-- user_badges: user's own
CREATE POLICY "Users can read own badges" ON public.user_badges FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own badges" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
