import {
  deviceTimeZone,
  parseProgressSummary,
  type TrainingSummary,
} from '@app/features/progress/summaryAdapter';
import { getSupabaseClient } from '@app/services/supabase/client';

// Aggregates of the completed sessions from `from` (YYYY-MM-DD) computed by
// the server in the device's time zone (BT-23). Read only; the RPC filters by
// the signed-in user.
export async function fetchProgressSummary(
  from: string,
): Promise<TrainingSummary> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  const { data, error } = await client.rpc('get_progress_summary', {
    _from: from,
    _tz: deviceTimeZone(),
  });

  if (error) {
    throw error;
  }

  return parseProgressSummary(data);
}
