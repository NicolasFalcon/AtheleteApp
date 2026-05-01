import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@app/hooks/useAuth';
import {getSupabaseClient} from '@app/services/supabase/client';
import type {PersonalRecord} from '@app/shared';

function mapPersonalRecordRow(row: any): PersonalRecord {
  return {
    id: row.id,
    userId: row.user_id,
    exerciseId: row.exercise_id,
    prType: row.pr_type,
    valueWeight: row.value_weight,
    valueReps: row.value_reps,
    valueDurationSec: row.value_duration_sec,
    valueDistanceM: row.value_distance_m,
    unit: row.unit,
    notes: row.notes,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
  };
}

export function usePersonalRecords() {
  const {profile} = useAuth();
  const userId = profile?.id;

  const query = useQuery({
    queryKey: ['personal-records', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const client = getSupabaseClient();

      if (!client || !userId) {
        return [];
      }

      const {data, error} = await (client as any)
        .from('personal_records')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', {ascending: false});

      if (error) {
        throw error;
      }

      return ((data || []) as any[]).map(mapPersonalRecordRow);
    },
  });

  const latestRecord = useMemo(
    () => (query.data && query.data.length > 0 ? query.data[0] : null),
    [query.data],
  );

  return {
    ...query,
    records: query.data || [],
    latestRecord,
  };
}
