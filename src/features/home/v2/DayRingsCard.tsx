import { StyleSheet, View } from 'react-native';
import {
  PressableScale,
  Rings,
  SectionHeader,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import type { DayRing, DayRingKind } from '@app/features/home/homePriority';
import { BlockError } from '@app/features/home/v2/BlockError';

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
};

// "Tu día": Core 33 / Entreno, Nutrición and Hidratación (Home.dc.html).
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
}: DayRingsCardProps) {
  const { colors } = useThemeV2();
  const ringColors = [
    { color: colors.ember.base, opacity: 1 },
    { color: colors.ember.base, opacity: 0.6 },
    { color: colors.recovery.base, opacity: 1 },
  ];

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <SectionHeader title="Tu día" style={styles.flex} />
        {!loading && !error ? (
          <TextV2 variant="meta" tone="secondary">
            {`${dayPct} % completado`}
          </TextV2>
        ) : null}
      </View>

      {error ? (
        <BlockError message="No pudimos cargar tu día." onRetry={onRetry} />
      ) : loading ? (
        <SkeletonGroup>
          <View style={styles.row}>
            <Skeleton width={156} height={156} radius={78} />
            <View style={styles.legend}>
              <Skeleton width="70%" height={36} />
              <Skeleton width="70%" height={36} />
              <Skeleton width="70%" height={36} />
            </View>
          </View>
        </SkeletonGroup>
      ) : (
        <>
          <View style={styles.row}>
            <Rings
              rings={rings.map((ring, index) => ({
                progress: ring.progress,
                ...ringColors[index],
              }))}
            />
            <View style={styles.legend}>
              {rings.map((ring, index) => (
                <View key={ring.kind} style={styles.legendRow}>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`${ring.label}: ${ring.value} ${ring.unit}`}
                    onPress={() => onOpenRing(ring.kind)}
                    style={styles.legendText}
                  >
                    <View style={styles.legendLabel}>
                      <View
                        style={[
                          styles.swatch,
                          {
                            backgroundColor: ringColors[index].color,
                            opacity: ringColors[index].opacity,
                          },
                        ]}
                      />
                      <TextV2
                        variant="caption"
                        tone="secondary"
                        numberOfLines={1}
                      >
                        {ring.label}
                      </TextV2>
                    </View>
                    <View style={styles.value}>
                      <TextV2 variant="title22">{ring.value}</TextV2>
                      <TextV2 variant="meta" tone="secondary">
                        {ring.unit}
                      </TextV2>
                    </View>
                  </PressableScale>
                  {ring.kind === 'hydration' && !ring.done && !isNewUser ? (
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
                  ) : null}
                </View>
              ))}
            </View>
          </View>
          {isNewUser ? (
            <TextV2 variant="meta" tone="secondary" style={styles.hint}>
              Los anillos se llenan a medida que entrenas, comes y bebes agua.
            </TextV2>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
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
  hint: {
    marginTop: -6,
  },
});
