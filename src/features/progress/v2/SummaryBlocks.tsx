import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import {
  Button,
  Eyebrow,
  HeatCalendar,
  PressableScale,
  RecordCard,
  TextV2,
  WeeklyCapsules,
  useThemeV2,
} from '@app/components/v2';
import {
  CAPSULE_FULL_MINUTES,
  WEEKDAY_LETTERS,
  type HydrationWeek,
  type MonthStats,
  type NutritionWeek,
  type WeekStats,
} from '@app/features/progress/progressModel';
import {
  formatRecord,
  shortDate,
  type ExerciseRecords,
} from '@app/features/progress/recordsModel';

// Entreno · the week in capsules.
export function TrainingWeekBlock({
  week,
  empty,
}: {
  week: WeekStats;
  empty: boolean;
}) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.block}>
      <View style={styles.between}>
        <Eyebrow>Entreno</Eyebrow>
        <TextV2 variant="meta" color={colors.text.secondary}>
          <TextV2 variant="cta" color={colors.text.primary}>
            {String(week.minutes)}
          </TextV2>
          {` de ${week.goalMinutes} min`}
        </TextV2>
      </View>
      <WeeklyCapsules
        empty={empty}
        fullAt={CAPSULE_FULL_MINUTES}
        days={week.days.map(day => ({
          letter: day.letter,
          value: day.minutes,
          isToday: day.isToday,
        }))}
      />
    </View>
  );
}

const MINI_W = 160;
const MINI_H = 44;

// Nutrición (protein per day with the goal as a dashed line) next to
// Hidratación (days at the water goal as seven dots).
export function NutritionHydrationRow({
  nutrition,
  hydration,
  hasPlan,
  onOpen,
}: {
  nutrition: NutritionWeek;
  hydration: HydrationWeek;
  hasPlan: boolean;
  onOpen: () => void;
}) {
  const { colors } = useThemeV2();
  const scaleMax = Math.max(
    nutrition.goal ? nutrition.goal * 1.15 : 0,
    ...nutrition.values.map(v => v ?? 0),
    1,
  );
  const yOf = (value: number) => MINI_H - (value / scaleMax) * MINI_H;
  const points = nutrition.values
    .map((value, index) =>
      value === null ? null : { x: (index / 6) * MINI_W, y: yOf(value) },
    )
    .filter((p): p is { x: number; y: number } => p !== null);
  const last = points[points.length - 1];

  return (
    <View style={[styles.twoCols, { borderTopColor: colors.divider }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Nutrición de la semana"
        onPress={onOpen}
        style={styles.col}
      >
        <Eyebrow>Nutrición</Eyebrow>
        <View style={styles.valueRow}>
          <TextV2 variant="title24">
            {nutrition.average !== null ? String(nutrition.average) : '—'}
          </TextV2>
          <TextV2 variant="meta" color={colors.text.secondary}>
            g prot/día
          </TextV2>
        </View>
        <Svg width={MINI_W} height={MINI_H} style={styles.overflow}>
          {nutrition.goal ? (
            <Line
              x1={0}
              y1={yOf(nutrition.goal)}
              x2={MINI_W}
              y2={yOf(nutrition.goal)}
              stroke={colors.outline.control}
              strokeDasharray="3 4"
            />
          ) : null}
          {points.length > 1 ? (
            <Polyline
              points={points
                .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                .join(' ')}
              fill="none"
              stroke={colors.recovery.base}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {last ? (
            <Circle cx={last.x} cy={last.y} r={4} fill={colors.ember.base} />
          ) : null}
        </Svg>
        <TextV2 variant="caption" color={colors.text.secondary}>
          {!hasPlan
            ? 'Sin plan nutricional'
            : nutrition.goal
            ? `Meta ${nutrition.goal} g · línea discontinua`
            : 'Registra lo que comes hoy'}
        </TextV2>
      </PressableScale>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Hidratación de la semana"
        onPress={onOpen}
        style={styles.col}
      >
        <Eyebrow>Hidratación</Eyebrow>
        <View style={styles.valueRow}>
          <TextV2 variant="title24">{String(hydration.daysMet)}</TextV2>
          <TextV2 variant="meta" color={colors.text.secondary}>
            de 7 días
          </TextV2>
        </View>
        <View style={styles.dots}>
          {hydration.dots.map((dot, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    dot === 'met' ? colors.recovery.base : 'transparent',
                  boxShadow:
                    dot === 'met'
                      ? undefined
                      : dot === 'today'
                      ? `inset 0 0 0 2px ${colors.recovery.base}`
                      : `inset 0 0 0 1.5px ${colors.outline.strong}`,
                },
              ]}
            />
          ))}
        </View>
        <TextV2 variant="caption" color={colors.text.secondary}>
          {`Días con ${hydration.goalGlasses} vasos`}
        </TextV2>
      </PressableScale>
    </View>
  );
}

// Mes · calendar of minutes per day.
export function MonthBlock({ month, now }: { month: MonthStats; now: Date }) {
  const today = now.getDate();
  return (
    <View style={styles.block}>
      <Eyebrow>{`${month.title} · minutos por día`}</Eyebrow>
      <HeatCalendar
        weekdays={WEEKDAY_LETTERS}
        cells={month.cells.map(cell => ({
          day: cell.day,
          level: cell.level,
          future: cell.day !== null && cell.day > today,
          isToday: cell.isToday,
        }))}
      />
    </View>
  );
}

// Tus marcas: best mark of each exercise as cards.
export function RecordsBlock({
  groups,
  onOpen,
  onOpenAll,
  onRegister,
}: {
  groups: ExerciseRecords[];
  onOpen: (group: ExerciseRecords) => void;
  onOpenAll: () => void;
  onRegister: () => void;
}) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.block}>
      <View style={styles.between}>
        <TextV2 variant="section">Tus marcas</TextV2>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Ver todos los récords"
          onPress={onOpenAll}
        >
          <TextV2 variant="meta" color={colors.text.secondary}>
            {groups.length === 1 ? '1 récord' : `${groups.length} récords`}
          </TextV2>
        </PressableScale>
      </View>
      {groups.length === 0 ? (
        <View style={styles.emptyRecords}>
          <TextV2 variant="body" color={colors.text.secondary}>
            Tu primera marca aparecerá aquí.
          </TextV2>
          <Button
            label="Registrar récord"
            variant="secondary"
            size="md"
            onPress={onRegister}
          />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.carousel}
        >
          {groups.map((group, index) => {
            const formatted = formatRecord(group.best);
            return (
              <RecordCard
                key={group.exerciseId}
                featured={index === 0}
                title={group.exerciseName}
                value={formatted.value}
                unit={formatted.unit}
                date={group.isNew ? 'Hoy' : shortDate(group.best.recordedAt)}
                isNew={group.isNew}
                onPress={() => onOpen(group)}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 12 },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  twoCols: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 22,
    borderTopWidth: 1,
  },
  col: { flex: 1, gap: 10 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  overflow: { overflow: 'visible' },
  dots: { flexDirection: 'row', gap: 5, height: 44, alignItems: 'center' },
  dot: { width: 17, height: 17, borderRadius: 9 },
  emptyRecords: { gap: 12, alignItems: 'flex-start' },
  bleed: { marginHorizontal: -20 },
  carousel: { gap: 12, paddingHorizontal: 20, paddingBottom: 8 },
});
