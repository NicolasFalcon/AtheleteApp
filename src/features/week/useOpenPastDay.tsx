import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { dayHistoryText } from '@app/features/week/dayHistoryCopy';
import { DaySessionsSheet, DaySummarySheet } from '@app/features/week/v2/DayHistorySheets';
import { dayLabel } from '@app/features/week/weekModel';
import { useAuth } from '@app/hooks/useAuth';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { fetchDaySessions, type DaySession } from '@app/services/supabase/session';
import type { AppStackParamList } from '@app/types/navigation';

// A past day of Tu semana (Semana, Mes): its completed sessions (local day,
// by start time) decide. One → its summary (historial); several → the list;
// none → the routine that was planned ("No completada", when there is one) or
// the day summary. `sheets` must be rendered by the screen.
export function useOpenPastDay(today: string): {
  open: (date: string, plannedRoutineId: string | null) => Promise<void>;
  sheets: ReactNode;
} {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const language = useProfileLanguage();
  const [daySessions, setDaySessions] = useState<{ date: string; sessions: DaySession[] } | null>(null);
  const [summaryDate, setSummaryDate] = useState<string | null>(null);
  const opening = useRef(false);

  const open = useCallback(
    async (date: string, plannedRoutineId: string | null) => {
      if (!profile?.id || opening.current) {
        return;
      }
      opening.current = true;
      try {
        const sessions = await queryClient.fetchQuery({
          queryKey: ['day-sessions', profile.id, date],
          staleTime: 60 * 1000,
          queryFn: () => fetchDaySessions(profile.id, date),
        });
        if (sessions.length === 1) {
          navigation.navigate(APP_ROUTES.WorkoutSummary, { sessionId: sessions[0].id, mode: 'history' });
        } else if (sessions.length > 1) {
          setDaySessions({ date, sessions });
        } else if (plannedRoutineId) {
          navigation.navigate(APP_ROUTES.WorkoutDetail, { workoutId: plannedRoutineId, missedOn: date });
        } else {
          setSummaryDate(date);
        }
      } catch (error) {
        __DEV__ && console.warn('[week] No se pudo abrir el día:', error);
        toast.show(dayHistoryText(language, 'day.error'), { tone: 'error' });
      } finally {
        opening.current = false;
      }
    },
    [language, navigation, profile?.id, queryClient, toast],
  );

  const sheets = (
    <>
      <DaySessionsSheet
        open={daySessions !== null}
        title={daySessions ? dayLabel(daySessions.date, today) : ''}
        sessions={daySessions?.sessions ?? []}
        onClose={() => setDaySessions(null)}
        onOpenSession={sessionId => {
          setDaySessions(null);
          navigation.navigate(APP_ROUTES.WorkoutSummary, { sessionId, mode: 'history' });
        }}
      />
      <DaySummarySheet
        date={summaryDate}
        title={summaryDate ? dayLabel(summaryDate, today) : ''}
        onClose={() => setSummaryDate(null)}
        onCore33={date => {
          setSummaryDate(null);
          navigation.navigate(APP_ROUTES.Core33, { date });
        }}
      />
    </>
  );

  return { open, sheets };
}
