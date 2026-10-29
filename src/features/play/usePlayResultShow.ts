import { useEffect, useState } from 'react';
import {
  RESULT_COUNT,
  celebrationSound,
  chainGapMs,
  pointsCue,
  resultCountSteps,
  resultSequence,
} from '@app/features/sound/soundModel';
import { playCue, playSound, useSoundPreload } from '@app/features/sound/soundService';
import type { PlayResult } from '@app/services/supabase/play';

const RESULT_SOUNDS = [
  'play-points',
  'play-level-complete',
  'play-level-up',
  'play-record',
  'play-unlock',
] as const;

// How long the celebration stays before it closes itself (§28.6.1: ~2,9 s).
export const CELEBRATION_MS = 2900;

// Play · resultado (Quiz.dc.html · celebrate), started when the server's
// answer arrives: the celebration (level up / unlock / record, with its
// sound at 260 ms) for 2.9 s, then the round's points count up (a
// play-points every 2 steps) and the chain of level complete / record /
// unlock. Returns the figure while counting (null once done) and whether the
// celebration is open. Runs once per result.
export function usePlayResultShow(result: PlayResult | null): {
  count: number | null;
  celebrating: boolean;
  closeCelebration: () => void;
} {
  const [count, setCount] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  useSoundPreload(RESULT_SOUNDS);

  useEffect(() => {
    if (!result) {
      return undefined;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, run: () => void) => timers.push(setTimeout(run, ms));
    const flags = {
      score: result.score,
      unlocked: Boolean(result.unlocked || result.routeCompleted),
      levelUp: result.player.levelAfter > result.player.levelBefore,
      record: result.bestScore.newRecord,
    };
    const big = result.celebration !== null;
    let base = 0;
    if (big) {
      setCelebrating(true);
      const sound = celebrationSound(flags);
      if (sound) {
        at(260, () => playSound(sound));
      }
      at(CELEBRATION_MS, () => setCelebrating(false));
      base = CELEBRATION_MS - RESULT_COUNT.firstStepAt + 560;
    }

    const steps = resultCountSteps(result.roundPoints);
    setCount(steps.length ? 0 : null);
    steps.forEach((step, index) =>
      at(base + step.at, () => {
        setCount(step.value);
        playCue(pointsCue(index));
      }),
    );
    const end = base + (steps.length ? steps[steps.length - 1].at + RESULT_COUNT.stepMs : RESULT_COUNT.firstStepAt - 50);
    at(end, () => setCount(null));
    let delay = end + 120;
    resultSequence(flags).forEach(id => {
      at(delay, () => playSound(id));
      delay += chainGapMs(id);
    });

    return () => timers.forEach(clearTimeout);
  }, [result]);

  return { count, celebrating, closeCelebration: () => setCelebrating(false) };
}
