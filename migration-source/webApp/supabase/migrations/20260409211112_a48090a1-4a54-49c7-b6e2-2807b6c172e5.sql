
-- Create daily_hydration_logs table
CREATE TABLE public.daily_hydration_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  water_ml INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_hydration_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own hydration logs"
ON public.daily_hydration_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own hydration logs"
ON public.daily_hydration_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own hydration logs"
ON public.daily_hydration_logs FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_hydration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_daily_hydration_logs_updated_at
BEFORE UPDATE ON public.daily_hydration_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_hydration_updated_at();
