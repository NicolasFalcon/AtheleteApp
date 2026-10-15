import type { EllieFailure, EllieLanguage } from '@app/features/ellie/ellieCopy';

// The state machine of ELLIE Voz (pure). Phases are the halo's: rest,
// listening, thinking, speaking, and error. The controller (voiceController.ts)
// does the side effects; this only decides what follows what.

export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export type VoiceErrorInfo =
  // Microphone or speech recognition not allowed (→ Ajustes).
  | { kind: 'permission' }
  // The recognizer failed (no network for a server recognizer, busy, interrupted…).
  | { kind: 'recognition' }
  // ellie-chat failed.
  | { kind: 'reply'; failure: EllieFailure };

export type VoiceState = {
  phase: VoicePhase;
  // What the person is saying (partials) / said.
  transcript: string;
  // What ELLIE answers (shown while she speaks, kept at rest).
  reply: string;
  // The answer came with a plan: it is waiting in the chat.
  hasPlan: boolean;
  error: VoiceErrorInfo | null;
  // The permission explanation is showing (first time).
  rationale: boolean;
};

export const INITIAL_VOICE: VoiceState = {
  phase: 'idle',
  transcript: '',
  reply: '',
  hasPlan: false,
  error: null,
  rationale: false,
};

export type RecognitionErrorCode = string;

export type VoiceEvent =
  // The main button or the halo.
  | { type: 'tap' }
  // Permissions: not asked yet (explain first) / refused.
  | { type: 'needs_rationale' }
  | { type: 'rationale_closed' }
  | { type: 'permission_denied' }
  // Recognition.
  | { type: 'listening_started' }
  | { type: 'partial'; text: string }
  | { type: 'final'; text: string }
  | { type: 'recognition_end' }
  | { type: 'recognition_error'; code: RecognitionErrorCode }
  // ELLIE.
  | { type: 'reply'; text: string; hasPlan: boolean }
  | { type: 'reply_error'; failure: EllieFailure }
  // Her voice.
  | { type: 'speech_done' }
  | { type: 'speech_error' };

// Codes of the recognizer that are not a failure: nothing was said, or we
// stopped it ourselves.
const QUIET_ERRORS = new Set(['no-speech', 'speech-timeout', 'aborted']);
const PERMISSION_ERRORS = new Set(['not-allowed', 'service-not-allowed']);

const fresh = (state: VoiceState): VoiceState => ({
  ...state,
  transcript: '',
  reply: '',
  hasPlan: false,
  error: null,
  rationale: false,
});

// What the person said ends the listening: a sentence goes to ELLIE, silence
// goes back to rest.
function endListening(state: VoiceState, text: string): VoiceState {
  const spoken = text.trim();
  return spoken
    ? { ...state, phase: 'thinking', transcript: spoken }
    : { ...state, phase: 'idle', transcript: '' };
}

export function voiceReducer(state: VoiceState, event: VoiceEvent): VoiceState {
  switch (event.type) {
    case 'tap':
      switch (state.phase) {
        case 'idle':
        case 'error':
          return { ...fresh(state), phase: 'listening' };
        case 'listening':
          // Tapping while listening ends it with what is there.
          return endListening(state, state.transcript);
        case 'thinking':
        case 'speaking':
          // Cancel / interrupt: back to rest, the text stays on screen.
          return { ...state, phase: 'idle' };
      }
      return state;

    case 'needs_rationale':
      return { ...fresh(state), phase: 'idle', rationale: true };

    case 'rationale_closed':
      return { ...state, rationale: false };

    case 'permission_denied':
      return { ...fresh(state), phase: 'error', error: { kind: 'permission' } };

    case 'listening_started':
      return state.phase === 'idle' || state.phase === 'error'
        ? { ...fresh(state), phase: 'listening' }
        : state;

    case 'partial':
      return state.phase === 'listening' ? { ...state, transcript: event.text } : state;

    case 'final':
      return state.phase === 'listening' ? endListening(state, event.text) : state;

    case 'recognition_end':
      return state.phase === 'listening' ? endListening(state, state.transcript) : state;

    case 'recognition_error':
      if (state.phase !== 'listening') {
        return state;
      }
      if (QUIET_ERRORS.has(event.code)) {
        return endListening(state, state.transcript);
      }
      return {
        ...state,
        phase: 'error',
        error: PERMISSION_ERRORS.has(event.code) ? { kind: 'permission' } : { kind: 'recognition' },
      };

    case 'reply':
      if (state.phase !== 'thinking') {
        return state;
      }
      return event.text.trim()
        ? { ...state, phase: 'speaking', reply: event.text, hasPlan: event.hasPlan }
        : { ...state, phase: 'idle', hasPlan: event.hasPlan };

    case 'reply_error':
      return state.phase === 'thinking'
        ? { ...state, phase: 'error', error: { kind: 'reply', failure: event.failure } }
        : state;

    case 'speech_done':
    case 'speech_error':
      return state.phase === 'speaking' ? { ...state, phase: 'idle' } : state;
  }
  return state;
}

// ── What the screen shows ───────────────────────────────────────────────────
export type HaloFor = 'idle' | 'listening' | 'thinking' | 'speaking' | 'offline';

// The error state is the still sphere without halo (the halo's "offline").
export function haloFor(phase: VoicePhase): HaloFor {
  return phase === 'error' ? 'offline' : phase;
}

// The main button shows the mic only at rest and after an error.
export function isVoiceActive(phase: VoicePhase): boolean {
  return phase === 'listening' || phase === 'thinking' || phase === 'speaking';
}

const LABELS: Record<EllieLanguage, Record<VoicePhase, string>> = {
  es: {
    idle: 'Toca para hablar',
    listening: 'Escuchando…',
    thinking: 'Pensando…',
    speaking: 'Hablando…',
    error: 'No pude hacerlo',
  },
  en: {
    idle: 'Tap to talk',
    listening: 'Listening…',
    thinking: 'Thinking…',
    speaking: 'Speaking…',
    error: "I couldn't do that",
  },
};

export function voiceLabel(phase: VoicePhase, language: EllieLanguage): string {
  return LABELS[language][phase];
}

export const VOICE_HINT: Record<EllieLanguage, string> = {
  es: 'Pregúntame por tu entreno, tu comida o tu descanso.',
  en: 'Ask me about your workout, your food or your rest.',
};

export const VOICE_ERROR_LINE = {
  permission: {
    es: 'Necesito el micrófono y el reconocimiento de voz para escucharte. Actívalos en Ajustes.',
    en: 'I need the microphone and speech recognition to hear you. Turn them on in Settings.',
  },
  recognition: {
    es: 'No pude escucharte bien. Toca para intentarlo de nuevo.',
    en: "I couldn't hear you properly. Tap to try again.",
  },
} as const;
