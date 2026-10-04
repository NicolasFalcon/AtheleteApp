import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/components/v2';
import { flipHabit } from '@app/features/core33/core33Model';
import { useAuth } from '@app/hooks/useAuth';
import { useCore33 } from '@app/hooks/useCore33';
import { invalidateCore33Queries } from '@app/lib/queryInvalidation';
import { toggleCore33Habit } from '@app/services/supabase/core33';
import { dateKeyInZone } from '@app/shared/domain/core33';

// Marking and un-marking the habits of today. The tap shows at once; writes
// are chained so the day is detected as closed exactly once (the service
// compares the logs before and after each tap), and a failed write puts the
// habit back with a toast.
export function useCore33Day(options: { onChallengeCompleted?: () => void } = {}) {
  const { profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { stateQuery } = useCore33();
  const state = stateQuery.data;
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const logsRef = useRef<Record<string, boolean[]>>({});
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  const onCompleted = useRef(options.onChallengeCompleted);
  onCompleted.current = options.onChallengeCompleted;

  // The server's logs are the truth whenever no write is in flight.
  useEffect(() => {
    if (state && pending.current === 0) {
      logsRef.current = state.habitLogs;
    }
  }, [state]);

  const toggle = useCallback(
    (index: number) => {
      const challenge = state?.challenge;
      if (!profile?.id || !challenge || challenge.status !== 'active') {
        return;
      }
      const date = dateKeyInZone(new Date());
      const total = challenge.totalHabits || 3;
      const before = { ...logsRef.current };
      const dayBefore = flipHabit(before[date], index, total);
      const previous = !dayBefore[index];
      logsRef.current = { ...before, [date]: dayBefore };
      setOverrides(current => ({ ...current, [index]: dayBefore[index] }));
      pending.current += 1;

      const settle = async () => {
        pending.current -= 1;
        if (pending.current === 0) {
          await invalidateCore33Queries(queryClient, profile.id).catch(() => {});
          setOverrides({});
        }
      };

      chain.current = chain.current
        .catch(() => undefined)
        .then(() =>
          toggleCore33Habit({
            userId: profile.id,
            challenge,
            habitLogs: before,
            date,
            habitIndex: index,
          }),
        )
        .then(result => {
          if (result.challengeCompleted) {
            onCompleted.current?.();
          }
          return settle();
        })
        .catch(async error => {
          console.warn('[core33] No se pudo guardar el hábito:', error);
          const day = [...(logsRef.current[date] ?? [])];
          day[index] = previous;
          logsRef.current = { ...logsRef.current, [date]: day };
          setOverrides(current => ({ ...current, [index]: previous }));
          toast.show('No pudimos guardar el hábito', { tone: 'error' });
          await settle();
        });
    },
    [profile?.id, queryClient, state?.challenge, toast],
  );

  return {
    stateQuery,
    state,
    overrides,
    toggle,
  };
}
