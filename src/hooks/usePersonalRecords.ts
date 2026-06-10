import {useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@app/hooks/useAuth';
import {invalidatePersonalRecordQueries} from '@app/lib/queryInvalidation';
import {awardGamificationEvent} from '@app/services/supabase/gamification';
import {getSupabaseClient} from '@app/services/supabase/client';
import type {PRInsert, PersonalRecord} from '@app/shared';

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

export function usePersonalRecords(exerciseId?: string) {
  const {profile} = useAuth();
  const userId = profile?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['personal-records', userId, exerciseId || 'all'],
    enabled: Boolean(userId),
    queryFn: async () => {
      const client = getSupabaseClient();

      if (!client || !userId) {
        return [];
      }

      let builder = (client as any)
        .from('personal_records')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', {ascending: false});

      if (exerciseId) {
        builder = builder.eq('exercise_id', exerciseId);
      }

      const {data, error} = await builder;

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

  const addMutation = useMutation({
    mutationFn: async (pr: PRInsert) => {
      const client = getSupabaseClient();

      if (!client || !userId) {
        throw new Error('No hay una sesión activa para registrar PRs.');
      }

      const {data, error} = await (client as any)
        .from('personal_records')
        .insert({
        user_id: userId,
        exercise_id: pr.exerciseId,
        pr_type: pr.prType,
        value_weight: pr.valueWeight ?? null,
        value_reps: pr.valueReps ?? null,
        value_duration_sec: pr.valueDurationSec ?? null,
        value_distance_m: pr.valueDistanceM ?? null,
        unit: pr.unit ?? 'kg',
        notes: pr.notes ?? null,
        recorded_at: pr.recordedAt ?? new Date().toISOString(),
        })
        .select('id, exercise_id, pr_type')
        .single();

      if (error) {
        throw error;
      }

      if (data?.id) {
        await awardGamificationEvent({
          userId,
          eventKey: `personal_record:${data.id}`,
          eventType: 'personal_record_created',
          points: 25,
          badgeIds: ['first_pr'],
          metadata: {
            recordId: data.id,
            exerciseId: data.exercise_id,
            prType: data.pr_type,
          },
        });
      }
    },
    onSuccess: async () => {
      if (userId) {
        await invalidatePersonalRecordQueries(queryClient, userId);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const client = getSupabaseClient();

      if (!client || !userId) {
        throw new Error('No hay una sesión activa para editar PRs.');
      }

      const {error} = await (client as any)
        .from('personal_records')
        .delete()
        .eq('id', recordId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      if (userId) {
        await invalidatePersonalRecordQueries(queryClient, userId);
      }
    },
  });

  return {
    ...query,
    records: query.data || [],
    latestRecord,
    addRecord: addMutation.mutateAsync,
    deleteRecord: deleteMutation.mutateAsync,
    isAddingRecord: addMutation.isPending,
    isDeletingRecord: deleteMutation.isPending,
    refresh: query.refetch,
  };
}
