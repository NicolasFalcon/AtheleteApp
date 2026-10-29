import { useEffect } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowRight,
  Award,
  Calendar,
  Check,
  Clock,
  Flame,
  Lock,
  Star,
  WifiOff,
  Zap,
} from 'lucide-react-native';
import {
  PressableScale,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { formatThousands } from '@app/features/home/homePriority';
import {
  bestLabel,
  GOAL_LABELS,
  levelNeedLine,
  levelProgress,
  renewsLabel,
  trackSegments,
} from '@app/features/play/playModel';
import { ROUTE_ICONS, ROUTE_PHOTOS } from '@app/features/play/v2/playVisuals';
import type {
  PlayDailyChallenge,
  PlayGoal,
  PlayGoalKey,
  PlayLevel,
  PlayPlayer,
  PlayRoute,
  PlayRouteView,
} from '@app/services/supabase/play';

const EMBER = '#FF5B1F';

// Best score in 10 segments: the hits lit, up to 8 (the goal) soft Ember, the
// rest on the track. `scene` = on the dark level start.
export function TrackBar({ best, scene = false }: { best: number | null; scene?: boolean }) {
  const { colors } = useThemeV2();
  return (
    <View style={styles.trackBar} accessible accessibilityLabel={`Mejor puntuación ${bestLabel(best)}`}>
      {trackSegments(best).map((segment, index) => (
        <View
          key={index}
          style={[
            styles.trackCell,
            {
              backgroundColor:
                segment === 'hit'
                  ? EMBER
                  : segment === 'goal'
                  ? scene
                    ? 'rgba(255,91,31,.28)'
                    : 'rgba(255,91,31,.22)'
                  : scene
                  ? 'rgba(255,255,255,.1)'
                  : colors.surface.track,
            },
          ]}
        />
      ))}
    </View>
  );
}

// Player level card with the Play streak flame on the right (§28.6).
export function PlayerCard({ player, streak }: { player: PlayPlayer; streak: number }) {
  const { colors, mode } = useThemeV2();
  const lit = streak > 0;
  const progress = levelProgress(player.pointsInLevel, player.pointsToNext);

  return (
    <View style={[styles.playerCard, { backgroundColor: colors.surface.raised }, cardShadow(mode)]}>
      <View style={styles.playerMain}>
        <View style={[styles.levelChip, { backgroundColor: colors.surface.muted }]}>
          <Award size={13} color={colors.text.primary} strokeWidth={2} />
          <TextV2 variant="captionStrong" style={styles.bold}>
            {`Nivel ${player.level} · ${player.title}`}
          </TextV2>
        </View>
        <View style={styles.pointsRow}>
          <TextV2 style={styles.points}>{formatThousands(player.totalPoints)}</TextV2>
          <TextV2 variant="meta" tone="secondary">
            pts
          </TextV2>
        </View>
        <View style={[styles.bar, { backgroundColor: colors.surface.track }]}>
          <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
        </View>
        {player.nextTitle ? (
          <TextV2 variant="caption" tone="secondary">
            {`${formatThousands(player.pointsToNext)} pts para ${player.nextTitle}`}
          </TextV2>
        ) : null}
      </View>
      <View style={styles.flameCol} accessible accessibilityLabel={`Racha de Play: ${streak} días`}>
        <View
          style={[
            styles.flameBox,
            lit
              ? { backgroundColor: EMBER, boxShadow: '0 8px 20px rgba(255,91,31,.3)' }
              : { backgroundColor: mode === 'light' ? '#E3E1DC' : '#2A2826' },
          ]}
        >
          <Flame
            size={30}
            color={lit ? '#FFFFFF' : mode === 'light' ? '#121212' : '#FFFFFF'}
            strokeWidth={2}
            style={lit ? undefined : styles.flameOff}
          />
        </View>
        <TextV2 style={styles.streakValue}>{String(streak)}</TextV2>
        <TextV2 tone="secondary" style={styles.streakLabel} numberOfLines={1}>
          Racha de Play
        </TextV2>
      </View>
    </View>
  );
}

// Challenge of the day: a dark photo card; once done today, "HECHO HOY" and
// "Repetir" (no bonus).
export function DailyCard({
  daily,
  routeTitle,
  best,
  disabled,
  onPress,
}: {
  daily: PlayDailyChallenge;
  routeTitle: string;
  best: number | null;
  disabled: boolean;
  onPress: () => void;
}) {
  const done = daily.doneToday;
  const renews = renewsLabel(daily.renewsInMinutes);

  return (
    <View style={styles.daily}>
      <Image source={ROUTE_PHOTOS[daily.route]} resizeMode="cover" style={[StyleSheet.absoluteFill, styles.dailyPhoto]} />
      <LinearGradient
        colors={['rgba(20,19,18,.55)', 'rgba(20,19,18,.35)', 'rgba(20,19,18,.96)']}
        locations={[0, 0.34, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.dailyTop}>
        <View style={[styles.dailyChip, { backgroundColor: done ? 'rgba(255,255,255,.16)' : EMBER }]}>
          {done ? (
            <Check size={12} color="#FFFFFF" strokeWidth={2.6} />
          ) : (
            <Zap size={12} color="#111111" strokeWidth={2.4} />
          )}
          <TextV2 variant="captionStrong" color={done ? '#FFFFFF' : '#111111'} style={styles.chipText}>
            {done ? 'HECHO HOY' : 'DESAFÍO DEL DÍA'}
          </TextV2>
        </View>
        {renews ? (
          <View style={styles.inline}>
            <Clock size={13} color="rgba(255,255,255,.7)" strokeWidth={2} />
            <TextV2 variant="caption" color="#D8D6D1">
              {renews}
            </TextV2>
          </View>
        ) : null}
      </View>
      <View style={styles.dailyBottom}>
        <View style={styles.gap5}>
          <TextV2 variant="captionStrong" color="#FF8A5C" style={styles.eyebrow}>
            {`${routeTitle.toUpperCase()} · NIVEL ${daily.level}`}
          </TextV2>
          <TextV2 color="#FFFFFF" style={styles.dailyTitle} numberOfLines={2}>
            {daily.levelName}
          </TextV2>
          <TextV2 variant="body" color="#D8D6D1">
            {done
              ? 'Hecho hoy. Mañana mantienes la racha.'
              : `10 preguntas · ~2 min · ${best === null ? 'sin récord' : `récord ${best}/10`}`}
          </TextV2>
        </View>
        <View style={styles.dailyFoot}>
          <View style={styles.inline}>
            <Zap size={14} color="rgba(255,255,255,.8)" strokeWidth={2} />
            <TextV2 variant="meta" color="#D8D6D1">
              {disabled ? 'Conéctate para jugar' : done ? 'Racha de hoy asegurada' : `+${daily.bonusPoints} pts al terminar`}
            </TextV2>
          </View>
          {/* Only the button plays; the card itself is not a target. */}
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            accessibilityLabel={`${done ? 'Repetir' : 'Jugar ahora'}: desafío del día, ${daily.levelName}`}
            disabled={disabled}
            onPress={onPress}
            style={[styles.dailyCta, { backgroundColor: done ? '#FFFFFF' : EMBER }, disabled && styles.off]}
          >
            <TextV2 variant="bodyStrong" color="#111111" style={styles.bold}>
              {done ? 'Repetir' : 'Jugar ahora'}
            </TextV2>
            <ArrowRight size={15} color="#111111" strokeWidth={2.4} />
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

// Route selector: one pill per route with its passed levels.
export function RoutePills({
  routes,
  selected,
  onSelect,
}: {
  routes: PlayRouteView[];
  selected: PlayRoute;
  onSelect: (route: PlayRoute) => void;
}) {
  const { colors, mode, layout } = useThemeV2();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -layout.gutter }}
      contentContainerStyle={[styles.pills, { paddingHorizontal: layout.gutter }]}
    >
      {routes.map(view => {
        const on = view.route === selected;
        const Icon = ROUTE_ICONS[view.route];
        const ink = on ? (mode === 'light' ? '#FFFFFF' : '#121212') : colors.text.primary;
        return (
          <PressableScale
            key={view.route}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(view.route)}
            style={[
              styles.pill,
              on
                ? { backgroundColor: colors.text.primary }
                : {
                    backgroundColor: colors.surface.raised,
                    boxShadow:
                      mode === 'light'
                        ? '0 1px 2px rgba(0,0,0,.04), inset 0 0 0 1px rgba(18,18,18,.07)'
                        : 'inset 0 0 0 1px rgba(255,255,255,.07)',
                  },
            ]}
          >
            <Icon size={18} color={ink} strokeWidth={2} />
            <TextV2 variant="label" color={ink}>
              {view.title}
            </TextV2>
            <TextV2
              variant="label"
              color={on ? (mode === 'light' ? 'rgba(255,255,255,.66)' : 'rgba(18,18,18,.6)') : view.levelsPassed ? colors.text.primary : colors.text.secondary}
              style={styles.pillCount}
            >
              {`· ${view.levelsPassed}/${view.levels.length || 5}`}
            </TextV2>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

function CurrentNode({ level }: { level: number }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1200 }), withTiming(0, { duration: 1200 })),
      -1,
    );
  }, [pulse]);
  const halo = useAnimatedStyle(() => ({
    opacity: 0.4 - pulse.value * 0.25,
    transform: [{ scale: 1 + pulse.value * 0.35 }],
  }));
  return (
    <View style={styles.node}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.nodeHalo, halo]} />
      <View style={[styles.node, styles.nodeCurrent]}>
        <TextV2 color="#F7F6F3" style={styles.nodeNumber}>
          {String(level)}
        </TextV2>
      </View>
    </View>
  );
}

