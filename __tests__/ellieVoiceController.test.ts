import type { AudioSession } from '../src/features/ellie/voice/audioSession';
import type {
  RecognitionAccess,
  RecognitionHandlers,
  SpeechListener,
} from '../src/features/ellie/voice/recognizer';
import type { Speaker } from '../src/features/ellie/voice/speaker';
import { NO_SPEECH_MS, SILENCE_MS, VoiceController } from '../src/features/ellie/voice/voiceController';
import type { VoiceState } from '../src/features/ellie/voice/voiceMachine';
import { EllieError } from '../src/services/ellie/ellieService';

const flush = async () => {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
};

function setup(options: { access?: RecognitionAccess; ask?: jest.Mock } = {}) {
  const log: string[] = [];
  let handlers: RecognitionHandlers | null = null;
  let access: RecognitionAccess = options.access ?? { granted: true, canAskAgain: true, undetermined: false };
  const listener: SpeechListener = {
    getAccess: async () => access,
    requestAccess: async () => {
      access = { granted: true, canAskAgain: true, undetermined: false };
      return access;
    },
    start: (language, h) => {
      log.push(`listen:${language}`);
      handlers = h;
    },
    stop: () => log.push('recognizer.stop'),
    abort: () => log.push('recognizer.abort'),
  };
  let finishSpeech: (() => void) | null = null;
  const speaker: Speaker = {
    speak: (text, language) => {
      log.push(`speak:${language}:${text}`);
      return new Promise<void>(resolve => {
        finishSpeech = resolve;
      });
    },
    stop: () => {
      log.push('speaker.stop');
      finishSpeech?.();
    },
  };
  const audio: AudioSession = {
    duckForSpeech: () => log.push('duck'),
    release: () => log.push('release'),
  };
  const ask = options.ask ?? jest.fn(async () => ({ text: 'Hoy toca pierna.', hasPlan: false }));
  const states: VoiceState[] = [];
  let language: 'es' | 'en' = 'es';
  const controller = new VoiceController({
    listener,
    speaker,
    audio,
    ask,
    language: () => language,
    onState: state => states.push(state),
  });
  return {
    controller,
    log,
    ask,
    states,
    handlers: () => handlers!,
    finishSpeech: () => finishSpeech?.(),
    setLanguage: (value: 'es' | 'en') => {
      language = value;
    },
    setAccess: (value: RecognitionAccess) => {
      access = value;
    },
  };
}

