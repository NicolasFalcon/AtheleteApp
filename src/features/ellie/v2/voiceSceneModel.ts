import type { LivingHaloState } from '@app/components/v2/livingHaloModel';

// Voice scene (ELLIE_04–07). UI only: the real flow (capture → recognition →
// reply → speech) arrives with TODO(voice); until then the dev build can walk
// through the four visual states.
export type VoiceState = Exclude<LivingHaloState, 'offline'>;

export const VOICE_ORDER: readonly VoiceState[] = [
  'idle',
  'listening',
  'thinking',
  'speaking',
];

// Tap on the Halo or the main button: idle → listening → thinking → speaking
// → idle (the same walk as the prototype's tap).
export function nextVoiceState(state: VoiceState): VoiceState {
  const index = VOICE_ORDER.indexOf(state);
  return VOICE_ORDER[(index + 1) % VOICE_ORDER.length];
}

// The main button shows the mic only at rest; in any other state it stops.
export function isVoiceBusy(state: VoiceState): boolean {
  return state !== 'idle';
}

// Rest-state hint (real copy, ELLIE_04).
export const VOICE_IDLE_HINT = 'Pregúntame por tu entreno, tu comida o tu descanso.';

// Sample lines for the dev walkthrough only (never shown in a release build).
export const VOICE_SAMPLE: Record<VoiceState, { text: string; dim: boolean }> = {
  idle: { text: '', dim: false },
  listening: { text: '¿Qué debería entrenar hoy si solo tengo 30 minutos?', dim: true },
  thinking: { text: '¿Qué debería entrenar hoy si solo tengo 30 minutos?', dim: true },
  speaking: {
    text: 'Hoy te va bien un circuito de cuerpo completo de 30 minutos, con descansos cortos.',
    dim: false,
  },
};
