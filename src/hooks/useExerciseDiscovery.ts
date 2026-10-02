import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { fetchExerciseLibraryPage } from '@app/services/supabase/fitness';

const goalBodyPart = {
  lose_weight: 'cardio',
  gain_muscle: 'chest',
  maintain: 'fullbody',
  improve_health: 'mobility',
  performance: 'fullbody',
} as const;

export function useExerciseDiscovery(enabled: boolean) {
  const { profile } = useAuth();
  const bodyPart = profile?.goal ? goalBodyPart[profile.goal] : 'fullbody';

  return useQuery({
    queryKey: ['exercises', 'discovery', profile?.id ?? 'guest', bodyPart],
    enabled,
    queryFn: async () => {
      const params = {
        search: '',
        equipment: 'all',
        level: 'all',
        favoriteIds: null,
        page: 0,
        pageSize: 8,
      };
      const [personalized, fallback] = await Promise.all([
        fetchExerciseLibraryPage({ ...params, bodyPart }),
        fetchExerciseLibraryPage({ ...params, bodyPart: 'all' }),
      ]);

      return {
        recommendationLabel:
          bodyPart === 'cardio'
            ? 'Para mejorar tu capacidad'
            : bodyPart === 'mobility'
            ? 'Para moverte mejor'
            : bodyPart === 'chest'
            ? 'Para ganar fuerza'
            : 'Para un trabajo completo',
        exercises:
          personalized.items.length >= 3 ? personalized.items : fallback.items,
      };
    },
  });
}