describe('VoiceController', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('listens, sends the sentence as a message, speaks the answer ducking the music, and gives it back', async () => {
    const t = setup();
    await t.controller.tap();
    expect(t.controller.getState().phase).toBe('listening');
    t.handlers().onPartial('qué entreno');
    t.handlers().onPartial('qué entreno hoy');
    t.handlers().onFinal('qué entreno hoy');
    await flush();
    expect(t.ask).toHaveBeenCalledTimes(1);
    expect(t.ask).toHaveBeenCalledWith('qué entreno hoy');
    expect(t.controller.getState().phase).toBe('speaking');
    expect(t.log).toContain('speak:es:Hoy toca pierna.');
    expect(t.log.indexOf('duck')).toBeLessThan(t.log.indexOf('speak:es:Hoy toca pierna.'));
    t.finishSpeech();
    await flush();
    expect(t.controller.getState().phase).toBe('idle');
    // the audio was released after listening and after speaking
    expect(t.log.filter(entry => entry === 'release').length).toBeGreaterThanOrEqual(2);
    expect(t.log[t.log.length - 1]).toBe('release');
  });

  it('listens in the language of the profile', async () => {
    const t = setup();
    t.setLanguage('en');
    await t.controller.tap();
    expect(t.log).toContain('listen:en');
  });

  it('the end of the sentence is a silence: it asks the recognizer to finish', async () => {
    const t = setup();
    await t.controller.tap();
    t.handlers().onPartial('hola');
    jest.advanceTimersByTime(SILENCE_MS - 100);
    expect(t.log).not.toContain('recognizer.stop');
    t.handlers().onPartial('hola ELLIE'); // still talking: the wait restarts
    jest.advanceTimersByTime(SILENCE_MS - 100);
    expect(t.log).not.toContain('recognizer.stop');
    jest.advanceTimersByTime(200);
    expect(t.log).toContain('recognizer.stop');
  });

  it('nobody speaks: back to rest after a while', async () => {
    const t = setup();
    await t.controller.tap();
    jest.advanceTimersByTime(NO_SPEECH_MS + 10);
    expect(t.controller.getState().phase).toBe('idle');
    expect(t.log).toContain('recognizer.abort');
    expect(t.ask).not.toHaveBeenCalled();
  });

  it('tapping while listening sends what there is, once even if the recognizer also reports the end', async () => {
    const t = setup();
    await t.controller.tap();
    t.handlers().onPartial('hola');
    await t.controller.tap();
    t.handlers().onFinal('hola');
    t.handlers().onEnd();
    await flush();
    expect(t.ask).toHaveBeenCalledTimes(1);
  });

  it('tapping while she speaks interrupts at once and releases the audio', async () => {
    const t = setup();
    await t.controller.tap();
    t.handlers().onFinal('hola');
    await flush();
    expect(t.controller.getState().phase).toBe('speaking');
    await t.controller.tap();
    await flush();
    expect(t.log).toContain('speaker.stop');
    expect(t.controller.getState().phase).toBe('idle');
    expect(t.log[t.log.length - 1]).toBe('release');
  });

  it('cancelling while she thinks ignores the late answer', async () => {
    let resolveAsk: (value: { text: string; hasPlan: boolean }) => void = () => undefined;
    const ask = jest.fn(() => new Promise<{ text: string; hasPlan: boolean }>(resolve => (resolveAsk = resolve)));
    const t = setup({ ask });
    await t.controller.tap();
    t.handlers().onFinal('hola');
    await flush();
    expect(t.controller.getState().phase).toBe('thinking');
    await t.controller.tap();
    resolveAsk({ text: 'tarde', hasPlan: false });
    await flush();
    expect(t.controller.getState().phase).toBe('idle');
    expect(t.log.some(entry => entry.startsWith('speak:'))).toBe(false);
  });

  it('an error of ellie-chat is the error state with its code; the daily limit says so', async () => {
    const ask = jest.fn(async () => {
      throw new EllieError('daily_limit', { used: 40, limit: 40 });
    });
    const t = setup({ ask });
    await t.controller.tap();
    t.handlers().onFinal('hola');
    await flush();
    expect(t.controller.getState()).toMatchObject({
      phase: 'error',
      error: { kind: 'reply', failure: { code: 'daily_limit', used: 40, limit: 40 } },
    });
  });

  it('explains the permission first, then asks, then listens', async () => {
    const t = setup({ access: { granted: false, canAskAgain: true, undetermined: true } });
    await t.controller.tap();
    expect(t.controller.getState()).toMatchObject({ phase: 'idle', rationale: true });
    expect(t.log.some(entry => entry.startsWith('listen:'))).toBe(false);
    await t.controller.confirmPermission();
    expect(t.controller.getState().phase).toBe('listening');
  });

  it('a refused permission is an error that sends to Ajustes', async () => {
    const t = setup({ access: { granted: false, canAskAgain: false, undetermined: false } });
    await t.controller.tap();
    expect(t.controller.getState()).toMatchObject({ phase: 'error', error: { kind: 'permission' } });
  });

  it('a recognizer failure is an error; the next tap tries again', async () => {
    const t = setup();
    await t.controller.tap();
    t.handlers().onError('audio-capture');
    expect(t.controller.getState()).toMatchObject({ phase: 'error', error: { kind: 'recognition' } });
    await t.controller.tap();
    expect(t.controller.getState().phase).toBe('listening');
  });

  it('leaving the screen stops everything', async () => {
    const t = setup();
    await t.controller.tap();
    t.controller.destroy();
    expect(t.log).toEqual(expect.arrayContaining(['recognizer.abort', 'speaker.stop', 'release']));
    t.handlers().onFinal('tarde');
    await flush();
    expect(t.ask).not.toHaveBeenCalled();
  });
});
