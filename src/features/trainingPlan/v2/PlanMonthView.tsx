import { StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { PressableScale, TextV2, haptics, sessionTypeColor, useThemeV2, type SessionType } from '@app/components/v2';
import {
  DAY_LETTERS,
  dayName,
  monthTitle,
  sessionTypeKey,
  useTrainingPlanText,
} from '@app/features/trainingPlan/trainingPlanCopy';
import {
  addMonths,
  monthRows,
  monthWeeksSpan,
  type PlanDayState,
} from '@app/features/trainingPlan/planViewModel';
import { isDeloadWeek } from '@app/features/trainingPlan/trainingPlanModel';
import { useTrainingPlanMonth } from '@app/features/trainingPlan/usePlanViews';
import { DayMark } from '@app/features/trainingPlan/v2/PlanDayParts';
import { PlanError, PlanLoading } from '@app/features/trainingPlan/v2/PlanStates';
import { dayNumber } from '@app/features/week/weekModel';
import type { PlanMonthDay } from '@app/services/supabase/trainingPlan';

const TYPES: SessionType[] = ['pesado', 'volumen', 'tecnico', 'descarga', 'test'];

// Tu semana · Mes (handoff v2.21 §31.5): "Noviembre 2026 · Semanas 5 a 9" and
// the grid of weeks with the week column (S5…; a deload says DESC on rbS, a
// whole row of pause says PAUSA). Each day is its number and a 24 pt mark with
// the type's colour and the state; today is outlined in ink; days outside the
// month are at 45 %. The months go as far as the plan does.
export function PlanMonthView({
  month,
  range,
  today,
  onChangeMonth,
  onOpenCell,
}: {
  month: string;
  range: { first: string; last: string };
  today: string;
  onChangeMonth: (month: string) => void;
  onOpenCell: (date: string, state: PlanDayState) => void;
}) {
  const { colors } = useThemeV2();
  const { t, language } = useTrainingPlanText();
  const query = useTrainingPlanMonth(month);
  const rows = monthRows(month, query.data, today);
  const span = monthWeeksSpan(rows);
  const canPrev = month > range.first;
  const canNext = month < range.last;
  const go = (delta: -1 | 1) => {
    if ((delta < 0 && !canPrev) || (delta > 0 && !canNext)) {
      return;
    }
    haptics.light();
    onChangeMonth(addMonths(month, delta));
  };
  const letters = DAY_LETTERS[language];

  const head = (
    <View style={styles.head}>
      <View style={styles.headTexts}>
        <TextV2 variant="section">{monthTitle(language, month)}</TextV2>
        {span ? (
          <TextV2 variant="meta" color={colors.text.secondary}>
            {span.a === span.b ? t('month.subOne', { a: span.a }) : t('month.sub', { a: span.a, b: span.b })}
          </TextV2>
        ) : null}
      </View>
      <View style={styles.arrows}>
        {([-1, 1] as const).map(delta => {
          const enabled = delta < 0 ? canPrev : canNext;
          const Icon = delta < 0 ? ChevronLeft : ChevronRight;
          return (
            <PressableScale
              key={delta}
              accessibilityRole="button"
              accessibilityLabel={t(delta < 0 ? 'month.prev' : 'month.next')}
              accessibilityState={{ disabled: !enabled }}
              disabled={!enabled}
              onPress={() => go(delta)}
              style={[styles.arrow, { backgroundColor: colors.surface.muted }, enabled ? null : styles.off]}
            >
              <Icon size={18} color={colors.text.primary} strokeWidth={2} />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );

  if (query.isError) {
    return (
      <>
        {head}
        <PlanError onRetry={() => query.refetch()} />
      </>
    );
  }
  if (!query.data) {
    return (
      <>
        {head}
        <PlanLoading />
      </>
    );
  }

  return (
    <>
      {head}
      <View style={styles.grid}>
        <View style={styles.weekdays}>
          <View style={styles.weekCol} />
          {letters.map((letter, index) => (
            <TextV2 key={index} variant="captionStrong" color={colors.text.secondary} style={styles.weekday}>
              {letter}
            </TextV2>
          ))}
        </View>
        {rows.map((row, rowIndex) => {
          const deload = row.kind !== null && isDeloadWeek(row.kind) && !row.allPaused;
          return (
            <View
              key={rowIndex}
              style={[styles.row, deload ? { backgroundColor: colors.plan.rbS } : null]}
            >
              <View style={styles.weekCol}>
                {row.allPaused ? (
                  <TextV2 color={colors.text.secondary} style={styles.weekLabel2}>
                    {t('month.pause')}
                  </TextV2>
                ) : (
                  <>
                    <TextV2 color={deload ? colors.plan.rbT : colors.text.secondary} style={styles.weekLabel}>
                      {row.weekIndex !== null ? t('month.weekLabel', { n: row.weekIndex }) : ''}
                    </TextV2>
                    {deload ? (
                      <TextV2 color={colors.plan.rbT} style={styles.weekLabel2}>
                        {t('month.deload')}
                      </TextV2>
                    ) : null}
                  </>
                )}
              </View>
              {row.cells.map(cell => {
                const isToday = cell.date === today;
                const pause = cell.state === 'pause';
                const day: PlanMonthDay | undefined = cell.day;
                return (
                  <PressableScale
                    key={cell.date}
                    accessibilityRole="button"
                    accessibilityLabel={`${dayName(language, cell.date)}${
                      day?.type ? ` · ${t(sessionTypeKey(day.type))}` : pause ? ` · ${t('day.inPause')}` : ''
                    }`}
                    onPress={() => onOpenCell(cell.date, cell.state)}
                    style={[
                      styles.cell,
                      cell.inMonth ? null : styles.outside,
                      pause ? [styles.cellPause, { backgroundColor: colors.surface.muted, borderColor: colors.divider }] : null,
                      isToday ? [styles.cellToday, { backgroundColor: colors.surface.raised, borderColor: colors.text.primary }] : null,
                    ]}
                  >
                    <TextV2
                      color={pause ? colors.text.secondary : colors.text.primary}
                      style={styles.cellNumber}
                    >
                      {String(dayNumber(cell.date))}
                    </TextV2>
                    <DayMark
                      state={cell.state}
                      type={day?.type ?? null}
                      added={cell.state === 'added' || (cell.state === 'done' && !day?.type)}
                    />
                  </PressableScale>
                );
              })}
            </View>
          );
        })}
      </View>

      <View style={[styles.legend, { backgroundColor: colors.surface.raised }, styles.legendShadow]}>
        <TextV2 color={colors.text.secondary} style={styles.legendTitle}>
          {t('legend.title')}
        </TextV2>
        <View style={styles.legendRow}>
          {TYPES.map(type => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: sessionTypeColor(colors, type) }]} />
              <TextV2 variant="meta">{t(sessionTypeKey(type))}</TextV2>
            </View>
          ))}
        </View>
        <View style={[styles.rule, { backgroundColor: colors.divider }]} />
        <View style={styles.legendRow}>
          {(
            [
              ['done', 'legend.done'],
              ['missed', 'legend.missed'],
              ['pending', 'legend.pending'],
              ['substituted', 'legend.substituted'],
              ['pause', 'legend.pause'],
            ] as const
          ).map(([state, key]) => (
            <View key={state} style={styles.legendItem}>
              {state === 'pause' ? (
                <View style={[styles.legendMark, styles.legendPause, { backgroundColor: colors.surface.muted, borderColor: colors.divider }]} />
              ) : (
                <DayMark state={state} type="pesado" size={16} radius={5} iconSize={10} />
              )}
              <TextV2 variant="meta" color={colors.text.secondary}>
                {t(key)}
              </TextV2>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View style={[styles.deloadSwatch, { backgroundColor: colors.plan.rbS }]} />
            <TextV2 variant="meta" color={colors.text.secondary}>
              {t('legend.deloadWeek')}
            </TextV2>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  off: { opacity: 0.35 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headTexts: { flex: 1, minWidth: 0, gap: 2 },
  arrows: { flexDirection: 'row', gap: 6 },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  grid: { gap: 6, marginTop: -8 },
  weekdays: { flexDirection: 'row', gap: 4 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11 },
  row: { flexDirection: 'row', gap: 4, paddingVertical: 4, borderRadius: 14 },
  weekCol: { width: 30, alignItems: 'center', justifyContent: 'center', gap: 1 },
  weekLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  weekLabel2: { fontSize: 8.5, fontWeight: '700', letterSpacing: 0.5 },
  cell: { flex: 1, height: 58, borderRadius: 12, alignItems: 'center', paddingTop: 6, gap: 6 },
  outside: { opacity: 0.45 },
  cellPause: { borderWidth: 1 },
  cellToday: { borderWidth: 2 },
  cellNumber: { fontSize: 13, lineHeight: 15, fontWeight: '600' },
  legend: { gap: 10, padding: 16, borderRadius: 20 },
  legendShadow: { boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.05)' },
  legendTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  swatch: { width: 14, height: 14, borderRadius: 5 },
  rule: { height: StyleSheet.hairlineWidth },
  legendMark: { width: 16, height: 16, borderRadius: 5 },
  legendPause: { borderWidth: 1 },
  deloadSwatch: { width: 22, height: 12, borderRadius: 4 },
});
