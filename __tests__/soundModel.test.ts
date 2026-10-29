import {
  SOUND_EVENTS,
  SOUND_EVENT_IDS,
  SOUND_FILES,
  allowed,
  answerCue,
  eventFile,
  hydrationCue,
  playTickCue,
  pointsCue,
  restCue,
  resultCountSteps,
  resultSequence,
} from '../src/features/sound/soundModel';
import { DEFAULT_FEEDBACK_PREFS, parseFeedbackPrefs } from '../src/lib/feedbackPrefs';

describe('Sonido v2.18 · tabla de eventos (§28.7)', () => {
  it('every event of the table resolves to a bundled file', () => {
    SOUND_EVENT_IDS.forEach(id => {
      const event = SOUND_EVENTS[id];
      expect(event).toBeDefined();
      event.files.forEach(item => expect(SOUND_FILES).toContain(item.file));
    });
  });

  it('allowed: Todo, Solo logros (medio y grande), Silencio and the session switch', () => {
    expect(allowed(SOUND_EVENTS['play-tick'], 'todo', true)).toBe(true);
    expect(allowed(SOUND_EVENTS['play-tick'], 'logros', true)).toBe(false);
    expect(allowed(SOUND_EVENTS['play-wrong'], 'logros', true)).toBe(false);
    expect(allowed(SOUND_EVENTS['pr'], 'logros', true)).toBe(true);
    expect(allowed(SOUND_EVENTS['pr'], 'silencio', true)).toBe(false);
    expect(allowed(SOUND_EVENTS['rest-go'], 'todo', false)).toBe(false);
    expect(allowed(SOUND_EVENTS['set-complete'], 'todo', true)).toBe(false);
  });

  it('Play: correct with streak 0–1, combo N = streak − 1 (max 5)', () => {
    expect(answerCue(true, 1)).toEqual({ id: 'play-correct' });
    expect(answerCue(true, 2)).toEqual({ id: 'play-combo', variant: 1 });
    expect(answerCue(true, 9)).toEqual({ id: 'play-combo', variant: 5 });
    expect(answerCue(false, 0)).toEqual({ id: 'play-wrong' });
    expect(playTickCue(6)).toBeNull();
    expect(playTickCue(5)).toEqual({ id: 'play-tick' });
  });

  it('Play: points every 2 steps, notes 1·2·3; result chain', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(pointsCue).map(c => c?.variant ?? null)).toEqual([
      1, null, 2, null, 3, null, 1,
    ]);
    const flags = { unlocked: false, levelUp: false, record: false };
    expect(resultSequence({ ...flags, score: 8 })).toEqual(['play-level-complete']);
    expect(resultSequence({ ...flags, score: 10, record: true, levelUp: true })).toEqual([
      'play-record',
      'play-unlock',
    ]);
    expect(resultSequence({ ...flags, score: 5 })).toEqual([]);
  });

  it('hydration: glass n, goal on the glass that reaches it, last file above', () => {
    expect(hydrationCue(3, 8)).toEqual({ id: 'hydration-glass', variant: 3 });
    expect(hydrationCue(8, 8)).toEqual({ id: 'hydration-goal' });
    expect(hydrationCue(10, 8)).toEqual({ id: 'hydration-glass', variant: 8 });
    expect(eventFile(SOUND_EVENTS['hydration-glass'], 12).file).toBe('hydration-glass-8');
  });

  it('rest: warn at 10, tick at 5–4–3–2, strong at 1', () => {
    expect(restCue(11, 10)).toEqual({ id: 'rest-warn' });
    expect(restCue(6, 5)).toEqual({ id: 'rest-tick' });
    expect(restCue(5, 4)).toEqual({ id: 'rest-tick' });
    expect(restCue(4, 3)).toEqual({ id: 'rest-tick' });
    expect(restCue(3, 2)).toEqual({ id: 'rest-tick' });
    expect(restCue(2, 1)).toEqual({ id: 'rest-tick-strong' });
    expect(restCue(7, 6)).toBeNull();
  });

  it('result counter: up to 12 steps of 75 ms from 700 ms, ending on the total', () => {
    expect(resultCountSteps(0)).toEqual([]);
    expect(resultCountSteps(30).map(s => s.value)).toEqual([10, 20, 30]);
    expect(resultCountSteps(325)).toHaveLength(12);
  });
});

describe('Ajustes · Sonido y Vibración', () => {
  it('defaults to Todo and migrates the old on/off switch', () => {
    expect(parseFeedbackPrefs(null)).toEqual(DEFAULT_FEEDBACK_PREFS);
    expect(parseFeedbackPrefs('nope')).toEqual(DEFAULT_FEEDBACK_PREFS);
    expect(parseFeedbackPrefs('{"sound":false}').soundMode).toBe('silencio');
    expect(parseFeedbackPrefs('{"soundMode":"logros","vibration":false}')).toEqual({
      soundMode: 'logros',
      sessionSound: true,
      vibration: false,
      sessionMessages: 'todos',
    });
  });
});
