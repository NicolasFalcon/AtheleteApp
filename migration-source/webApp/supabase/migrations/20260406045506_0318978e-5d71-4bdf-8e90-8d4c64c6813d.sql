
-- Create the exercise-demos storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-demos', 'exercise-demos', true);

-- Allow anyone authenticated to read files
CREATE POLICY "Anyone can view exercise demos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'exercise-demos');

-- Allow service role / admin to upload (no authenticated user uploads needed)
CREATE POLICY "Service role can upload exercise demos"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'exercise-demos');

CREATE POLICY "Service role can update exercise demos"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'exercise-demos');

CREATE POLICY "Service role can delete exercise demos"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'exercise-demos');
