import { useSyncExternalStore } from 'react';

// Comunidad abierta · what the person just did, before the server answers
// again: follow / unfollow (optimistic, the same on every card of that author
// and on the profile) and blocks (everything of that person leaves the
// screen at once). Per session; a refreshed list brings the server's values.

const following = new Map<string, boolean>();
const blocked = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => version;

export function setFollowing(userId: string, value: boolean): void {
  following.set(userId, value);
  emit();
}

export function markBlocked(userId: string): void {
  blocked.add(userId);
  following.delete(userId);
  emit();
}

export function markUnblocked(userId: string): void {
  if (blocked.delete(userId)) {
    emit();
  }
}

export function isBlockedNow(userId: string): boolean {
  return blocked.has(userId);
}

// What the button shows: my last tap, else what the server said.
export function useFollowing(userId: string, server: boolean): boolean {
  useSyncExternalStore(subscribe, snapshot);
  return following.get(userId) ?? server;
}

// Re-renders when someone is blocked (lists filter with isBlockedNow).
export function useBlockedVersion(): number {
  return useSyncExternalStore(subscribe, snapshot);
}
