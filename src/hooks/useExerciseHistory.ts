import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { fetchExerciseHistory } from '@app/services/supabase/session';

// The user's work sets of one exercise (Exercise Detail · Tu historial).
export function useExerciseHistory(exerciseId: string | null | undefined) {
  const { profile } = useAuth();
  const userId = profile?.id;
  return useQuery({
    queryKey: ['exercise-history', userId, exerciseId],
    enabled: Boolean(userId && exerciseId),
    staleTime: 60 * 1000,
    queryFn: () => fetchExerciseHistory(userId as string, exerciseId as string),
  });
}
