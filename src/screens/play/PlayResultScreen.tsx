import { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Check, Flame, RotateCcw, Star, X } from 'lucide-react-native';
import {
  IconButton,
  PressableScale,
  ProgressRing,
  StatusBarV2,
  TextV2,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import {
  celebrationCopy,
  MEDAL_LABELS,
  nextChallengeTarget,
  resultFx,
  resultHead,
  resultLevelBar,
  resultRewards,
} from '@app/features/play/playModel';
import { usePlayHome, useStartRound, useSubmitRound } from '@app/features/play/usePlay';
import { usePlayResultShow } from '@app/features/play/usePlayResultShow';
import {
  MedalChip,
  NextObjective,
  PlayCelebration,
  RecordLine,
  ResultFx,
  ResultTile,
  ReviewTopics,
  RewardsCard,
  SaveNotice,
} from '@app/features/play/v2/ResultParts';
import { routeTitleOf } from '@app/features/play/v2/playVisuals';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'PlayResult'>;

// Play · resultado (§28.6.1): the round goes to the persistent queue and to
// submit_play_round. Everything shown after that is the server's answer:
// score ring /10 and medal, record, the rewards (desafío, racha, nivel,
// objetivos, logro), the player bar, the next objective and the topics to
// review, then the celebration it names (level up > unlock > record). Without
// connection only the round's own score is shown with "Guardaremos tu
// resultado al reconectar" (no rewards). A scene: dark in both modes.
export function PlayResultScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { round, answers, finishedAt, tz, localScore, localBestStreak } = route.params;
  const item = useRef({ roundId: round.roundId, answers, finishedAt, tz, queuedAt: new Date().toISOString() });
  const { state, retry } = useSubmitRound(item.current);
  const homeQuery = usePlayHome();
  const routeTitle = routeTitleOf(homeQuery.data);
  const { start, starting, error: startError } = useStartRound();

  const result = state.status === 'saved' ? state.result : null;
  const show = usePlayResultShow(result);
  const score = result?.score ?? localScore;
  const fx = resultFx(score);
  const rewards = useMemo(() => (result ? resultRewards(result, routeTitle) : []), [result, routeTitle]);
  const bar = result ? resultLevelBar(result) : null;
  const celebration = result ? celebrationCopy(result, round.levelName) : null;

  const exit = () => navigation.popTo(APP_ROUTES.PlayHome);
  const again = async () => {
    const next = await start({ route: round.route, level: round.level, isDaily: false });
    if (next) {
      navigation.replace(APP_ROUTES.PlayRound, { round: next });
    }
  };
  const target = result?.unlocked
    ? { route: result.unlocked.route, level: result.unlocked.level, isDaily: false }
    : nextChallengeTarget(homeQuery.data, round.route, round.isDailyChallenge);
  const primaryLabel = result?.unlocked
    ? `Jugar nivel ${result.unlocked.level} · ${result.unlocked.levelName}`
    : 'Siguiente desafío';
  const goNext = () => target && navigation.replace(APP_ROUTES.PlayLevel, target);
  const busy = state.status === 'saving';

  return (
    <SceneScope>
      <View style={styles.screen}>
        <StatusBarV2 style="light" />
        <View style={[styles.close, { top: insets.top + 8 }]}>
          <IconButton icon={X} variant="glass" size={36} accessibilityLabel="Salir" onPress={exit} />
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 56 }]}
        >
          <View style={styles.head}>
            <TextV2 color="#FFFFFF" align="center" style={styles.title} accessibilityRole="header">
              {resultHead(score)}
            </TextV2>
            <TextV2 variant="body" color="#A8A6A1" align="center">
              {`Has completado la ronda · ${routeTitle(round.route)} ${round.level}`}
            </TextV2>
          </View>

          <View style={styles.ringWrap}>
            <ResultFx glow={fx.glow} bursts={result ? fx.bursts : []} />
            <ProgressRing size={172} strokeWidth={12} progress={score / 10} duration={1100}>
              <TextV2 color="#FFFFFF" style={styles.score}>
                {String(score)}
              </TextV2>
              <TextV2 variant="body" color="#A8A6A1">
                de 10
              </TextV2>
            </ProgressRing>
          </View>
          {result?.medal ? <MedalChip label={MEDAL_LABELS[result.medal]} /> : null}

          {result ? (
            <>
              <View style={styles.tiles}>
                <ResultTile icon={Star} value={`+${show.count ?? result.roundPoints}`} label="Puntos" delay={500} />
                <ResultTile icon={Flame} value={`×${result.maxStreak}`} label="Racha máx." delay={600} />
                <ResultTile icon={Check} value={`${result.bestScore.after}/10`} label="Mejor" delay={700} />
              </View>
              <RecordLine
                isNew={result.bestScore.newRecord}
                before={result.bestScore.before}
                after={result.bestScore.after}
              />
              {bar ? <RewardsCard rows={rewards} bar={bar} /> : null}
              {result.reviewTopics.length > 0 ? <ReviewTopics topics={result.reviewTopics} /> : null}
              {result.nextObjective ? <NextObjective text={result.nextObjective} /> : null}
            </>
          ) : (
            <>
              <View style={styles.tiles}>
                <ResultTile icon={Flame} value={`×${localBestStreak}`} label="Racha máx." delay={300} />
              </View>
              <SaveNotice
                kind={state.status === 'error' ? 'error' : state.status === 'queued' ? 'queued' : 'saving'}
                message={state.status === 'error' ? 'No pudimos guardar tu resultado. Esta ronda no cuenta.' : undefined}
              />
              {state.status === 'queued' ? (
                <PressableScale accessibilityRole="button" onPress={retry} style={styles.retry}>
                  <TextV2 variant="bodyStrong" color="#FFFFFF">
                    Reintentar ahora
                  </TextV2>
                </PressableScale>
              ) : null}
            </>
          )}
        </ScrollView>

        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
          {startError ? (
            <TextV2 variant="meta" color="#FF8A5C" align="center">
              {startError}
            </TextV2>
          ) : null}
          {result && target ? (
            <PressableScale accessibilityRole="button" onPress={goNext} style={styles.primary}>
              <TextV2 variant="cta" color="#111111" style={styles.bold} numberOfLines={1}>
                {primaryLabel}
              </TextV2>
              <ArrowRight size={17} color="#111111" strokeWidth={2.4} />
            </PressableScale>
          ) : null}
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || starting }}
            disabled={busy || starting}
            onPress={again}
            style={[styles.secondary, (busy || starting) && styles.off]}
          >
            <RotateCcw size={16} color="#FFFFFF" strokeWidth={2} />
            <TextV2 variant="bodyL" color="#FFFFFF" style={styles.semibold}>
              {starting ? 'Preparando…' : 'Otra ronda'}
            </TextV2>
          </PressableScale>
          <PressableScale accessibilityRole="button" onPress={exit} style={styles.exit}>
            <TextV2 variant="bodyStrong" color="#A8A6A1">
              Salir
            </TextV2>
          </PressableScale>
        </View>

        {show.celebrating && celebration ? (
          <PlayCelebration eyebrow={celebration.eyebrow} title={celebration.title} onClose={show.closeCelebration} />
        ) : null}
      </View>
    </SceneScope>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#121110' },
  close: { position: 'absolute', left: 16, zIndex: 6 },
  content: { paddingHorizontal: 20, paddingBottom: 14, alignItems: 'center', gap: 16 },
  head: { alignItems: 'center', gap: 6 },
  title: { fontSize: 34, lineHeight: 37, fontWeight: '700', letterSpacing: -1 },
  ringWrap: { width: 172, height: 172, marginTop: 6, marginBottom: 4, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 60, lineHeight: 62, fontWeight: '700', letterSpacing: -3 },
  tiles: { alignSelf: 'stretch', flexDirection: 'row', gap: 8 },
  retry: { height: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.08)' },
  bottom: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  primary: {
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FF5B1F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    boxShadow: '0 12px 30px rgba(255,91,31,.3)',
  },
  secondary: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.8)',
  },
  exit: { height: 36, alignItems: 'center', justifyContent: 'center' },
  bold: { fontWeight: '700', flexShrink: 1 },
  semibold: { fontWeight: '600' },
  off: { opacity: 0.5 },
});
