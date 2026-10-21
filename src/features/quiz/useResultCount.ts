import { useEffect, useState } from 'react';
import type { ResultTier } from '@app/features/quiz/quizModel';
import { playSound } from '@app/features/sound/soundService';
import { RESULT_COUNT, resultCountSteps } from '@app/features/sound/soundModel';

// Quiz · resultado (§25.7): "complete" for the tier, then the points count up
// in up to 12 steps of 75 ms, a "point" each and "impact" on the final figure.
// Returns the figure while counting and null once done (the screen then shows
// its own value). Runs once per mount.
export function useResultCount(points: number, tier: ResultTier): number | null {
  const [count, setCount] = useState<number | null>(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, run: () => void) => timers.push(setTimeout(run, ms));
    const steps = resultCountSteps(points);

    at(RESULT_COUNT.completeAt, () => playSound({ type: 'complete', tier }));
    steps.forEach((step, index) =>
      at(step.at, () => {
        setCount(step.value);
        playSound(
          step.last ? { type: 'impact' } : { type: 'point', index, steps: steps.length },
        );
      }),
    );
    const end = steps.length
      ? steps[steps.length - 1].at + RESULT_COUNT.stepMs
      : RESULT_COUNT.firstStepAt - 50;
    at(end, () => setCount(null));

    return () => timers.forEach(clearTimeout);
    // Once per result screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return count;
}
