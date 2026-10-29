import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  Award,
  ChartColumn,
  Check,
  ChevronsUp,
  CloudOff,
  Flame,
  Lock,
  Route as RouteIcon,
  Star,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react-native';
import { TextV2 } from '@app/components/v2';
import type { RewardIcon, RewardRow } from '@app/features/play/playModel';

const EMBER = '#FF5B1F';

function Burst({ delay }: { delay: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 1500 }));
  }, [delay, progress]);
  const animated = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 0.9 * (1 - progress.value),
    transform: [{ scale: 0.6 + progress.value * 1.6 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.burst, animated]} />;
}

// Glow and ripples behind the score ring (higher score, more of them).
export function ResultFx({ glow, bursts }: { glow: number; bursts: number[] }) {
  const halo = useSharedValue(1);
  useEffect(() => {
    halo.value = withSequence(withTiming(1.06, { duration: 1800 }), withTiming(1, { duration: 1800 }));
  }, [halo]);
  const haloStyle = useAnimatedStyle(() => ({ transform: [{ scale: halo.value }] }));
  return (
    <View pointerEvents="none" style={styles.fx}>
      <Animated.View
        style={[
          styles.halo,
          {
            backgroundColor: `rgba(255,91,31,${glow * 0.4})`,
            boxShadow: `0 0 140px 80px rgba(255,91,31,${glow * 0.5})`,
          },
          haloStyle,
        ]}
      />
      {bursts.map(delay => (
        <Burst key={delay} delay={delay} />
      ))}
    </View>
  );
}

// One of the three tiles under the ring (puntos · racha máx. · mejor).
export function ResultTile({
  icon: Icon,
  value,
  label,
  delay,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  delay: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400)}
      style={styles.tile}
      accessible
      accessibilityLabel={`${value} ${label}`}
    >
      <View style={styles.tileIcon}>
        <Icon size={15} color="#FFFFFF" strokeWidth={2} />
      </View>
      <TextV2 style={styles.tileValue}>{value}</TextV2>
      <TextV2 variant="caption" color="#8C8A85">
        {label}
      </TextV2>
    </Animated.View>
  );
}

// "¡NUEVO RÉCORD!" card, or the level's record line.
export function RecordLine({ isNew, before, after }: { isNew: boolean; before: number | null; after: number }) {
  if (isNew) {
    return (
      <Animated.View entering={ZoomIn.delay(1200).duration(500)} style={styles.record}>
        <View style={styles.recordIcon}>
          <ChartColumn size={19} color="#111111" strokeWidth={2.2} />
        </View>
        <View style={styles.flexGap2}>
          <TextV2 variant="metaStrong" color="#FF8A5C" style={styles.recordEyebrow}>
            ¡NUEVO RÉCORD!
          </TextV2>
          <TextV2 variant="body" color="#D8D6D1">
            {`Superaste tu mejor resultado en este nivel (${before ?? 0}/10).`}
          </TextV2>
        </View>
      </Animated.View>
    );
  }
  return (
    <View style={styles.inline}>
      <Trophy size={13} color="rgba(255,255,255,.5)" strokeWidth={2} />
      <TextV2 variant="meta" color="#8C8A85">
        {`Récord del nivel · ${after}/10`}
      </TextV2>
    </View>
  );
}

const REWARD_ICONS: Record<RewardIcon, LucideIcon> = {
  star: Star,
  flame: Flame,
  lock: Lock,
  award: Award,
  target: Target,
  route: RouteIcon,
};

function LevelBar({ startPct, endPct }: { startPct: number; endPct: number }) {
  const width = useSharedValue(startPct);
  useEffect(() => {
    width.value = withDelay(1100, withTiming(endPct, { duration: 1200, easing: Easing.bezier(0.3, 0.8, 0.2, 1) }));
  }, [endPct, width]);
  const animated = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View style={styles.levelTrack}>
      <Animated.View style={[styles.levelFill, animated]} />
    </View>
  );
}