// The 5 levels of the route: passed (Ember check), current (number with a
// pulsing ring) and locked (padlock, "—"). Locked ones do not open.
export function RoutePath({
  view,
  onOpen,
  onLocked,
}: {
  view: PlayRouteView;
  onOpen: (level: PlayLevel) => void;
  onLocked: () => void;
}) {
  const { colors, mode } = useThemeV2();
  const count = Math.max(1, view.levels.length);
  const reached = view.levels.filter(level => level.state !== 'locked').length;
  const lineWidth = count > 1 ? ((Math.max(1, reached) - 1) / (count - 1)) * 80 : 0;

  return (
    <View style={styles.path}>
      <View style={[styles.pathLine, { borderColor: mode === 'light' ? '#D9D6CF' : '#3A3734' }]} />
      <View style={[styles.pathDone, { width: `${lineWidth}%` }]} />
      {view.levels.map(level => {
        const locked = level.state === 'locked';
        const label = locked ? '—' : level.bestScore !== null ? `${level.bestScore}/10` : 'Nuevo';
        return (
          <PressableScale
            key={level.level}
            accessibilityRole="button"
            accessibilityState={{ disabled: locked }}
            accessibilityLabel={`Nivel ${level.level}, ${level.name}${locked ? ', bloqueado' : `, ${bestLabel(level.bestScore)}`}`}
            onPress={() => (locked ? onLocked() : onOpen(level))}
            style={styles.nodeCol}
          >
            {level.state === 'passed' ? (
              <View style={[styles.node, styles.nodeDone]}>
                <Check size={17} color="#111111" strokeWidth={2.6} />
              </View>
            ) : level.state === 'current' ? (
              <CurrentNode level={level.level} />
            ) : (
              <View
                style={[
                  styles.node,
                  {
                    backgroundColor: colors.surface.raised,
                    boxShadow: `inset 0 0 0 1.5px ${mode === 'light' ? '#D9D6CF' : '#3A3734'}`,
                    opacity: 0.7,
                  },
                ]}
              >
                <Lock size={15} color={colors.text.primary} strokeWidth={2} style={styles.lockIcon} />
              </View>
            )}
            <TextV2
              variant="captionStrong"
              color={level.state === 'current' ? colors.text.primary : colors.text.secondary}
              style={styles.nodeLabel}
            >
              {label}
            </TextV2>
          </PressableScale>
        );
      })}
    </View>
  );
}

