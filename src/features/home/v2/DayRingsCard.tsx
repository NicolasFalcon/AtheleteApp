import { GuideAnchor } from '@app/features/guides/GuideAnchor';
import { StyleSheet, View } from 'react-native';
import { ArrowRight, ChevronRight } from 'lucide-react-native';
import {
  AuraMark,
  PressableScale,
  Rings,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import type { DayRing, DayRingKind } from '@app/features/home/homePriority';
import { BlockError } from '@app/features/home/v2/BlockError';
import { WeekPills } from '@app/features/week/v2/WeekParts';
import { stripLine, type WeekPlan } from '@app/features/week/weekModel';
import type { PlanDayView } from '@app/features/trainingPlan/planViewModel';
import { PlanPills } from '@app/features/trainingPlan/v2/PlanDayParts';

// Ring colours, option A (v2.18 §28.14): Entrenamiento Ember, Core 33 peach,
// Nutrición sage, Hidratación Recovery Blue. Same in Light and Dark.
const PEACH = '#F39A74';
const SAGE = '#5E8F5A';

// ELLIE's note at the foot of the card: a sentence and its recommendation
// (bold). Only when there is one for today's data.
export type DayInsight = { text: string; strong?: string; onPress: () => void };

type DayRingsCardProps = {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  rings: DayRing[];
  dayPct: number;
  isNewUser: boolean;
  addingWater: boolean;
  onAddWater: () => void;
  onOpenRing: (kind: DayRingKind) => void;
  // "Entrenar →" of "Sin entreno hoy".
  onTrain: () => void;
  week: WeekPlan | null;
  weekLoading: boolean;
  onOpenWeek: () => void;
  // With an active or paused training plan (v2.21 §31.4): the plan's seven
  // days with their type and "Semana 6 de 12 · 2 de 4 sesiones" under them.
  plan?: { views: PlanDayView[]; line: string } | null;
  insight: DayInsight | null;
};

// Inicio · "Tu día" (v2.18 §28.14): one white card with the week strip, the
// dynamic rings (2–4) with their legend and, when there is one, ELLIE's note.
export function DayRingsCard({
  loading,
  error,
  onRetry,
  rings,
  dayPct,
  isNewUser,
  addingWater,
  onAddWater,
  onOpenRing,
  onTrain,
  week,
  weekLoading,
  onOpenWeek,
  plan = null,
  insight,
}: DayRingsCardProps) {
  const { colors, mode, shadow } = useThemeV2();
  const colorOf: Record<DayRingKind, string> = {
    workout: colors.ember.base,
    core33: PEACH,
    nutrition: SAGE,
    hydration: colors.recovery.base,
  };
  const four = rings.length >= 4;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface.raised,
          boxShadow:
            mode === 'light'
              ? '0 1px 2px rgba(0,0,0,.04), 0 10px 28px rgba(0,0,0,.06)'
              : shadow.subtle,
        },
      ]}
    >
      <View style={styles.header}>
        <TextV2 style={styles.title}>Tu día</TextV2>
        {!loading && !error ? (
          <TextV2 variant="meta" tone="secondary">
            {`${dayPct} % completado`}
          </TextV2>
        ) : null}
      </View>

      {week ? (
        <GuideAnchor id="home.week">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Tu semana. ${plan ? plan.line : stripLine(week)}`}
            onPress={onOpenWeek}
            style={styles.week}
          >
            <View pointerEvents="none">
              {/* The same pills as Semana; grey on the white card. */}
              {plan ? (
                <PlanPills views={plan.views} today={week.today} compact fill={colors.surface.muted} />
              ) : (
                <WeekPills
                  days={week.days}
                  today={week.today}
                  compact
                  fill={colors.surface.muted}
                />
              )}
            </View>
            <View style={styles.weekLine}>
              <TextV2 variant="meta" tone="secondary" style={styles.weekLineText}>
                {plan ? plan.line : `Semana · ${stripLine(week)}`}
              </TextV2>
              <View style={styles.weekLink}>
                <TextV2 variant="metaStrong">Ver semana</TextV2>
                <ChevronRight size={14} color={colors.text.primary} strokeWidth={2} style={styles.faint} />
              </View>
            </View>
          </PressableScale>
        </GuideAnchor>
      ) : weekLoading ? (
        <SkeletonGroup>
          <Skeleton height={50} />
        </SkeletonGroup>
      ) : null}

      {error ? (
        <BlockError message="No pudimos cargar tu día." onRetry={onRetry} />
      ) : loading ? (
        <SkeletonGroup>
          <View style={styles.row}>
            <Skeleton width={148} height={148} radius={74} />
            <View style={styles.legend}>
              <Skeleton width="70%" height={36} />
              <Skeleton width="70%" height={36} />
              <Skeleton width="70%" height={36} />
            </View>
          </View>
        </SkeletonGroup>
      ) : (
        <GuideAnchor id="home.rings">
          <View style={styles.row}>
            <Rings
              rings={rings.map(ring => ({
                progress: ring.progress,
                color: colorOf[ring.kind],
                opacity: ring.opacity,
              }))}
            />
            <View style={[styles.legend, four && styles.legendFour]}>
              {rings.map(ring => (
                <View key={ring.kind} style={styles.legendRow}>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`${ring.label}: ${ring.value} ${ring.unit}`.trim()}
                    onPress={() => onOpenRing(ring.kind)}
                    style={styles.legendText}
                  >
                    <View style={styles.legendLabel}>
                      <View
                        style={[
                          styles.swatch,
                          { backgroundColor: colorOf[ring.kind], opacity: ring.opacity ?? 1 },
                        ]}
                      />
                      <TextV2 variant="caption" tone="secondary" numberOfLines={1}>
                        {ring.label}
                      </TextV2>
                    </View>
                    {ring.text ? (
                      <TextV2 variant="bodyStrong" numberOfLines={1}>
                        {ring.value}
                      </TextV2>
                    ) : (
                      <View style={styles.value}>
                        <TextV2 variant="title22">{ring.value}</TextV2>
                        {ring.unit ? (
                          <TextV2
                            variant="meta"
                            tone="secondary"
                            numberOfLines={1}
                            style={styles.unit}
                          >
                            {ring.unit}
                          </TextV2>
                        ) : null}
                      </View>
                    )}
                    {ring.link ? (
                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel="Entrenar"
                        hitSlop={8}
                        onPress={onTrain}
                        style={styles.trainLink}
                      >
                        <TextV2 variant="metaStrong" color={colors.ember.deep}>
                          Entrenar
                        </TextV2>
                        <ArrowRight size={13} color={colors.ember.deep} strokeWidth={2.2} />
                      </PressableScale>
                    ) : null}
                  </PressableScale>
                  {/* +1 vaso: its own 44 pt column on the right, kept even
                      when hidden so the figure never moves under it. */}
                  {ring.kind === 'hydration' ? (
                    <View style={styles.plusSlot}>
                  {!ring.done && !isNewUser ? (
                    <GuideAnchor id="home.water">
                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel="Sumar un vaso"
                        disabled={addingWater}
                        onPress={onAddWater}
                        style={[
                          styles.plus,
                          { backgroundColor: colors.recovery.tintBg },
                          addingWater && styles.plusBusy,
                        ]}
                      >
                        <TextV2
                          variant="metaStrong"
                          color={colors.recovery.tintText}
                          style={styles.plusText}
                        >
                          +1
                        </TextV2>
                      </PressableScale>
                    </GuideAnchor>
                  ) : null}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        </GuideAnchor>
      )}

      {insight && !isNewUser && !loading && !error ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`ELLIE. ${insight.text} ${insight.strong ?? ''}`.trim()}
          onPress={insight.onPress}
          style={[styles.insight, { backgroundColor: colors.surface.muted }]}
        >
          <AuraMark size={28} />
          <TextV2 variant="meta" style={styles.flex}>
            {insight.text}
            {insight.strong ? <TextV2 variant="metaStrong">{` ${insight.strong}`}</TextV2> : null}
          </TextV2>
          <ChevronRight size={16} color={colors.text.primary} strokeWidth={2} style={styles.faint} />
        </PressableScale>
      ) : null}

      {isNewUser && !loading && !error ? (
        <TextV2 variant="meta" tone="secondary">
          Los anillos se llenan a medida que entrenas, comes y bebes agua.
        </TextV2>
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: { fontSize: 20, lineHeight: 24, fontWeight: '600' },
  flex: { flex: 1 },
  faint: { opacity: 0.5 },
  week: { gap: 12 },
  weekLineText: { flexShrink: 1 },
  weekLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  legend: {
    flex: 1,
    minWidth: 0,
    gap: 14,
  },
  legendFour: { gap: 10 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  legendLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 10,
    height: 4,
    borderRadius: 2,
  },
  value: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  trainLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  unit: { flexShrink: 1 },
  plusSlot: { width: 44, height: 44 },
  plus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBusy: {
    opacity: 0.5,
  },
  plusText: {
    fontWeight: '700',
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
