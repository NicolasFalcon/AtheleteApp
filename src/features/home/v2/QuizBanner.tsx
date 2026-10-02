import { StyleSheet, View } from 'react-native';
import { Check, Play } from 'lucide-react-native';
import {
  PressableScale,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { formatThousands } from '@app/features/home/homePriority';

type QuizBannerProps = {
  loading: boolean;
  points: number | null;
  mastery: { progress: number; line: string } | null;
  onPress: () => void;
};

// "Aprende y gana puntos": real points + progress towards Quiz Master (DA-40).
export function QuizBanner({
  loading,
  points,
  mastery,
  onPress,
}: QuizBannerProps) {
  const { colors, radius, shadow } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Quiz, jugar"
      onPress={onPress}
      style={[
        styles.card,
        {
          borderRadius: radius.card,
          backgroundColor: colors.surface.raised,
          // Light: soft shadow; Dark: inner border (D-16).
          boxShadow: shadow.subtle,
        },
      ]}
    >
      <TextV2
        style={[styles.mark, { color: colors.surface.muted }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        ?
      </TextV2>
      <View style={styles.main}>
        <TextV2 variant="eyebrow" tone="secondary">
          Aprende y gana puntos
        </TextV2>
        {loading ? (
          <SkeletonGroup>
            <Skeleton width={120} height={36} />
            <Skeleton height={5} />
          </SkeletonGroup>
        ) : (
          <>
            <View style={styles.points}>
              <TextV2 variant="displayS" style={styles.pointsValue}>
                {points === null ? '—' : formatThousands(points)}
              </TextV2>
              <TextV2 variant="label" tone="secondary">
                pts
              </TextV2>
            </View>
            {mastery ? (
              <View style={styles.level}>
                <View
                  style={[
                    styles.bar,
                    { backgroundColor: colors.surface.muted },
                  ]}
                >
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.round(mastery.progress * 100)}%`,
                        backgroundColor: colors.ember.base,
                      },
                    ]}
                  />
                </View>
                <TextV2 variant="caption" tone="secondary">
                  {mastery.line}
                </TextV2>
              </View>
            ) : null}
          </>
        )}
      </View>
      <View style={styles.side}>
        <View style={styles.grid}>
          <View
            style={[styles.cell, { backgroundColor: colors.surface.muted }]}
          />
          <View style={[styles.cell, { backgroundColor: colors.ember.base }]}>
            <Check size={13} color={colors.ember.onText} strokeWidth={2.4} />
          </View>
          <View
            style={[styles.cell, { backgroundColor: colors.surface.muted }]}
          />
          <View
            style={[styles.cell, { backgroundColor: colors.surface.muted }]}
          />
        </View>
        <View style={[styles.play, { backgroundColor: colors.cta.primary }]}>
          <Play size={14} color={colors.cta.primaryText} strokeWidth={2} />
          <TextV2 variant="label" color={colors.cta.primaryText}>
            Jugar
          </TextV2>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 18,
    paddingLeft: 20,
    paddingRight: 18,
    overflow: 'hidden',
  },
  mark: {
    position: 'absolute',
    right: -6,
    top: -34,
    fontSize: 150,
    lineHeight: 150,
    fontWeight: '700',
    letterSpacing: -9,
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  points: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  pointsValue: {
    fontSize: 38,
    lineHeight: 38,
  },
  level: {
    gap: 7,
  },
  bar: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  side: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 14,
  },
  grid: {
    width: 49,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  cell: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    height: 40,
    paddingLeft: 14,
    paddingRight: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
