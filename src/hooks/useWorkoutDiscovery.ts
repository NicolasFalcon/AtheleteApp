import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { fetchWorkoutLibraryPage } from '@app/services/supabase/fitness';

const DISCOVERY_PAGE_SIZE = 6;

export function useWorkoutDiscovery(enabled: boolean) {
  const { profile } = useAuth();
  const userId = profile?.id;

  return useQuery({
    queryKey: ['workouts', 'discovery', userId ?? 'guest'],
    enabled,
    queryFn: async () => {
      const common = {
        search: '',
        favoriteIds: null,
        page: 0,
        pageSize: DISCOVERY_PAGE_SIZE,
      };
      const [recommended, strength, cardio, hiit, mobility, ellie, mine] =
        await Promise.all([
          fetchWorkoutLibraryPage({
            ...common,
            source: 'library',
            type: 'all',
            userId,
          }),
          fetchWorkoutLibraryPage({
            ...common,
            source: 'library',
            type: 'strength',
            userId,
          }),
          fetchWorkoutLibraryPage({
            ...common,
            source: 'library',
            type: 'cardio',
            userId,
          }),
          fetchWorkoutLibraryPage({
            ...common,
            source: 'library',
            type: 'hiit',
            userId,
          }),
          fetchWorkoutLibraryPage({
            ...common,
            source: 'library',
            type: 'mobility',
            userId,
          }),
          fetchWorkoutLibraryPage({
            ...common,
            source: 'ellie',
            type: 'all',
            userId,
          }),
          fetchWorkoutLibraryPage({
            ...common,
            source: 'mine',
            type: 'all',
            userId,
          }),
        ]);

      return {
        recommended: recommended.items,
        strength: strength.items,
        cardio: cardio.items,
        hiit: hiit.items,
        mobility: mobility.items,
        ellie: ellie.items,
        mine: mine.items,
      };
    },
  });
}
