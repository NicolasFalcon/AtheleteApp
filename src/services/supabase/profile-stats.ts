import { getSupabaseClient } from '@app/services/supabase/client';

export type ProfileStats = {
  sessions: number;
  firstSession: { at: string; title: string } | null;
};

// Perfil · "Sesiones" and the first line of the trajectory: completed
// sessions of the user (all time). Read only.
export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }
  const base = () =>
    (client.from('workout_sessions') as any)
      .select('id, workout_title, started_at, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'completed');

  const [{ count, error }, first] = await Promise.all([
    base().limit(1),
    base().order('started_at', { ascending: true, nullsFirst: false }).limit(1),
  ]);
  if (error) {
    throw error;
  }
  const row = first.data?.[0];
  return {
    sessions: count ?? 0,
    firstSession: row
      ? {
          at: row.started_at ?? row.created_at,
          title: row.workout_title ?? 'Primera sesión',
        }
      : null,
  };
}
