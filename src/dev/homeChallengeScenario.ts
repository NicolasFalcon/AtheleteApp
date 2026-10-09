import { useSyncExternalStore } from 'react';
import { Platform, Settings } from 'react-native';
import {
  isHomeChallengeScenario,
  type HomeChallengeScenario,
} from '@app/features/home/homeChallengeSection';

// Development only: forces the official challenge section of Inicio to a
// sample scenario (athelete://dev/home?scenario=<key>). In-memory, never
// persisted. In production builds the hook always returns null.
// iOS launch argument for captures: `-homeChallenge challengeJoined`.
function initialScenario(): HomeChallengeScenario | null {
  if (!__DEV__ || Platform.OS !== 'ios') {
    return null;
  }
  const value = Settings.get('homeChallenge');
  return typeof value === 'string' && isHomeChallengeScenario(value) ? value : null;
}

let current: HomeChallengeScenario | null = initialScenario();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setHomeChallengeScenario(next: HomeChallengeScenario | null) {
  if (!__DEV__) {
    return;
  }
  current = next;
  listeners.forEach(listener => listener());
}

export function useHomeChallengeScenario(): HomeChallengeScenario | null {
  const value = useSyncExternalStore(subscribe, () => current);
  return __DEV__ ? value : null;
}
