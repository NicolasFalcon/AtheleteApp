import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Flame, Timer, Zap } from 'lucide-react-native';
import { IconButton, PressableScale, StatusBarV2, TextV2 } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import {
  bestLabel,
  findLevel,
  findRoute,
  levelNeedLine,
  ROUTE_TITLES,
} from '@app/features/play/playModel';
import { usePlayHome, useStartRound } from '@app/features/play/usePlay';
import { TrackBar } from '@app/features/play/v2/PlayHomeParts';
import { ROUTE_ICONS } from '@app/features/play/v2/playVisuals';
import { playSound } from '@app/features/sound/soundService';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'PlayLevel'>;

// Play · inicio de nivel (§28.6.1): a dark scene with the route's icon, the
// level and its name, the best score in 10 segments, the goal and, for the
// challenge of the day, "+50 al terminar". "Empezar" asks the server for the
// round (start_play_round, idempotent by client round id).
export function PlayLevelScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const homeQuery = usePlayHome();
  const home = homeQuery.data;
  const view = findRoute(home, route.params.route);
  const level = findLevel(view, route.params.level);
  const Icon = ROUTE_ICONS[route.params.route];
  const daily = home?.dailyChallenge;
  const isDaily =
    route.params.isDaily &&
    Boolean(daily && !daily.doneToday && daily.route === route.params.route && daily.level === route.params.level);
  const need = view && level ? levelNeedLine(view, level) : null;
  const { start: startRound, starting, error } = useStartRound();
  const locked = level?.state === 'locked';

  const start = async () => {
    if (locked) {
      playSound('play-locked');
      return;
    }
    if (starting) {
      return;
    }
    const round = await startRound({ route: route.params.route, level: route.params.level, isDaily });
    if (round) {
      navigation.navigate(APP_ROUTES.PlayRound, { round });
    }
  };

  const goal = need ? `${need.strong}${need.rest}` : 'Haz 8 de 10 para avanzar.';

  return (
    <SceneScope>
      <View style={styles.screen}>
        <StatusBarV2 style="light" />
        <View pointerEvents="none" style={styles.glow} />
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <IconButton
            icon={ArrowLeft}
            variant="glass"
            accessibilityLabel="Volver"
            onPress={() => safeGoBack(navigation, [APP_ROUTES.PlayHome])}
          />
        </View>

        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 18 }]}>
          <View style={styles.icon}>
            <Icon size={34} color="#FFFFFF" strokeWidth={1.8} />
          </View>
          <View style={styles.head}>
            <TextV2 variant="captionStrong" color="#FF8A5C" style={styles.eyebrow}>
              {`${(view?.title ?? ROUTE_TITLES[route.params.route]).toUpperCase()} · NIVEL ${route.params.level} DE ${
                view?.levels.length || 5
              }`}
            </TextV2>
            <TextV2 color="#FFFFFF" style={styles.name} accessibilityRole="header">
              {level?.name ?? (isDaily ? daily?.levelName : '') ?? ''}
            </TextV2>
            {view?.subtitle ? (
              <TextV2 variant="body" color="#A8A6A1">
                {view.subtitle}
              </TextV2>
            ) : null}
          </View>

          {isDaily && daily ? (
            <View style={styles.dailyChip}>
              <Zap size={12} color="#111111" strokeWidth={2.4} />
              <TextV2 variant="captionStrong" color="#111111" style={styles.dailyText}>
                {`DESAFÍO DEL DÍA · +${daily.bonusPoints} AL TERMINAR`}
              </TextV2>
            </View>
          ) : null}

          <View style={styles.record}>
            <View style={styles.recordRow}>
              <TextV2 variant="meta" color="#A8A6A1">
                Tu récord
              </TextV2>
              <TextV2 variant="sub" color="#FFFFFF" style={styles.bold}>
                {bestLabel(level?.bestScore ?? null)}
              </TextV2>
            </View>
            <TrackBar best={level?.bestScore ?? null} scene />
            <TextV2 variant="body" color="#D8D6D1">
              {goal}
            </TextV2>
          </View>

          <View style={styles.rules}>
            <Rule icon={Flame} label="3 seguidos ×2" />
            <Rule icon={Zap} label="5 seguidos ×3" />
            <Rule icon={Timer} label="15 s" />
          </View>

          {error ? (
            <TextV2 variant="meta" color="#FF8A5C" align="center" accessibilityLiveRegion="polite">
              {error}
            </TextV2>
          ) : null}

          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ disabled: locked || starting, busy: starting }}
            disabled={starting}
            onPress={start}
            style={[styles.cta, (locked || starting) && styles.ctaOff]}
          >
            <TextV2 variant="cta" color="#111111" style={styles.bold}>
              {locked ? 'Nivel bloqueado' : starting ? 'Preparando…' : 'Empezar'}
            </TextV2>
            {locked || starting ? null : <ArrowRight size={18} color="#111111" strokeWidth={2.4} />}
          </PressableScale>
        </View>
      </View>
    </SceneScope>
  );
}

function Rule({ icon: Icon, label }: { icon: typeof Flame; label: string }) {
  return (
    <View style={styles.rule}>
      <Icon size={13} color="rgba(255,255,255,.7)" strokeWidth={2} />
      <TextV2 variant="caption" color="#D8D6D1">
        {label}
      </TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#121110' },
  glow: {
    position: 'absolute',
    left: -80,
    right: -80,
    top: -260,
    height: 520,
    borderRadius: 400,
    backgroundColor: 'rgba(255,91,31,.08)',
    boxShadow: '0 0 160px 80px rgba(255,91,31,.1)',
  },
  top: { paddingHorizontal: 16, alignItems: 'flex-start' },
  content: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, gap: 22 },
  icon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: 'rgba(255,91,31,.14)',
    boxShadow: 'inset 0 0 0 1.5px rgba(255,91,31,.55), 0 14px 40px rgba(255,91,31,.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: { gap: 6 },
  eyebrow: { fontWeight: '700', letterSpacing: 0.96 },
  name: { fontSize: 36, lineHeight: 38, fontWeight: '700', letterSpacing: -1.08 },
  dailyChip: {
    alignSelf: 'flex-start',
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FF5B1F',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dailyText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.66 },
  record: {
    gap: 10,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.05)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)',
  },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  bold: { fontWeight: '700' },
  rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rule: {
    height: 32,
    paddingHorizontal: 11,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,.07)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cta: {
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FF5B1F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    boxShadow: '0 12px 30px rgba(255,91,31,.32)',
  },
  ctaOff: { opacity: 0.5 },
});
