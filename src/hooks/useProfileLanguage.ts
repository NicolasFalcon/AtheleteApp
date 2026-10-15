import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { normalizeLanguage, type EllieLanguage } from '@app/features/ellie/ellieCopy';
import { getSupabaseClient } from '@app/services/supabase/client';

// profiles.language ('es' | 'en', es by default): the language of ELLIE's
// answers (the server reads it too) and of her voice.
export function useProfileLanguage(): EllieLanguage {
  const { profile } = useAuth();
  const userId = profile?.id;
  const query = useQuery({
    queryKey: ['profile', 'language', userId],
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const client = getSupabaseClient() as unknown as { from: (table: string) => any } | null;
      if (!client) {
        return 'es';
      }
      const { data } = await client.from('profiles').select('language').eq('id', userId).maybeSingle();
      return normalizeLanguage(data?.language);
    },
  });
  return query.data ?? 'es';
}
