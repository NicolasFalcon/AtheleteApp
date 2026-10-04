import { mapWorkoutSession } from '@app/services/supabase/fitness';
import { getSupabaseClient } from '@app/services/supabase/client';
import type { WorkoutSession } from '@app/shared';

// Completed sessions since `sinceDate` (YYYY-MM-DD, local), oldest first, with
// the pause bookkeeping and the server volume that Progreso needs
// (workout_sessions: started_at, ended_at, paused_total_sec, volume_kg).
export async function fetchTrainingHistory(
  userId: string,
  sinceDate: string,
): Promise<WorkoutSession[]> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  const { data, error } = await client
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('date', sinceDate)
    .order('date', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(mapWorkoutSession);
}
