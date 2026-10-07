import { useSyncExternalStore } from 'react';

// The first real screen (session restored, onboarding flag read) has mounted.
// The launch overlay waits for it before fading out.
let firstScreenReady = false;
const listeners = new Set<() => void>();

export function markFirstScreenReady() {
  if (firstScreenReady) {
    return;
  }
  firstScreenReady = true;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFirstScreenReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => firstScreenReady,
    () => firstScreenReady,
  );
}
