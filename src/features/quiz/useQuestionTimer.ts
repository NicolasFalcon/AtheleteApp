import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { QUESTION_MS, secondsLeft } from '@app/features/quiz/quizModel';

const STEP_MS = 100;

// Quiz · Ronda: 15 s per question. Restarts when `questionKey` changes and
// only runs while `running` (question shown, not answered, no sheet open);
// time in the background does not count. `onSecond` fires once per new whole
// second (14 … 1, as in the prototype) and `onExpire` once at 0.
export function useQuestionTimer({
  questionKey,
  running,
  onSecond,
  onExpire,
}: {
  questionKey: string | number;
  running: boolean;
  onSecond: (secondsLeft: number) => void;
  onExpire: () => void;
}): number {
  const [remaining, setRemaining] = useState(QUESTION_MS);
  const remainingRef = useRef(QUESTION_MS);
  const lastSecondRef = useRef(secondsLeft(QUESTION_MS));
  const callbacks = useRef({ onSecond, onExpire });
  callbacks.current = { onSecond, onExpire };

  useEffect(() => {
    remainingRef.current = QUESTION_MS;
    lastSecondRef.current = secondsLeft(QUESTION_MS);
    setRemaining(QUESTION_MS);
  }, [questionKey]);

  useEffect(() => {
    if (!running || remainingRef.current <= 0) {
      return;
    }
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = AppState.currentState === 'active' ? now - last : 0;
      last = now;
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

  return remaining;
}
