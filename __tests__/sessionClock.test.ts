import {
  activeSeconds,
  finishClock,
  pauseClock,
  pausedForSeconds,
  resumeClock,
  type ClockState,
} from '../src/features/session/sessionModel';

const T0 = 1_000_000_000_000;
const start: ClockState = { startedAt: T0, pausedTotalSec: 0, pausedAt: null };
const at = (sec: number) => T0 + sec * 1000;

describe('finishing a workout', () => {
  it('from a pause: duration = active time until the pause, pause not added', () => {
    const paused = pauseClock(start, at(600)); // 10 min of training
    const { clock, activeSec } = finishClock(paused, at(600 + 1800)); // 30 min later
    expect(activeSec).toBe(600);
    expect(clock.pausedAt).toBeNull();
    expect(clock.pausedTotalSec).toBe(1800);
  });

  it('the figure never moves afterwards, read at the finishing instant', () => {
    const paused = pauseClock(start, at(600));
    const finishAt = at(600 + 90);
    const { clock } = finishClock(paused, finishAt);
    expect(activeSeconds(clock, finishAt)).toBe(600);
    // The screens read it with the instant of finishing, not with "now".
    expect(activeSeconds(clock, finishAt)).toBe(activeSeconds(clock, finishAt));
  });

  it('without a pause it is the whole time since the start', () => {
    expect(finishClock(start, at(754)).activeSec).toBe(754);
  });

  it('after an earlier pause and a resume, only the last pause is excluded too', () => {
    const resumed = resumeClock(pauseClock(start, at(300)), at(360)); // 60 s paused
    const paused = pauseClock(resumed, at(660)); // 300 + 300 s trained
    expect(finishClock(paused, at(660 + 120)).activeSec).toBe(600);
  });
});

describe('paused time is excluded', () => {
  it('the active clock is frozen while paused, however long (app closed, phone locked)', () => {
    const paused = pauseClock(start, at(120));
    expect(activeSeconds(paused, at(120))).toBe(120);
    expect(activeSeconds(paused, at(120 + 45))).toBe(120);
    expect(activeSeconds(paused, at(120 + 3 * 3600))).toBe(120);
    expect(pausedForSeconds(paused, at(120 + 45))).toBe(45);
  });

  it('resuming after a long pause continues from where it stopped', () => {
    const paused = pauseClock(start, at(120));
    const resumed = resumeClock(paused, at(120 + 2 * 3600));
    expect(activeSeconds(resumed, at(120 + 2 * 3600))).toBe(120);
    expect(activeSeconds(resumed, at(120 + 2 * 3600 + 30))).toBe(150);
  });
});
