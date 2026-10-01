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
