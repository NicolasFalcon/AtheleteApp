import {
  parseBadgeProgress,
  type BadgeProgressRow,
} from '@app/features/progress/badgesModel';
import { getSupabaseClient } from '@app/services/supabase/client';

// current / target / earned / category of every badge for the signed-in user,
// computed by the server (BT-24). Read only.
export async function fetchBadgeProgress(): Promise<BadgeProgressRow[]> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  const { data, error } = await client.rpc('get_badge_progress');

  if (error) {
    throw error;
  }

  return parseBadgeProgress(data);
}
