ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_key TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_gender_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gender_check
  CHECK (gender IS NULL OR gender IN ('male', 'female'));
