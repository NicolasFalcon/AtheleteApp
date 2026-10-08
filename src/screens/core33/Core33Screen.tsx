import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Award, MoreHorizontal } from 'lucide-react-native';
import {
  BackButton,
  Button,
  CapsuleGrid,
  Celebration,
  IconButton,
  PressableScale,
  Sheet,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { challengeOfHabits } from '@app/features/core33/core33Catalog';
import {
  buildCore33DayView,
  leftUnit,
} from '@app/features/core33/core33Model';
import { useCore33Day } from '@app/features/core33/useCore33Day';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  ChallengeArt,
  HabitButton,
  StatsRow,
} from '@app/features/core33/v2/Core33Parts';
import { useCore33 } from '@app/hooks/useCore33';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'Core33'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Core 33, the day (CORE33_05 / 06): the big number of closed days, the 33
// cells, the streaks and "Hoy" with the three habits (tap to mark, tap again
// to undo). Completing day 33 shows the celebration; the challenge can be
// left from the menu (with confirmation) to choose another.
export function Core33Screen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const dev = __DEV__ ? route.params?.devState : undefined;
  const [celebrate, setCelebrate] = useState(dev === 'celebration');
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { abandonChallenge } = useCore33();
  const day = useCore33Day({ onChallengeCompleted: () => setCelebrate(true) });
  const { state } = day;

  // Development: a sample participation (nothing is read or written).
  const sample = useMemo(() => {
    if (!__DEV__ || !dev || dev === 'none' || dev === 'loading' || dev === 'error') {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fx = require('@app/dev/core33Fixtures') as typeof import('@app/dev/core33Fixtures');
    return fx.core33Fixture(dev === 'celebration' ? 'completed' : dev);
  }, [dev]);

  const challenge = sample ? sample.challenge : state?.challenge ?? null;
  const logs = sample ? sample.habitLogs : state?.habitLogs ?? {};
  const view = challenge
    ? buildCore33DayView({
        challenge,
        habitLogs: logs,
        overrides: sample ? undefined : day.overrides,
      })
    : null;
  const art = challenge ? challengeOfHabits(challenge.habits) : null;

  const loading = dev === 'loading' || (!dev && day.stateQuery.isLoading);
  const failed = dev === 'error' || (!dev && Boolean(day.stateQuery.error));
  const none = dev === 'none' || (!dev && !loading && !failed && !challenge);

  const leave = async () => {
    setLeaving(true);
    try {
      if (!dev) {
        await abandonChallenge();
      }
      navigation.reset({
        index: 1,
        routes: [{ name: ROOT_ROUTES.MainTabs }, { name: APP_ROUTES.Core33Explore }],
      } as never);
    } catch (error) {
      console.warn('[core33] No se pudo dejar el reto:', error);
      toast.show('No pudimos dejar el reto', { tone: 'error' });
      setLeaving(false);
    }
  };

  if (loading || failed || none || !view) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <StatusBarV2 />
        <View style={[styles.plainTop, { paddingTop: insets.top + 8, paddingHorizontal: layout.gutter }]}>
          <BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />
        </View>
        <View style={[styles.plain, { paddingHorizontal: layout.gutter }]}>
          {failed ? (
            <BlockError message="No pudimos cargar tu Core 33." onRetry={() => day.stateQuery.refetch()} />
          ) : loading ? (
            <SkeletonGroup>
              <View style={styles.skeleton}>
                <Skeleton width={160} height={90} radius={16} />
                <Skeleton height={110} radius={16} />
                <Skeleton height={140} radius={20} />
              </View>
            </SkeletonGroup>
          ) : (
            <View style={styles.none}>
              <TextV2 variant="title22">Aún no tienes un Core 33</TextV2>
              <TextV2 variant="body" tone="secondary">
                Elige un reto de 33 días con tres hábitos cada día.
              </TextV2>
              <Button label="Explorar retos" onPress={() => navigation.navigate(APP_ROUTES.Core33Explore)} fullWidth />
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <SceneScope>
          <View style={styles.hero}>
            {art ? (
              <View style={styles.art}>
                <ChallengeArt challenge={art} />
              </View>
            ) : null}
            <LinearGradient
              colors={['rgba(20,19,18,.55)', 'rgba(20,19,18,.9)', '#141312']}
              locations={[0, 0.45, 0.7]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
              <BackButton variant="glass" onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />
              {!view.completed ? (
                <IconButton icon={MoreHorizontal} variant="glass" accessibilityLabel="Más opciones" onPress={() => setMenu(true)} />
              ) : null}
            </View>
            <View style={styles.heroBody}>
              <TextV2 variant="eyebrow" color="#A8A6A1">
                {`Core 33 · ${view.overline}`}
              </TextV2>
              <View style={styles.big}>
                <TextV2 variant="title28" color="#FFFFFF" style={styles.bigNumber} accessibilityRole="header">
                  {view.closed}
                </TextV2>
                <TextV2 variant="title22" color="#A8A6A1" style={styles.bigTotal}>
                  {`/ ${view.total}`}
                </TextV2>
              </View>
              {view.sub ? (
                <TextV2 variant="bodyL" color="#D8D6D1">
                  {view.sub}
                </TextV2>
              ) : null}
              <View style={styles.grid}>
                <CapsuleGrid states={view.capsules} showEnds />
              </View>
              <View style={styles.stats}>
                <StatsRow
                  items={[
                    { value: String(view.streak), unit: leftUnit(view.streak), label: 'Racha actual' },
                    { value: String(view.longest), unit: leftUnit(view.longest), label: 'Mejor racha' },
                    { value: String(view.left), unit: leftUnit(view.left), label: 'Por cerrar' },
                  ]}
                />
              </View>
              {view.missedLine ? (
                <TextV2 variant="meta" color="#A8A6A1" style={styles.missed}>
                  {view.missedLine}
                </TextV2>
              ) : null}
            </View>
          </View>
        </SceneScope>

        <View style={[styles.sheet, { backgroundColor: colors.bg, paddingHorizontal: layout.gutter }]}>
          <View style={styles.sheetHead}>
            <TextV2 variant="section">{view.todayTitle}</TextV2>
            <TextV2 variant="meta" tone="secondary">{`${view.doneCount} de ${view.habits.length}`}</TextV2>
          </View>
          <TextV2 variant="meta" tone="secondary">
            {view.todayHint}
          </TextV2>
          <View style={styles.habits}>
            {view.habits.map(habit => (
              <HabitButton
                key={habit.index}
                pillar={habit.pillar}
                text={habit.text}
                done={habit.done}
                disabled={view.completed || Boolean(sample)}
                onPress={() => day.toggle(habit.index)}
              />
            ))}
          </View>
          {view.completed ? (
            <View style={[styles.done, { borderTopColor: colors.divider }]}>
              <TextV2 variant="bodyL">
                Terminaste este compromiso. Puedes descansar unos días o elegir el siguiente cuando quieras.
              </TextV2>
              {/* achievement with the participation as source: `core33:<id>` (create_post). */}
              {challenge && 'id' in challenge && typeof challenge.id === 'string' && !sample ? (
                <Button
                  label="Compartir logro"
                  variant="secondary"
                  onPress={() =>
                    navigation.navigate(APP_ROUTES.SocialCompose, {
                      attach: 'achievement',
                      sourceId: `core33:${challenge.id}`,
                    })
                  }
                  fullWidth
                />
              ) : null}
              <Button label="Explorar otro Core 33" onPress={() => navigation.navigate(APP_ROUTES.Core33Explore)} fullWidth />
              <PressableScale accessibilityRole="button" onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} style={styles.home}>
                <TextV2 variant="bodyStrong">Volver a Inicio</TextV2>
              </PressableScale>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Celebration
        visible={celebrate}
        icon={Award}
        eyebrow="Reto completado"
        value="33"
        unit="de 33 días"
        subtitle={view.missed === 0 ? 'Core 33 cerrado sin fallar un día' : 'Core 33 completado'}
        onClose={() => setCelebrate(false)}
      />

      <Sheet open={menu} onClose={() => setMenu(false)} title="Core 33">
        <PressableScale
          accessibilityRole="button"
          onPress={() => {
            setMenu(false);
            // iOS does not present a modal while another is dismissing.
            setTimeout(() => setConfirm(true), 350);
          }}
          style={styles.menuRow}
        >
          <TextV2 variant="cta" color={colors.ember.deep}>
            Dejar este reto
          </TextV2>
        </PressableScale>
      </Sheet>

      <Sheet
        open={confirm}
        onClose={() => !leaving && setConfirm(false)}
        title="¿Dejar este reto?"
        footer={
          <Button label="Dejar el reto" loading={leaving} loadingLabel="Dejando…" onPress={leave} style={styles.flex} />
        }
      >
        <TextV2 variant="body" tone="secondary">
          Tu progreso de este reto se queda en el historial y podrás elegir otro cuando quieras. No se puede deshacer.
        </TextV2>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  plainTop: { paddingBottom: 8 },
  plain: { paddingTop: 12 },
  skeleton: { gap: 22 },
  none: { gap: 14, paddingTop: 24 },
  hero: { backgroundColor: '#141312', paddingBottom: 50 },
  art: { ...({ position: 'absolute', top: 0, left: 0, right: 0, height: 360 } as object), overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  heroBody: { paddingHorizontal: 20, paddingTop: 18, gap: 8 },
  big: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bigNumber: { fontSize: 140, lineHeight: 140, fontWeight: '700', letterSpacing: -6 },
  bigTotal: { paddingBottom: 18 },
  grid: { marginTop: 12 },
  stats: { marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.14)' },
  missed: { marginTop: 6 },
  sheet: { marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 26, gap: 6 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  habits: { flexDirection: 'row', gap: 8, paddingTop: 22 },
  done: { marginTop: 28, paddingTop: 22, borderTopWidth: 1, gap: 16 },
  home: { alignItems: 'center', height: 44, justifyContent: 'center' },
  menuRow: { paddingVertical: 16 },
});