// Card of the route: the path and the level in play.
export function RouteCard({
  view,
  level,
  disabled,
  onOpen,
  onLocked,
}: {
  view: PlayRouteView;
  level: PlayLevel;
  disabled: boolean;
  onOpen: (level: PlayLevel) => void;
  onLocked: () => void;
}) {
  const { colors, mode } = useThemeV2();
  const need = levelNeedLine(view, level);
  return (
    <View style={[styles.routeCard, { backgroundColor: colors.surface.raised }, cardShadow(mode)]}>
      <View pointerEvents="none" style={styles.routeGlow} />
      <RoutePath view={view} onOpen={onOpen} onLocked={onLocked} />
      <View style={styles.levelBlock}>
        <TextV2 variant="captionStrong" color={EMBER} style={styles.eyebrow} numberOfLines={1}>
          {`${view.title.toUpperCase()} · NIVEL ${level.level} · ${view.completed ? 'COMPLETADA' : 'EN JUEGO'}`}
        </TextV2>
        <View style={styles.levelHead}>
          <TextV2 style={styles.levelName} numberOfLines={2}>
            {level.name}
          </TextV2>
          <View style={styles.best}>
            <TextV2 variant="caption" tone="secondary">
              Mejor puntuación
            </TextV2>
            <TextV2 style={styles.bestValue}>{bestLabel(level.bestScore)}</TextV2>
          </View>
        </View>
        <View style={styles.gap10}>
          <TrackBar best={level.bestScore} />
          {need ? (
            <TextV2 variant="body" tone="secondary">
              <TextV2 variant="bodyStrong" color={EMBER} style={styles.bold}>
                {need.strong}
              </TextV2>
              {need.rest}
            </TextV2>
          ) : null}
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => onOpen(level)}
          style={[styles.levelCta, disabled && styles.off]}
        >
          <TextV2 variant="bodyL" color="#111111" style={styles.bold}>
            {disabled ? 'Conéctate para jugar' : `Jugar nivel ${level.level}`}
          </TextV2>
          {disabled ? null : <ArrowRight size={16} color="#111111" strokeWidth={2.4} />}
        </PressableScale>
      </View>
    </View>
  );
}

