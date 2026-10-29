import { StyleSheet, View } from 'react-native';
import { ArrowRight, Check, Flame, Gamepad2, Play } from 'lucide-react-native';
import {
  PressableScale,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { formatThousands } from '@app/features/home/homePriority';
import { tightLine } from '@app/theme/v2';

type QuizBannerProps = {
  loading: boolean;
  points: number | null;
  // Player level bar (get_play_home): share of the level and its line.
  mastery: { progress: number; line: string } | null;
  // Racha de Play (days in a row with a finished round); null: unknown.
  streak: number | null;
  onPress: () => void;
};

// Inicio · APRENDE Y JUEGA (v2.18, Home.dc.html): "Athelete Play" with the
// points, the player level bar and the Play streak flame where MOKO used to
// be (§28.6); all from get_play_home, the same values as Play's portada.
export function QuizBanner({ loading, points, mastery, streak, onPress }: QuizBannerProps) {
  const { colors, shadow } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Athelete Play, jugar${streak ? `. Racha de ${streak} días` : ''}`}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface.raised,
          // Light: soft shadow; Dark: inner border (D-16).
          boxShadow: shadow.subtle,
        },
      ]}
    >
      <View style={styles.grid} pointerEvents="none">
        {[0, 1, 2, 3, 4, 5].map(cell => (
          <View
            key={cell}
            style={[
              styles.cell,
              { backgroundColor: cell === 1 ? colors.ember.base : colors.surface.muted },
            ]}
          >
            {cell === 1 ? <Check size={14} color={colors.ember.onText} strokeWidth={2.4} /> : null}
          </View>
        ))}
      </View>

      <View style={styles.body}>
        {streak !== null ? (
          <View style={styles.streak} pointerEvents="none">
            <View style={[styles.flame, { backgroundColor: colors.ember.base }]}>
              <Flame size={36} color={colors.ember.onText} strokeWidth={2} />
            </View>
            <View style={styles.streakText}>
              <TextV2 style={styles.streakValue}>{String(streak)}</TextV2>
              <TextV2 tone="secondary" style={styles.streakLabel} numberOfLines={1}>
                Racha de Play
              </TextV2>
            </View>
          </View>
        ) : null}

        <View style={styles.main}>
          <View style={styles.head}>
            <View style={[styles.pad, { backgroundColor: colors.ember.base }]}>
              <Gamepad2 size={18} color={colors.ember.onText} strokeWidth={2} />
            </View>
            <TextV2 style={styles.title} numberOfLines={1}>
              Athelete Play
            </TextV2>
          </View>
          <TextV2 tone="secondary" style={styles.eyebrow}>
            APRENDE Y GANA PUNTOS
          </TextV2>
          {loading ? (
            <SkeletonGroup>
              <Skeleton width={120} height={40} />
              <Skeleton width={152} height={7} />
            </SkeletonGroup>
          ) : (
            <>
              <View style={styles.points}>
                <TextV2 style={styles.pointsValue}>
                  {points === null ? '—' : formatThousands(points)}
                </TextV2>
                <TextV2 tone="secondary" style={styles.pointsUnit}>
                  pts
                </TextV2>
              </View>
              {mastery ? (
                <>
                  <View style={[styles.bar, { backgroundColor: colors.surface.muted }]}>
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
                  <TextV2 tone="secondary" style={styles.levelLine} numberOfLines={1}>
                    {mastery.line}
                  </TextV2>
                </>
              ) : null}
            </>
          )}
          <View style={[styles.play, { backgroundColor: colors.cta.primary }]}>
            <Play size={13} color={colors.cta.primaryText} strokeWidth={2.2} />
            <TextV2 variant="bodyStrong" color={colors.cta.primaryText}>
              Jugar
            </TextV2>
            <ArrowRight size={12} color={colors.cta.primaryText} strokeWidth={2.2} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    paddingTop: 20,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 20,
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 58,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cell: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { position: 'relative' },
  streak: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  flame: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 24px rgba(255,91,31,.35)',
  },
  streakText: { alignItems: 'center', gap: 2 },
  streakValue: { fontSize: 26, lineHeight: 28, fontWeight: '800', letterSpacing: -1 },
  streakLabel: { fontSize: 10.5, lineHeight: 13 },
  main: { minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 110 },
  pad: {
    width: 34,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, lineHeight: 28, fontWeight: '700', letterSpacing: -0.6, flexShrink: 1 },
  eyebrow: {
    marginTop: 12,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    letterSpacing: 2,
  },
  points: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  pointsValue: {
    fontSize: 44,
    ...tightLine(44, 1),
    fontWeight: '800',
    letterSpacing: -2,
  },
  pointsUnit: { fontSize: 18, lineHeight: 22, fontWeight: '500' },
  bar: {
    marginTop: 10,
    height: 7,
    width: 152,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  levelLine: { marginTop: 8, fontSize: 10.5, lineHeight: 13 },
  play: {
    alignSelf: 'flex-start',
    marginTop: 16,
    height: 46,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
