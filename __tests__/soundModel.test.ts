import {
  pointFile,
  resultCountSteps,
  SOUND_FILES,
  soundFile,
  soundHaptic,
  tickFile,
} from '../src/features/sound/soundModel';
import { DEFAULT_FEEDBACK_PREFS, parseFeedbackPrefs } from '../src/lib/feedbackPrefs';

describe('Sonidos · eventos (handoff 25.7–25.8)', () => {
  it('countdown: calm tick 15–6, urgent rising 5–2, final at 1', () => {
    expect(tickFile(15)).toBe('tick');
    expect(tickFile(6)).toBe('tick');
    expect(tickFile(5)).toBe('tick-urgent-5');
    expect(tickFile(4)).toBe('tick-urgent-4');
    expect(tickFile(3)).toBe('tick-urgent-3');
    expect(tickFile(2)).toBe('tick-urgent-2');
    expect(tickFile(1)).toBe('tick-final');
    expect(tickFile(0)).toBeNull();
  });

  it('answers: brighter from 3 in a row; a miss sounds "wrong"', () => {
    expect(soundFile({ type: 'correct', streak: 2 })).toBe('correct');
    expect(soundFile({ type: 'correct', streak: 3 })).toBe('correct-streak');
    expect(soundFile({ type: 'wrong' })).toBe('wrong');
  });

  it('points climb the 8-note scale with the counter', () => {
    expect(pointFile(0, 12)).toBe('point-0');
    expect(pointFile(10, 12)).toBe('point-6');
    expect(pointFile(1, 2)).toBe('point-7');
    expect(pointFile(0, 1)).toBe('point-0');
  });

  it('every event resolves to a rendered file', () => {
    const files = [
      soundFile({ type: 'impact' }),
      soundFile({ type: 'complete', tier: 'low' }),
      soundFile({ type: 'complete', tier: 'mid' }),
      soundFile({ type: 'complete', tier: 'perfect' }),
      soundFile({ type: 'day-close' }),
      ...[15, 5, 4, 3, 2, 1].map(s => soundFile({ type: 'tick', secondsLeft: s })),
    ];
    files.forEach(file => expect(SOUND_FILES).toContain(file));
  });

  it('keeps the haptics the Quiz already had', () => {
    expect(soundHaptic({ type: 'correct', streak: 0 })).toBe('light');
    expect(soundHaptic({ type: 'wrong' })).toBe('error');
    expect(soundHaptic({ type: 'tick', secondsLeft: 3 })).toBeNull();
    expect(soundHaptic({ type: 'impact' })).toBeNull();
  });

  it('result counter: up to 12 steps of 75 ms from 700 ms, ending on the total', () => {
    expect(resultCountSteps(0)).toEqual([]);
    const small = resultCountSteps(30);
    expect(small.map(s => s.value)).toEqual([10, 20, 30]);
    expect(small.map(s => s.at)).toEqual([700, 775, 850]);
    const big = resultCountSteps(325);
    expect(big).toHaveLength(12);
    expect(big[11]).toEqual({ at: 700 + 11 * 75, value: 325, last: true });
    expect(big.filter(s => s.last)).toHaveLength(1);
  });
});

describe('Ajustes · Sonidos y vibración', () => {
  it('defaults to on and survives bad data', () => {
    expect(parseFeedbackPrefs(null)).toEqual(DEFAULT_FEEDBACK_PREFS);
    expect(parseFeedbackPrefs('nope')).toEqual(DEFAULT_FEEDBACK_PREFS);
    expect(parseFeedbackPrefs('{"sound":false}')).toEqual({ sound: false, vibration: true });
    expect(parseFeedbackPrefs('{"sound":true,"vibration":false}')).toEqual({
      sound: true,
      vibration: false,
    });
  });
});