const GOAL_ICONS: Record<PlayGoalKey, typeof Star> = {
  play_5_days: Calendar,
  streak_5: Flame,
  perfect_10: Star,
};

const RING = 62;
const RING_R = 27;
const RING_C = 2 * Math.PI * RING_R;

// Objetivos de la semana: three rings; a met one turns into an Ember check.
export function WeeklyGoals({ goals }: { goals: PlayGoal[] }) {
  const { colors, mode } = useThemeV2();
  return (
    <View style={styles.goals}>
      {goals.map(goal => {
        const Icon = goal.done ? Check : GOAL_ICONS[goal.goal];
        const share = goal.done ? 1 : Math.min(1, goal.progress / goal.target);
        return (
          <View
            key={goal.goal}
            style={styles.goal}
            accessible
            accessibilityLabel={`${GOAL_LABELS[goal.goal]}: ${goal.done ? 'hecho' : `${goal.progress} de ${goal.target}`}`}
          >
            <View style={styles.goalRing}>
              <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
                <Circle cx={RING / 2} cy={RING / 2} r={RING_R} stroke={colors.surface.track} strokeWidth={5} fill="none" />
                {share > 0 ? (
                  <Circle
                    cx={RING / 2}
                    cy={RING / 2}
                    r={RING_R}
                    stroke={EMBER}
                    strokeWidth={5}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${RING_C * share} ${RING_C}`}
                    transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
                  />
                ) : null}
              </Svg>
              <View
                style={[
                  styles.goalCore,
                  { backgroundColor: goal.done ? EMBER : mode === 'light' ? '#EFEEEA' : '#262422' },
                ]}
              >
                <Icon size={18} color={goal.done ? '#111111' : colors.text.primary} strokeWidth={2} />
              </View>
            </View>
            <TextV2 variant="metaStrong" align="center" style={styles.goalTitle}>
              {GOAL_LABELS[goal.goal]}
            </TextV2>
            <TextV2 variant="caption" tone="secondary" align="center">
              {`${Math.min(goal.progress, goal.target)}/${goal.target} · `}
              <TextV2 variant="captionStrong" color={goal.done ? EMBER : colors.text.primary} style={styles.bold}>
                {goal.done ? 'Hecho' : `+${goal.points}`}
              </TextV2>
            </TextV2>
          </View>
        );
      })}
    </View>
  );
}

// "Sin conexión": the portada shows the last data in cache and the play
// buttons wait for the connection.
export function OfflineNotice() {
  const { colors } = useThemeV2();
  return (
    <View style={[styles.offline, { backgroundColor: colors.surface.muted }]} accessibilityLiveRegion="polite">
      <WifiOff size={14} color={colors.text.secondary} strokeWidth={2} />
      <TextV2 variant="meta" tone="secondary">
        Sin conexión · Conéctate para jugar
      </TextV2>
    </View>
  );
}

export function PlayHomeSkeleton() {
  return (
    <SkeletonGroup>
      <View style={styles.gap22}>
        <Skeleton height={124} radius={20} />
        <Skeleton height={262} radius={26} />
        <Skeleton width={120} height={24} />
        <Skeleton height={320} radius={24} />
      </View>
    </SkeletonGroup>
  );
}

function cardShadow(mode: string) {
  return {
    boxShadow:
      mode === 'light'
        ? '0 1px 2px rgba(0,0,0,.04), 0 10px 28px rgba(0,0,0,.06)'
        : 'inset 0 0 0 1px rgba(255,255,255,.06)',
  };
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  off: { opacity: 0.5 },
  gap5: { gap: 5 },
  gap10: { gap: 10 },
  gap22: { gap: 22 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.88 },
  trackBar: { flexDirection: 'row', gap: 3, height: 10 },
  trackCell: { flex: 1, borderRadius: 3 },
  playerCard: {
    borderRadius: 20,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 104,
  },
  playerMain: { gap: 10 },
  levelChip: {
    alignSelf: 'flex-start',
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  points: { fontSize: 24, lineHeight: 26, fontWeight: '700', letterSpacing: -0.72 },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: EMBER },
  flameCol: {
    position: 'absolute',
    right: 16,
    top: 14,
    bottom: 14,
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  flameBox: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  flameOff: { opacity: 0.6 },
  streakValue: { fontSize: 22, lineHeight: 24, fontWeight: '700', letterSpacing: -0.66 },
  streakLabel: { fontSize: 10.5, lineHeight: 13 },
  daily: {
    height: 262,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#141312',
    boxShadow: '0 18px 40px rgba(0,0,0,.18)',
  },
  dailyPhoto: { opacity: 0.62 },
  dailyTop: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dailyChip: {
    height: 26,
    paddingHorizontal: 11,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.66 },
  dailyBottom: { position: 'absolute', left: 16, right: 16, bottom: 16, gap: 14 },
  dailyTitle: { fontSize: 26, lineHeight: 29, fontWeight: '700', letterSpacing: -0.52 },
  dailyFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dailyCta: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 8px 20px rgba(255,91,31,.3)',
  },
  pills: { gap: 8, paddingVertical: 2 },
  pill: {
    height: 40,
    paddingLeft: 11,
    paddingRight: 15,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pillCount: { fontWeight: '500', fontVariant: ['tabular-nums'] },
  routeCard: { borderRadius: 24, padding: 18, gap: 20, overflow: 'hidden' },
  routeGlow: {
    position: 'absolute',
    right: -60,
    top: -90,
    width: 240,
    height: 200,
    borderRadius: 120,
    backgroundColor: 'rgba(255,91,31,.06)',
    boxShadow: '0 0 60px 30px rgba(255,91,31,.06)',
  },
  path: { flexDirection: 'row', alignItems: 'flex-start' },
  pathLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: 19,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  pathDone: { position: 'absolute', left: '10%', top: 19, height: 2, backgroundColor: EMBER },
  nodeCol: { flex: 1, alignItems: 'center', gap: 7 },
  node: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: EMBER, boxShadow: '0 4px 12px rgba(255,91,31,.28)' },
  nodeHalo: { borderRadius: 20, backgroundColor: EMBER },
  nodeCurrent: { backgroundColor: '#121212', boxShadow: `0 0 0 3px ${EMBER}` },
  nodeNumber: { fontSize: 17, lineHeight: 20, fontWeight: '700' },
  lockIcon: { opacity: 0.55 },
  nodeLabel: { fontSize: 11, fontVariant: ['tabular-nums'] },
  levelBlock: { gap: 16 },
  levelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: -6 },
  levelName: { flex: 1, fontSize: 21, lineHeight: 25, fontWeight: '700', letterSpacing: -0.3 },
  best: { alignItems: 'flex-end', gap: 4 },
  bestValue: { fontSize: 22, lineHeight: 24, fontWeight: '700', letterSpacing: -0.44, fontVariant: ['tabular-nums'] },
  levelCta: {
    height: 52,
    borderRadius: 26,
    backgroundColor: EMBER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 10px 24px rgba(255,91,31,.28)',
  },
  goals: { flexDirection: 'row', gap: 10 },
  goal: { flex: 1, alignItems: 'center', gap: 8 },
  goalRing: { width: RING, height: RING },
  goalCore: {
    position: 'absolute',
    left: 10,
    top: 10,
    right: 10,
    bottom: 10,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: { lineHeight: 17 },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
});
