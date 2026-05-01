import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
export type { ExercisePRSummary, PRInsert, PRType, PersonalRecord } from '@athelete/domain/personal-records';
export { formatPRValue, getBestPR, getPRMainValue, prTypeLabels, prTypeUnits } from '@athelete/domain/personal-records';
import type { PRInsert, PersonalRecord } from '@athelete/domain/personal-records';
function mapRow(row: any): PersonalRecord {
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
  const { user } = useAuth();
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    let query = supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false });
    
    if (exerciseId) {
      query = query.eq('exercise_id', exerciseId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setRecords(data.map(mapRow));
    }
    setLoading(false);
  }, [user?.id, exerciseId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const addRecord = async (pr: PRInsert): Promise<boolean> => {
    if (!user?.id) return false;
    const { error } = await supabase.from('personal_records').insert({
      user_id: user.id,
      exercise_id: pr.exerciseId,
      pr_type: pr.prType,
      value_weight: pr.valueWeight ?? null,
      value_reps: pr.valueReps ?? null,
      value_duration_sec: pr.valueDurationSec ?? null,
      value_distance_m: pr.valueDistanceM ?? null,
      unit: pr.unit ?? 'kg',
      notes: pr.notes ?? null,
      recorded_at: pr.recordedAt ?? new Date().toISOString(),
    });
    if (!error) {
      await fetchRecords();
      return true;
    }
    return false;
  };

  const deleteRecord = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('personal_records').delete().eq('id', id);
    if (!error) {
      await fetchRecords();
      return true;
    }
    return false;
  };

  return { records, loading, addRecord, deleteRecord, refresh: fetchRecords };
}

export function useAllPersonalRecords() {
  return usePersonalRecords(undefined);
}
