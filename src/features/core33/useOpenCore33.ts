import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  core33EntryState,
  resolveCore33Entry,
} from '@app/features/core33/core33Entry';
import { useCore33 } from '@app/hooks/useCore33';
import type { RootNavigation } from '@app/types/navigation';

// Opens Core 33 at the right screen for the user's current state.
export function useOpenCore33() {
  const navigation = useNavigation<RootNavigation>();
  const { stateQuery } = useCore33();
  const status = stateQuery.data?.challenge?.status;

  return useCallback(() => {
    const entry = resolveCore33Entry(core33EntryState(status));
    navigation.navigate(entry.name);
  }, [navigation, status]);
}

// Single connection point of the Core 33 discovery card (Inicio, HOME_10 /
// HOME_11: "Descubrir Core 33" / "Empieza otro Core 33").
// TODO(core33-feature): route through resolveCore33Entry once the v2 Intro
// (3 moments) and "Explorar retos" screens exist:
//   - never saw the Intro → Intro → Explorar retos
//   - saw the Intro, or completed one before → Explorar retos
// Until then the CTA intentionally does nothing (MIGRATION_PROGRESS §17).
export function useOpenCore33Discovery() {
  return useCallback(() => {
    if (__DEV__) {
      console.info('[core33] discovery CTA not connected yet (TODO)');
    }
  }, []);
}
