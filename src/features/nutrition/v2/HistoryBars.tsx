import { StyleSheet, View } from 'react-native';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { daysNearGoal, formatThousands } from '@app/features/nutrition/nutritionModel';

export type HistoryDay = {
  date: string;
  kcal: number;
  goal: number | null;
  isToday: boolean;
};

const BAR_MAX = 180;
const WEEKDAYS: Record<EllieLanguage, string[]> = {
  es: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
};

// Últimos 7 días (design §23.3): seven bars (180 pt at most) against the goal
// line, the past ones in hairline, the selected one in ink and today in Ember.
export function HistoryBars({
  days,
  selected,
  onSelect,
  language = 'es',
}: {
  days: HistoryDay[];
  selected: string;
  onSelect: (date: string) => void;
  language?: EllieLanguage;
}) {
  const { colors } = useThemeV2();
  const es = language === 'es';
  const goal = days.find(day => day.goal)?.goal ?? null;
  const peak = Math.max(goal ?? 0, ...days.map(day => day.kcal), 1);
  const scale = (value: number) => Math.round((value / peak) * BAR_MAX);
  const near = daysNearGoal(days);
  const average = days.filter(day => day.kcal > 0);
  const mean = average.length ? Math.round(average.reduce((sum, day) => sum + day.kcal, 0) / average.length) : 0;

  return (
    <View style={styles.wrap}>
      <TextV2 variant="eyebrow" tone="secondary">
        {es ? 'ÚLTIMOS 7 DÍAS' : 'LAST 7 DAYS'}
      </TextV2>
      <View style={styles.summary}>
        <TextV2 style={styles.mean}>{formatThousands(mean)}</TextV2>
        <TextV2 variant="meta" tone="secondary">
          {near.counted > 0
            ? es
              ? `${near.near} de ${near.counted} días cerca de tu meta`
              : `${near.near} of ${near.counted} days near your goal`
            : es
              ? 'kcal de media'
              : 'kcal on average'}
        </TextV2>
      </View>
      <View style={[styles.chart, { height: BAR_MAX + 28 }]}>
        {goal ? (
          <View style={[styles.goalLine, { bottom: 28 + scale(goal), borderColor: colors.text.disabled }]}>
            <TextV2 variant="caption" tone="secondary" style={styles.goalLabel}>
              {formatThousands(goal)}
            </TextV2>
          </View>
        ) : null}
        {days.map(day => {
          const active = day.date === selected;
          const date = new Date(`${day.date}T12:00:00`);
          return (
            <PressableScale
              key={day.date}
              accessibilityRole="button"
              accessibilityLabel={`${day.date}, ${day.kcal} kcal`}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(day.date)}
              style={styles.col}
            >
              <View style={styles.barSlot}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(4, scale(day.kcal)),
                      backgroundColor: day.isToday
                        ? colors.ember.base
                        : active
                          ? colors.text.primary
                          : colors.divider,
                    },
                  ]}
                />
              </View>
              <TextV2
                variant="caption"
                color={active ? colors.text.primary : colors.text.secondary}
                style={active ? styles.activeDay : undefined}
              >
                {WEEKDAYS[language][date.getDay()]}
              </TextV2>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  summary: { gap: 2 },
  mean: { fontSize: 40, lineHeight: 44, fontWeight: '600', letterSpacing: -1.4 },
  chart: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center', gap: 8 },
  barSlot: { height: BAR_MAX, justifyContent: 'flex-end', width: '100%' },
  bar: { width: '100%', borderRadius: 12 },
  activeDay: { fontWeight: '700' },
  goalLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  goalLabel: { position: 'absolute', right: 0, top: -16 },
});
