import type { TargetChecks } from '@app/features/push/pushNavigation';
import { getSupabaseClient } from '@app/services/supabase/client';

type Client = { from: (table: string) => any };

// Direct reads (RLS of the owner / participant): a row the person cannot see
// counts as "not there", and the inbox opens instead.
async function exists(table: string, id: string): Promise<boolean> {
  const client = getSupabaseClient() as unknown as Client | null;
  if (!client) {
    throw new Error('offline');
  }
  const { data, error } = await client.from(table).select('id').eq('id', id).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data);
}

export const pushChecks: TargetChecks = {
  postExists: id => exists('social_posts', id),
  challengeExists: id => exists('social_challenges', id),
  async postOfNotification(notificationId) {
    const client = getSupabaseClient() as unknown as Client | null;
    if (!client) {
      throw new Error('offline');
    }
    const { data, error } = await client
      .from('social_notifications')
      .select('post_id')
      .eq('id', notificationId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return typeof data?.post_id === 'string' ? data.post_id : null;
  },
};
