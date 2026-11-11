import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { SOUND_EVENTS, allowed, type SoundEventId } from '@app/features/sound/soundModel';
import { getFeedbackPrefs } from '@app/lib/feedbackPrefs';

// The rest cues played natively (modules/rest-cues · AVAudioEngine) at
// absolute times, so they also sound with the app in the background or the
// screen locked. Where the module exists (iOS) it is the only source of
// these sounds, foreground included; elsewhere the session plays them from
// JS. Every call is safe: without the module or on an error, nothing sounds.

export type RestCueEvent = { id: SoundEventId; offsetFromEnd: number };

// §28.7: rest-warn at 10 s, rest-tick at 5–4–3–2, rest-tick-strong at 1,
// rest-go at 0. A rest shorter than 10 s gets the ones that fit.
export const REST_CUE_EVENTS: readonly RestCueEvent[] = [
  { id: 'rest-warn', offsetFromEnd: 10 },
  { id: 'rest-tick', offsetFromEnd: 5 },
  { id: 'rest-tick', offsetFromEnd: 4 },
  { id: 'rest-tick', offsetFromEnd: 3 },
  { id: 'rest-tick', offsetFromEnd: 2 },
  { id: 'rest-tick-strong', offsetFromEnd: 1 },
  { id: 'rest-go', offsetFromEnd: 0 },
];

type NativeRestCues = {
  schedule(plan: { restEndsAt: number; events: readonly RestCueEvent[] }): Promise<boolean>;
  cancel(): Promise<void>;
};

const native =
  Platform.OS === 'ios' ? requireOptionalNativeModule<NativeRestCues>('RestCues') : null;

// true: the rest sounds come from the native module, not from JS.
export function nativeRestCues(): boolean {
  return native !== null;
}

// The rest cues will sound: the module exists, Ajustes · Sonido is not
// Silencio and "Sonido de la sesión" is on (the same rule as playSound).
export function restCuesAudible(): boolean {
  const prefs = getFeedbackPrefs();
  return native !== null && allowed(SOUND_EVENTS['rest-warn'], prefs.soundMode, prefs.sessionSound);
}

// One call after another, so a cancel never lands before a schedule still
// in flight.
let chain: Promise<unknown> = Promise.resolve();
function serial(task: () => Promise<unknown>): Promise<void> {
  const run = chain.then(task, task).then(
    () => undefined,
    () => undefined,
  );
  chain = run;
  return run;
}

// Replaces whatever was scheduled (a new rest, +30 s, resuming a pause).
// Nothing runs natively when no cue is audible (Sonido en Silencio, "Sonido de
// la sesión" off): the audio background mode is used only for sound that is
// heard. The native side also announces the end of the rest (the Live
// Activity takes its next state there); without sound the activity gets to
// the set through its staleDate instead.
export function scheduleRestCues({
  restEndsAt,
  events = REST_CUE_EVENTS,
}: {
  restEndsAt: number;
  events?: readonly RestCueEvent[];
}): Promise<void> {
  if (!native) {
    return Promise.resolve();
  }
  if (!restCuesAudible()) {
    return cancelRestCues();
  }
  return serial(() => native.schedule({ restEndsAt, events }));
}

// No more cues and the audio session is given back. Idempotent.
export function cancelRestCues(): Promise<void> {
  if (!native) {
    return Promise.resolve();
  }
  return serial(() => native.cancel());
}
