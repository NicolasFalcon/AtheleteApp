import {
  INITIAL_VOICE,
  VOICE_ERROR_LINE,
  haloFor,
  isVoiceActive,
  voiceLabel,
  voiceReducer,
  type VoiceEvent,
  type VoiceState,
} from '../src/features/ellie/voice/voiceMachine';
import { pickVoice, plainSpeech, type DeviceVoice } from '../src/features/ellie/voice/speaker';

const run = (events: VoiceEvent[], from: VoiceState = INITIAL_VOICE) => events.reduce(voiceReducer, from);

describe('voice machine', () => {
  it('walks rest → listening → thinking → speaking → rest', () => {
    let s = run([{ type: 'tap' }]);
    expect(s.phase).toBe('listening');
    s = run([{ type: 'partial', text: 'qué entreno' }, { type: 'partial', text: 'qué entreno hoy' }], s);
    expect(s.transcript).toBe('qué entreno hoy');
    s = run([{ type: 'final', text: 'qué entreno hoy' }], s);
    expect(s.phase).toBe('thinking');
    s = run([{ type: 'reply', text: 'Hoy te va bien pierna.', hasPlan: false }], s);
    expect(s).toMatchObject({ phase: 'speaking', reply: 'Hoy te va bien pierna.' });
    s = run([{ type: 'speech_done' }], s);
    expect(s.phase).toBe('idle');
    expect(s.reply).toBe('Hoy te va bien pierna.');
  });

  it('tapping while listening ends it: with words they go to ELLIE, without words it rests', () => {
    const withWords = run([{ type: 'tap' }, { type: 'partial', text: 'hola' }, { type: 'tap' }]);
    expect(withWords).toMatchObject({ phase: 'thinking', transcript: 'hola' });
    const silent = run([{ type: 'tap' }, { type: 'tap' }]);
    expect(silent.phase).toBe('idle');
  });

  it('the end of recognition without text goes back to rest, with text it sends', () => {
    expect(run([{ type: 'tap' }, { type: 'recognition_end' }]).phase).toBe('idle');
    expect(run([{ type: 'tap' }, { type: 'partial', text: 'ok' }, { type: 'recognition_end' }]).phase).toBe('thinking');
  });

  it('tapping while she thinks cancels, tapping while she speaks interrupts', () => {
    const thinking = run([{ type: 'tap' }, { type: 'final', text: 'hola' }]);
    expect(run([{ type: 'tap' }], thinking).phase).toBe('idle');
    const speaking = run([{ type: 'reply', text: 'Hola', hasPlan: false }], thinking);
    expect(speaking.phase).toBe('speaking');
    expect(run([{ type: 'tap' }], speaking).phase).toBe('idle');
  });

  it('late events of a cancelled turn do nothing', () => {
    const rest = run([{ type: 'tap' }, { type: 'final', text: 'hola' }, { type: 'tap' }]);
    expect(run([{ type: 'reply', text: 'tarde', hasPlan: false }], rest)).toBe(rest);
    expect(run([{ type: 'speech_done' }, { type: 'partial', text: 'x' }], rest)).toBe(rest);
  });

  it('quiet recognizer errors are not failures; permission and others are', () => {
    expect(run([{ type: 'tap' }, { type: 'recognition_error', code: 'no-speech' }]).phase).toBe('idle');
    expect(run([{ type: 'tap' }, { type: 'recognition_error', code: 'aborted' }]).phase).toBe('idle');
    expect(run([{ type: 'tap' }, { type: 'recognition_error', code: 'not-allowed' }])).toMatchObject({
      phase: 'error',
      error: { kind: 'permission' },
    });
    expect(run([{ type: 'tap' }, { type: 'recognition_error', code: 'audio-capture' }])).toMatchObject({
      phase: 'error',
      error: { kind: 'recognition' },
    });
  });

  it('a failed answer is the error state with its failure; a tap tries again', () => {
    let s = run([{ type: 'tap' }, { type: 'final', text: 'hola' }, { type: 'reply_error', failure: { code: 'daily_limit', used: 40, limit: 40 } }]);
    expect(s).toMatchObject({ phase: 'error', error: { kind: 'reply', failure: { code: 'daily_limit' } } });
    s = run([{ type: 'tap' }], s);
    expect(s).toMatchObject({ phase: 'listening', error: null, transcript: '' });
  });

  it('the permission is explained first, refused permission is an error', () => {
    expect(run([{ type: 'needs_rationale' }])).toMatchObject({ phase: 'idle', rationale: true });
    expect(run([{ type: 'needs_rationale' }, { type: 'rationale_closed' }]).rationale).toBe(false);
    expect(run([{ type: 'permission_denied' }])).toMatchObject({ phase: 'error', error: { kind: 'permission' } });
  });

  it('an empty answer goes straight back to rest; a plan is remembered', () => {
    const thinking = run([{ type: 'tap' }, { type: 'final', text: 'plan' }]);
    expect(run([{ type: 'reply', text: '  ', hasPlan: false }], thinking).phase).toBe('idle');
    expect(run([{ type: 'reply', text: 'Listo', hasPlan: true }], thinking).hasPlan).toBe(true);
  });
});

describe('voice presentation', () => {
  it('maps phases to the halo (error = still sphere) and labels in both languages', () => {
    expect(haloFor('idle')).toBe('idle');
    expect(haloFor('listening')).toBe('listening');
    expect(haloFor('thinking')).toBe('thinking');
    expect(haloFor('speaking')).toBe('speaking');
    expect(haloFor('error')).toBe('offline');
    expect(voiceLabel('listening', 'es')).toBe('Escuchando…');
    expect(voiceLabel('listening', 'en')).toBe('Listening…');
    expect(voiceLabel('error', 'en').length).toBeGreaterThan(3);
    expect(VOICE_ERROR_LINE.permission.en).toMatch(/Settings/);
    expect(isVoiceActive('idle')).toBe(false);
    expect(isVoiceActive('error')).toBe(false);
    expect(isVoiceActive('speaking')).toBe(true);
  });
});

describe('best voice and spoken text', () => {
  const voices: DeviceVoice[] = [
    { identifier: 'es-mx-default', language: 'es-MX', quality: 'Default' },
    { identifier: 'es-es-default', language: 'es-ES', quality: 'Default' },
    { identifier: 'es-es-enhanced', language: 'es-ES', quality: 'Enhanced' },
    { identifier: 'en-gb-premium', language: 'en-GB', quality: 'Premium' },
    { identifier: 'en-us-default', language: 'en-US', quality: 'Default' },
    { identifier: 'fr-default', language: 'fr-FR', quality: 'Enhanced' },
  ];

  it('prefers the exact locale, then the quality', () => {
    expect(pickVoice(voices, 'es')).toBe('es-es-enhanced');
    expect(pickVoice(voices, 'en')).toBe('en-us-default');
  });

  it('falls back to another region of the language, and to null if none', () => {
    expect(pickVoice([{ identifier: 'en-gb', language: 'en-GB' }], 'en')).toBe('en-gb');
    expect(pickVoice([{ identifier: 'fr', language: 'fr-FR' }], 'es')).toBeNull();
    expect(pickVoice([], 'en')).toBeNull();
  });

  it('reads the answer without markdown marks, links or bullets', () => {
    expect(plainSpeech('**Hola** _Nico_, mira [esto](https://x.com).\n\n- Pierna\n- Core\n\n## Plan')).toBe(
      'Hola Nico, mira esto. Pierna. Core. Plan',
    );
    expect(plainSpeech('Listo 💪 `ok`')).toBe('Listo ok');
  });
});
