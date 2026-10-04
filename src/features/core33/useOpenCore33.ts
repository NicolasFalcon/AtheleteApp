import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  core33EntryState,
  resolveCore33Discovery,
  resolveCore33Entry,
} from '@app/features/core33/core33Entry';
import { useAuth } from '@app/hooks/useAuth';
import { useCore33 } from '@app/hooks/useCore33';
import type { RootNavigation } from '@app/types/navigation';

// Opens Core 33 at the right screen for the user's current state.
export function useOpenCore33() {
  const navigation = useNavigation<RootNavigation>();
  const { profile } = useAuth();
  const { stateQuery } = useCore33();
  const status = stateQuery.data?.challenge?.status;
  const introSeen = Boolean(profile?.core33IntroSeenAt);

  return useCallback(() => {
    const entry = resolveCore33Entry(core33EntryState(status, introSeen));
    navigation.navigate(entry.name);
  }, [introSeen, navigation, status]);
}

// The CTA of the Core 33 discovery card (Inicio, HOME_10 / HOME_11) and of
// the empty Retos of Progreso: Intro the first time, Explorar retos after.
export function useOpenCore33Discovery() {
  const navigation = useNavigation<RootNavigation>();
  const { profile } = useAuth();
  const { stateQuery } = useCore33();
  const introSeen = Boolean(profile?.core33IntroSeenAt);
  const completed = stateQuery.data?.challenge?.status === 'completed' ? 1 : 0;

  return useCallback(
    // `completedCount`: Inicio knows how many were finished; without it the
    // last participation tells (a press event is ignored).
    (completedCount?: unknown) => {
      const entry = resolveCore33Discovery({
        introSeen,
        completedCount:
          typeof completedCount === 'number' ? completedCount : completed,
      });
      navigation.navigate(entry.name);
    },
    [completed, introSeen, navigation],
  );
}
