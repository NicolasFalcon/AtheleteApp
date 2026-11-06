import { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Check } from 'lucide-react-native';
import {
  Button,
  haptics,
  PressableScale,
  Sheet,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import {
  addedLine,
  addToWeekError,
  addToWeekText,
  weekdayLabel,
  weekdayName,
} from '@app/features/week/addToWeekCopy';
import { addDays, weekStartOf, type WeekDay } from '@app/features/week/weekModel';
import { invalidateWeek, useWeekPlan } from '@app/hooks/useWeekPlan';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { createUuid } from '@app/lib/uuid';
import { planRoutineForDay, ProposalError } from '@app/services/ellie/ellieProposals';
import type { AppStackParamList } from '@app/types/navigation';

// "Agregar a semana": the current week and the next one; past days are
// disabled and the days that have a routine show its name. Picking a day calls
// plan_routine_for_day with a new client id (a library routine sends
// p_routine_id, an open proposal p_proposal_id). A day that already has a
// routine asks before replacing it.
export type AddToWeekTarget = {
  name: string;
  routineId?: string | null;
  proposalId?: string | null;
};

export function useAddToWeek() {
  const [target, setTarget] = useState<AddToWeekTarget | null>(null);
  // The sheet keeps its target while it closes (no blank frame).
  const last = useRef<AddToWeekTarget | null>(null);
  if (target) {
    last.current = target;
  }
  return {
    open: (next: AddToWeekTarget) => setTarget(next),
    sheet: (
      <AddToWeekSheet open={target !== null} target={target ?? last.current} onClose={() => setTarget(null)} />
    ),
  };
}

export function AddToWeekSheet({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: AddToWeekTarget | null;
  onClose: () => void;
}) {
  const { colors } = useThemeV2();
  const language = useProfileLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const current = useWeekPlan(open);
  const nextStart = current.data ? addDays(current.data.weekStart, 7) : null;
  const next = useWeekPlan(open && nextStart !== null, nextStart);
  const [busyDate, setBusyDate] = useState<string | null>(null);

  const today = current.data?.today ?? '';
  const weeks = useMemo(
    () => [
      { key: 'this', title: addToWeekText(language, 'addToWeek.thisWeek'), days: current.data?.days ?? [] },
      { key: 'next', title: addToWeekText(language, 'addToWeek.nextWeek'), days: next.data?.days ?? [] },
    ],
    [current.data, language, next.data],
  );
  const known = useMemo(() => {
    const names: Record<string, string> = {};
    weeks.forEach(week =>
      week.days.forEach(day => {
        if (day.routine) {
          names[day.date] = day.routine.title;
        }
      }),
    );
    return names;
  }, [weeks]);

  const done = (date: string) => {
    haptics.success();
    invalidateWeek(queryClient).catch(() => undefined);
    onClose();
    toast.show(addedLine(language, date), {
      action: {
        label: addToWeekText(language, 'addToWeek.viewWeek'),
        onPress: () => navigation.navigate(APP_ROUTES.Week, { weekStart: weekStartOf(date), date }),
      },
    });
  };

  const plan = async (date: string, replace: boolean): Promise<void> => {
    if (!target) {
      return;
    }
    setBusyDate(date);
    try {
      await planRoutineForDay({
        date,
        routineId: target.proposalId ? null : target.routineId,
        proposalId: target.proposalId ?? null,
        replace,
        clientId: createUuid(),
      });
      setBusyDate(null);
      done(date);
    } catch (error) {
      setBusyDate(null);
      if (error instanceof ProposalError && error.code === 'day_has_routine' && !replace) {
        const existing = error.existing?.name || known[date] || '';
        Alert.alert(
          addToWeekText(language, 'addToWeek.replace.title', {
            day: weekdayName(language, date),
            name: existing,
          }),
          undefined,
          [
            { text: addToWeekText(language, 'addToWeek.replace.cancel'), style: 'cancel' },
            {
              text: addToWeekText(language, 'addToWeek.replace.confirm'),
              onPress: () => {
                plan(date, true).catch(() => undefined);
              },
            },
          ],
        );
        return;
      }
      if (error instanceof ProposalError && error.code === 'past_day') {
        invalidateWeek(queryClient).catch(() => undefined);
      }
      haptics.error();
      toast.show(addToWeekError(language, error), { tone: 'error' });
    }
  };

  const loading = current.isLoading || (next.isLoading && Boolean(nextStart));
  const failed = current.isError;

  const row = (day: WeekDay) => {
    const past = Boolean(today) && day.date < today;
    const busy = busyDate === day.date;
    const name = day.routine?.title ?? null;
    return (
      <PressableScale
        key={day.date}
        accessibilityRole="button"
        accessibilityState={{ disabled: past || busyDate !== null }}
        accessibilityLabel={[weekdayLabel(language, day.date), name].filter(Boolean).join(', ')}
        disabled={past || busyDate !== null}
        onPress={() => {
          plan(day.date, false).catch(() => undefined);
        }}
        style={[styles.row, { borderBottomColor: colors.divider }, past ? styles.past : null]}
      >
        <View style={styles.flex}>
          <TextV2 variant="label">
            {weekdayLabel(language, day.date)}
            {day.date === today ? ` · ${addToWeekText(language, 'addToWeek.today')}` : ''}
          </TextV2>
          <TextV2 variant="caption" color={colors.text.secondary} numberOfLines={1}>
            {busy
              ? addToWeekText(language, 'addToWeek.adding')
              : (name ?? (past ? ' ' : addToWeekText(language, 'addToWeek.free')))}
          </TextV2>
        </View>
        {name && !busy ? <Check size={16} color={colors.text.tertiary} strokeWidth={2} /> : null}
      </PressableScale>
    );
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (busyDate === null) {
          onClose();
        }
      }}
      eyebrow={addToWeekText(language, 'addToWeek.title').toUpperCase()}
      title={target ? addToWeekText(language, 'addToWeek.subtitle', { name: target.name }) : undefined}
      scrollable
    >
      {loading ? (
        <SkeletonGroup>
          <View style={styles.skeleton}>
            <Skeleton height={44} width="100%" />
            <Skeleton height={44} width="100%" />
            <Skeleton height={44} width="100%" />
          </View>
        </SkeletonGroup>
      ) : failed ? (
        <Button
          label={addToWeekText(language, 'addToWeek.error.generic')}
          variant="secondary"
          icon={CalendarPlus}
          onPress={() => {
            current.refetch().catch(() => undefined);
          }}
        />
      ) : (
        <View style={styles.weeks}>
          {weeks.map(week =>
            week.days.length > 0 ? (
              <View key={week.key}>
                <TextV2 variant="eyebrow" color={colors.text.secondary}>
                  {week.title.toUpperCase()}
                </TextV2>
                {week.days.map(row)}
              </View>
            ) : null,
          )}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  weeks: { gap: 18, paddingBottom: 12 },
  skeleton: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  past: { opacity: 0.4 },
});
