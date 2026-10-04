import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import {
  CapsuleGrid,
  IconButton,
  PressableScale,
  StatusBarV2,
  TextV2,
  type CapsuleCellState,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { findChallenge } from '@app/features/core33/core33Catalog';
import { ChallengeArt, HabitLine } from '@app/features/core33/v2/Core33Parts';
import { startGuard } from '@app/features/core33/core33Model';
import { useCore33 } from '@app/hooks/useCore33';
import { Core33AlreadyActiveError } from '@app/services/supabase/core33';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'Core33Ready'>;

const EMPTY: CapsuleCellState[] = Array.from({ length: 33 }, (_, i) =>
  i === 0 ? 'today' : 'open',
);

// Tu Core 33 está listo (CORE33_04): the challenge is chosen but Day 1 has
// not started. "Comenzar Día 1" creates the participation (guardando / error
// in the button); "Empezar más tarde" leaves without creating anything (the
// backend has no "prepared" state yet, BT-01).
export function Core33ReadyScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { startChallenge, stateQuery } = useCore33();
  const challenge = findChallenge(route.params.challengeId);
  const [starting, setStarting] = useState(Boolean(__DEV__ && route.params.devStarting));
  const [failed, setFailed] = useState(false);
  const cachedActive =
    startGuard(stateQuery.data?.challenge ? [stateQuery.data.challenge] : []) ===
    'alreadyActive';
  const [alreadyActive, setAlreadyActive] = useState(
    Boolean(__DEV__ && route.params.devAlreadyActive),
  );

  if (!challenge) {
    return <View style={styles.screen} />;
  }

  const goHome = () =>
    navigation.reset({
      index: 0,
      routes: [{ name: ROOT_ROUTES.MainTabs as never }],
    } as never);

  // Opens the challenge that is already running.
  const openActive = () =>
    navigation.reset({
      index: 1,
      routes: [{ name: ROOT_ROUTES.MainTabs }, { name: APP_ROUTES.Core33 }],
    } as never);

  const start = async () => {
    if (starting) {
      return;
    }
    if (cachedActive || alreadyActive) {
      setAlreadyActive(true);
      return;
    }
    setFailed(false);
    setStarting(true);
    try {
      await startChallenge(challenge.id);
      navigation.reset({
        index: 1,
        routes: [{ name: ROOT_ROUTES.MainTabs }, { name: APP_ROUTES.Core33 }],
      } as never);
    } catch (error) {
      if (error instanceof Core33AlreadyActiveError) {
        setAlreadyActive(true);
      } else {
        console.warn('[core33] No se pudo empezar el reto:', error);
        setFailed(true);
      }
      setStarting(false);
    }
  };

  return (
    <SceneScope>
      <View style={styles.screen}>
        <StatusBarV2 style="light" />
        <ChallengeArt challenge={challenge} />
        <LinearGradient
          colors={['rgba(20,19,18,.45)', 'rgba(20,19,18,.55)', '#141312']}
          locations={[0, 0.4, 0.78]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <IconButton icon={X} variant="glass" accessibilityLabel="Cerrar" onPress={goHome} />
          <PressableScale
            accessibilityRole="button"
            onPress={() => navigation.navigate(APP_ROUTES.Core33Explore)}
            style={styles.change}
          >
            <TextV2 variant="bodyStrong" color="#FFFFFF">
              Cambiar reto
            </TextV2>
          </PressableScale>
        </View>

        <View style={styles.content}>
          <View style={styles.eyebrow}>
            <View style={styles.dot} />
            <TextV2 variant="metaStrong" color="#D8D6D1">
              Tu Core 33 está listo
            </TextV2>
          </View>
          <TextV2 variant="title28" color="#FFFFFF" style={styles.name} accessibilityRole="header">
            {challenge.name}
          </TextV2>
          <TextV2 variant="bodyL" color="#A8A6A1">
            33 días · 3 hábitos diarios
          </TextV2>
          <View style={styles.grid}>
            <CapsuleGrid states={EMPTY} showEnds />
          </View>
          <View style={styles.habits}>
            {challenge.habits.map(habit => (
              <HabitLine key={habit.pillar} pillar={habit.pillar} text={habit.text} onDark />
            ))}
          </View>
        </View>

        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {alreadyActive || cachedActive ? (
            <TextV2 variant="meta" color="#FF8A5C" align="center" accessibilityLiveRegion="polite">
              Ya tienes un Core 33 activo. Termínalo o déjalo antes de empezar otro.
            </TextV2>
          ) : failed ? (
            <TextV2 variant="meta" color="#FF8A5C" align="center" accessibilityLiveRegion="polite">
              No pudimos empezar tu reto. Revisa tu conexión e inténtalo de nuevo.
            </TextV2>
          ) : null}
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ busy: starting }}
            disabled={starting}
            onPress={alreadyActive || cachedActive ? openActive : start}
            style={[styles.cta, { opacity: starting ? 0.8 : 1 }]}
          >
            <TextV2 variant="cta" color="#121212">
              {starting
                ? 'Empezando…'
                : alreadyActive || cachedActive
                ? 'Ir a mi reto'
                : failed
                ? 'Reintentar'
                : 'Comenzar Día 1'}
            </TextV2>
          </PressableScale>
          <PressableScale accessibilityRole="button" disabled={starting} onPress={goHome} style={styles.later}>
            <TextV2 variant="bodyStrong" color="#FFFFFF">
              Empezar más tarde
            </TextV2>
          </PressableScale>
        </View>
      </View>
    </SceneScope>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#141312' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  change: { height: 44, justifyContent: 'center', paddingHorizontal: 4 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 6 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF5B1F' },
  name: { fontSize: 44, lineHeight: 48, fontWeight: '600', letterSpacing: -1 },
  grid: { marginTop: 28 },
  habits: { marginTop: 20, gap: 2 },
  bottom: { paddingHorizontal: 20, gap: 10 },
  cta: { height: 56, borderRadius: 28, backgroundColor: '#FF5B1F', alignItems: 'center', justifyContent: 'center' },
  later: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
