import type { PromptReason } from '@app/features/push/pushPermission';

// A request to show the pre-permission screen, from anywhere (the end of the
// onboarding, Comunidad, the inbox). The host decides whether it is the right
// moment; asking twice is harmless.
type Listener = (reason: PromptReason | null) => void;

let current: PromptReason | null = null;
const listeners = new Set<Listener>();

export function requestPushPrompt(reason: PromptReason): void {
  current = reason;
  listeners.forEach(listener => listener(current));
}

export function clearPushPrompt(): void {
  current = null;
  listeners.forEach(listener => listener(null));
}

export function subscribePushPrompt(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}
