import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { GLASS_ML, toGlasses, waterGoalGlasses } from '@app/features/nutrition/nutritionModel';
import { hydrationCue } from '@app/features/sound/soundModel';
import { playCue, useSoundPreload } from '@app/features/sound/soundService';
import { useAuth } from '@app/hooks/useAuth';
import { addHydrationAmount } from '@app/services/supabase/fitness';

// +1 vaso with an immediate answer: the water of today is raised in every
// cache that shows it (Nutrición, Inicio) before the write returns, and put
// back if it fails. Writes are chained so quick taps never overwrite each
// other (the service reads, adds and writes). `hydration_logged` is sent by
// addHydrationAmount on every call: not duplicated here. Each glass sounds at
// once (§28.7): hydration-glass-n rising with the glass of the day, and
// hydration-goal on the glass that reaches the goal.
export function useHydration() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const queryClient = useQueryClient();
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  // Writes in flight: caches are refetched only when the last one lands, so
  // the count never drops while quick taps are still being saved.
  const pending = useRef(0);
  useSoundPreload(['hydration-glass', 'hydration-goal']);

  // Today's water as the screens show it (Nutrición's query, else Inicio's).
  const todayMl = useCallback((): number | null => {
    const nutrition = queryClient.getQueryData<number>(['nutrition', 'hydration', userId]);
    if (typeof nutrition === 'number') {
      return nutrition;
    }
    const home = queryClient.getQueryData<{ hydration?: { todayMl?: number } }>([
      'home',
      'overview',
      userId,
    ]);
    return typeof home?.hydration?.todayMl === 'number' ? home.hydration.todayMl : null;
  }, [queryClient, userId]);

  const bump = useCallback(
    (deltaMl: number) => {
      queryClient.setQueryData<number>(['nutrition', 'hydration', userId], ml =>
        ml === undefined ? ml : Math.max(0, ml + deltaMl),
      );
      queryClient.setQueryData(['home', 'overview', userId], (current: any) => {
        if (!current?.hydration) {
          return current;
        }
        const todayMl = Math.max(0, current.hydration.todayMl + deltaMl);
        return {
          ...current,
          hydration: {
            ...current.hydration,
            todayMl,
            todayGlasses: toGlasses(todayMl),
            todayPercentage:
              current.hydration.goalMl > 0
                ? Math.min(
                    100,
                    Math.round((todayMl / current.hydration.goalMl) * 100),
                  )
                : 0,
          },
        };
      });
    },
    [queryClient, userId],
  );

  // Returns the glasses of today after this one and the goal (null when the
  // screens have not read today's water yet).
  const addGlass = useCallback(
    (onError?: () => void): { glasses: number | null; goal: number | null } | null => {
      if (!userId) {
        return null;
      }
      const before = todayMl();
      const goal = waterGoalGlasses(profile?.dailyWaterGoal);
      const glasses = before !== null ? toGlasses(before + GLASS_ML) : null;
      if (glasses !== null) {
        playCue(hydrationCue(glasses, goal));
      }
      bump(GLASS_ML);
      pending.current += 1;
      const write = chain.current
        .catch(() => undefined)
        .then(() => addHydrationAmount({ userId, amountMl: GLASS_ML }));
      chain.current = write;
      write
        .then(() => {
          pending.current -= 1;
          if (pending.current > 0) {
            return undefined;
          }
          return Promise.allSettled(
            [
              ['nutrition', 'hydration', userId],
              ['home', 'overview', userId],
              // Notifications and ELLIE read hydration from the ELLIE overview.
              ['ellie', 'overview', userId],
              ['profile', 'overview', userId],
              ['progress', 'overview', userId],
              ['progress', 'badges', userId],
            ].map(queryKey => queryClient.invalidateQueries({ queryKey })),
          );
        })
        .catch(() => {
          pending.current = Math.max(0, pending.current - 1);
          bump(-GLASS_ML);
          onError?.();
        });
      return { glasses, goal };
    },
    [bump, profile?.dailyWaterGoal, queryClient, todayMl, userId],
  );

  return { addGlass };
}
