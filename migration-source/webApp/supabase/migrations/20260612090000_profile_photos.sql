ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Profile photos are publicly readable"
  ON storage.objects;
CREATE POLICY "Profile photos are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "Users can upload their profile photo"
  ON storage.objects;
CREATE POLICY "Users can upload their profile photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update their profile photo"
  ON storage.objects;
CREATE POLICY "Users can update their profile photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their profile photo"
  ON storage.objects;
CREATE POLICY "Users can delete their profile photo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
