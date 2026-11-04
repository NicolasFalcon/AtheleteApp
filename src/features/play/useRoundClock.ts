import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { BACKGROUND_LIMIT_MS, QUESTION_MS, secondsLeft } from '@app/features/play/playModel';

const STEP_MS = 100;

// Play · ronda: the question time of the round (seconds_per_question). Restarts when `questionKey` changes and
// only runs while `running`; time in the background does not count (the
// clock restarts from where it was). `onSecond` fires once per new whole
// second and `onExpire` once at 0. Returns the remaining ms and a getter of
// the elapsed ms for the answer.
export function useQuestionTimer({
  questionKey,
  running,
  durationMs = QUESTION_MS,
  onSecond,
  onExpire,
}: {
  questionKey: string | number;
  running: boolean;
  durationMs?: number;
  onSecond: (secondsLeft: number) => void;
  onExpire: () => void;
}): { remainingMs: number; elapsedMs: () => number } {
  const [remaining, setRemaining] = useState(durationMs);
  const remainingRef = useRef(durationMs);
  const lastSecondRef = useRef(secondsLeft(durationMs));
  const lastTickRef = useRef(Date.now());
  const callbacks = useRef({ onSecond, onExpire });
  callbacks.current = { onSecond, onExpire };

  useEffect(() => {
    remainingRef.current = durationMs;
    lastSecondRef.current = secondsLeft(durationMs);
    setRemaining(durationMs);
  }, [durationMs, questionKey]);

  // Coming back from the background continues from the same point.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        lastTickRef.current = Date.now();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!running || remainingRef.current <= 0) {
      return undefined;
    }
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = AppState.currentState === 'active' ? now - lastTickRef.current : 0;
      lastTickRef.current = now;
      if (!elapsed) {
        return;
      }
      const next = Math.max(0, remainingRef.current - elapsed);
      remainingRef.current = next;
      setRemaining(next);
      const second = secondsLeft(next);
      if (next > 0 && second !== lastSecondRef.current) {
        lastSecondRef.current = second;
        callbacks.current.onSecond(second);
      }
      if (next === 0) {
        clearInterval(id);
        callbacks.current.onExpire();
      }
    }, STEP_MS);
    return () => clearInterval(id);
  }, [running, questionKey]);

  return {
    remainingMs: remaining,
    elapsedMs: () => durationMs - remainingRef.current,
  };
}

// More than 120 s in the background drops the round (§28.6.1 · PLAY_SHAPES
// §0): `onDrop` runs when the app comes back. Shorter absences continue.
export function useBackgroundLimit(onDrop: () => void, enabled = true): void {
  const callback = useRef(onDrop);
  callback.current = onDrop;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let awayAt: number | null = null;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        if (awayAt !== null && Date.now() - awayAt > BACKGROUND_LIMIT_MS) {
          callback.current();
        }
        awayAt = null;
      } else if (awayAt === null) {
        awayAt = Date.now();
      }
    });
    return () => subscription.remove();
  }, [enabled]);
}
