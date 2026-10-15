import { useQuery } from '@tanstack/react-query';
import { UPLOAD_BUCKET } from '@app/features/vision/imageUpload';
import { getSupabaseClient } from '@app/services/supabase/client';

const ONE_HOUR = 3600;

// A temporary URL for a photo of the private bucket (meals, machines, chat).
// Kept for ~50 minutes; null while loading or when there is no photo.
export function useSignedImage(path: string | null | undefined): string | null {
  const query = useQuery({
    queryKey: ['ellie', 'signed-image', path],
    enabled: Boolean(path),
    staleTime: 50 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const client = getSupabaseClient();
      if (!client || !path) {
        return null;
      }
      const { data, error } = await client.storage.from(UPLOAD_BUCKET).createSignedUrl(path, ONE_HOUR);
      return error ? null : data?.signedUrl ?? null;
    },
  });
  return query.data ?? null;
}