// Rewards from the server (desafío, racha, nivel, objetivos, logro) and the
// player level bar, animated from before to after the round.
export function RewardsCard({
  rows,
  bar,
}: {
  rows: RewardRow[];
  bar: { from: string; right: string; startPct: number; endPct: number; up: { label: string } | null };
}) {
  return (
    <View style={styles.rewards}>
      {rows.map((row, index) => {
        const Icon = REWARD_ICONS[row.icon];
        return (
          <Animated.View
            key={`${row.label}-${index}`}
            entering={FadeInDown.delay(900 + index * 140).duration(400)}
            style={[styles.rewardRow, index > 0 && styles.rule]}
          >
            <View style={[styles.rewardIcon, row.highlight && styles.rewardIconHot]}>
              <Icon size={14} color="#FFFFFF" strokeWidth={2} />
            </View>
            <TextV2 variant="body" color="#E8E6E1" style={styles.flex} numberOfLines={2}>
              {row.label}
            </TextV2>
            <TextV2 variant="bodyStrong" color={row.highlight ? '#FF8A5C' : '#FFFFFF'} style={styles.rewardValue}>
              {row.value}
            </TextV2>
          </Animated.View>
        );
      })}
      <Animated.View
        entering={FadeInDown.delay(900 + rows.length * 140).duration(400)}
        style={[styles.levelRow, rows.length > 0 && styles.rule]}
      >
        <View style={styles.levelHead}>
          <TextV2 variant="captionStrong" color="#FFFFFF">
            {bar.from}
          </TextV2>
          <TextV2 variant="caption" color="#8C8A85">
            {bar.right}
          </TextV2>
        </View>
        <LevelBar startPct={bar.startPct} endPct={bar.endPct} />
        {bar.up ? (
          <Animated.View entering={ZoomIn.delay(2400).duration(500)} style={styles.upChip}>
            <ChevronsUp size={13} color="#111111" strokeWidth={2.4} />
            <TextV2 variant="captionStrong" color="#111111" style={styles.upText}>
              {bar.up.label.toUpperCase()}
            </TextV2>
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

// "Repasemos esto": topics of the missed questions (max 4, from the server).
export function ReviewTopics({ topics }: { topics: string[] }) {
  return (
    <Animated.View entering={FadeInDown.delay(1300).duration(400)} style={styles.review}>
      <TextV2 variant="captionStrong" color="#FFFFFF" style={styles.reviewTitle}>
        REPASEMOS ESTO
      </TextV2>
      <View style={styles.topics}>
        {topics.map(topic => (
          <View key={topic} style={styles.topic}>
            <TextV2 variant="meta" color="#E8E6E1">
              {topic}
            </TextV2>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

export function NextObjective({ text }: { text: string }) {
  return (
    <Animated.View entering={FadeInDown.delay(1450).duration(400)} style={styles.objective}>
      <Target size={16} color="rgba(255,255,255,.55)" strokeWidth={2} />
      <TextV2 variant="body" color="#D8D6D1" style={styles.flex}>
        <TextV2 variant="body" color="#8C8A85">
          Próximo objetivo ·{' '}
        </TextV2>
        {text}
      </TextV2>
    </Animated.View>
  );
}

// Saving / queued (no connection) / failed line, instead of the rewards.
export function SaveNotice({
  kind,
  message,
}: {
  kind: 'saving' | 'queued' | 'error';
  message?: string;
}) {
  return (
    <View style={[styles.notice, kind === 'error' && styles.noticeError]} accessibilityLiveRegion="polite">
      {kind === 'queued' ? <CloudOff size={16} color="#D8D6D1" strokeWidth={2} /> : null}
      <TextV2 variant="body" color={kind === 'error' ? '#FF8A5C' : '#D8D6D1'} style={styles.flex}>
        {kind === 'saving'
          ? 'Guardando tu resultado…'
          : kind === 'queued'
          ? 'Guardaremos tu resultado al reconectar. Los puntos, la racha y los desbloqueos llegan cuando se guarde.'
          : message ?? 'No pudimos guardar tu resultado.'}
      </TextV2>
    </View>
  );
}

// Full-screen celebration (§28.6): Ember square with the award, eyebrow and
// title. A tap closes it; it closes itself after ~2.9 s.
export function PlayCelebration({
  eyebrow,
  title,
  onClose,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(250)} style={styles.celebration}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${eyebrow}. ${title}. Toca para continuar`}
        onPress={onClose}
        style={styles.celebrationPress}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.celebrationIcon}>
          <Award size={52} color="#FFFFFF" strokeWidth={1.8} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.celebrationText}>
          <TextV2 variant="captionStrong" color="#FF8A5C" style={styles.celebrationEyebrow}>
            {eyebrow.toUpperCase()}
          </TextV2>
          <TextV2 color="#FFFFFF" align="center" style={styles.celebrationTitle}>
            {title}
          </TextV2>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// The medal of the round under the ring (Oro · Plata · Bronce).
export function MedalChip({ label }: { label: string }) {
  return (
    <Animated.View entering={ZoomIn.delay(1000).duration(450)} style={styles.medal}>
      <View style={styles.medalDot}>
        <Check size={10} color="#111111" strokeWidth={3} />
      </View>
      <TextV2 variant="captionStrong" color="#FFFFFF">
        {label}
      </TextV2>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGap2: { flex: 1, gap: 2 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fx: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 260, height: 260, borderRadius: 130 },
  burst: {
    position: 'absolute',
    width: 182,
    height: 182,
    borderRadius: 91,
    borderWidth: 2,
    borderColor: EMBER,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,.05)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)',
  },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,91,31,.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileValue: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.55,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  record: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,91,31,.08)',
    boxShadow: `inset 0 0 0 1.5px ${EMBER}`,
  },
  recordIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: EMBER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordEyebrow: { fontWeight: '700', letterSpacing: 0.78 },
  rewards: {
    alignSelf: 'stretch',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,.04)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)',
  },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,.12)' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  rewardIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIconHot: { backgroundColor: 'rgba(255,91,31,.18)' },
  rewardValue: { fontWeight: '700', fontVariant: ['tabular-nums'], maxWidth: '45%', textAlign: 'right' },
  levelRow: { gap: 7, paddingVertical: 11, paddingHorizontal: 14 },
  levelHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  levelTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.1)', overflow: 'hidden' },
  levelFill: { height: '100%', borderRadius: 3, backgroundColor: EMBER, boxShadow: '0 0 12px rgba(255,91,31,.5)' },
  upChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    height: 26,
    paddingHorizontal: 11,
    borderRadius: 13,
    backgroundColor: EMBER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  upText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.66 },
  review: { alignSelf: 'stretch', gap: 10 },
  reviewTitle: { fontWeight: '700', letterSpacing: 0.96 },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topic: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.07)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)',
  },
  objective: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 10 },
  notice: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,.05)',
  },
  noticeError: { backgroundColor: 'rgba(255,91,31,.12)' },
  celebration: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: 'rgba(18,17,16,.9)',
  },
  celebrationPress: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 24 },
  celebrationIcon: {
    width: 112,
    height: 112,
    borderRadius: 36,
    backgroundColor: EMBER,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 18px 50px rgba(255,91,31,.4)',
  },
  celebrationText: { alignItems: 'center', gap: 6 },
  celebrationEyebrow: { fontWeight: '700', letterSpacing: 1.44 },
  celebrationTitle: { fontSize: 30, lineHeight: 34, fontWeight: '700', letterSpacing: -0.75 },
  medal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 26,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,.08)',
  },
  medalDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: EMBER,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
