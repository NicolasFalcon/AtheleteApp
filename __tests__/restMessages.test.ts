import {
  EMPTY_HISTORY,
  markShown,
  pickRestMessage,
  type RestMessageContext,
} from '../src/features/session/restMessages';

const base: RestMessageContext = {
  mode: 'todos',
  restSec: 60,
  restIndex: 0,
  restKind: 'set',
  doneCount: 0,
  total: 6,
  record: null,
  discomfortZone: null,
  checkInExercise: { id: 'squat', name: 'Sentadilla' },
};

describe('rest messages (§28.13)', () => {
  it('never shows in short rests or with "Ninguno"', () => {
    expect(pickRestMessage({ ...base, restSec: 25 }, EMPTY_HISTORY)).toBeNull();
    expect(pickRestMessage({ ...base, mode: 'ninguno' }, EMPTY_HISTORY)).toBeNull();
  });

  it('follows the priority and shows each type once', () => {
    const ctx = { ...base, record: { exerciseName: 'Press de banca', weightKg: 16 }, discomfortZone: 'rodilla' as const };
    expect(pickRestMessage(ctx, EMPTY_HISTORY)).toBe('record');
    const after = markShown(EMPTY_HISTORY, 'record', 0);
    expect(pickRestMessage({ ...ctx, restIndex: 2 }, after)).toBe('discomfortFollowUp');
  });

  it('skips the rest right after one with a message', () => {
    const history = markShown(EMPTY_HISTORY, 'checkIn', 3);
    expect(pickRestMessage({ ...base, restIndex: 4, doneCount: 3 }, history)).toBeNull();
    expect(pickRestMessage({ ...base, restIndex: 5, doneCount: 3 }, history)).toBe('water');
  });

  it('stops at 4 per session', () => {
    let history = EMPTY_HISTORY;
    (['checkIn', 'water', 'halfway', 'record'] as const).forEach((kind, i) => {
      history = markShown(history, kind, i * 2);
    });
    expect(pickRestMessage({ ...base, restIndex: 20, restKind: 'exercise', doneCount: 5 }, history)).toBeNull();
  });

  it('"Solo esenciales" keeps records and discomforts only', () => {
    const ctx = { ...base, mode: 'esenciales' as const, doneCount: 3 };
    expect(pickRestMessage(ctx, EMPTY_HISTORY)).toBeNull();
    expect(pickRestMessage({ ...ctx, discomfortZone: 'codo' }, EMPTY_HISTORY)).toBe('discomfortFollowUp');
  });

  it('motivation goes between exercises: halfway, then the last one', () => {
    const done = markShown(markShown(EMPTY_HISTORY, 'checkIn', 0), 'water', 2);
    const between = { ...base, restKind: 'exercise' as const };
    expect(pickRestMessage({ ...between, restIndex: 4, doneCount: 3 }, done)).toBe('halfway');
    const later = markShown(done, 'halfway', 4);
    expect(pickRestMessage({ ...between, restIndex: 6, doneCount: 5 }, later)).toBe('lastExercise');
  });
});
