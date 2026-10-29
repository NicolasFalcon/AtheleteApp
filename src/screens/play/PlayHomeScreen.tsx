import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackButton,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import { findLevel, findRoute, routeFocusLevel } from '@app/features/play/playModel';
import { usePlayHome } from '@app/features/play/usePlay';
import {
  DailyCard,
  OfflineNotice,
  PlayerCard,
  PlayHomeSkeleton,
  RouteCard,
  RoutePills,
  WeeklyGoals,
} from '@app/features/play/v2/PlayHomeParts';
import { routeTitleOf } from '@app/features/play/v2/playVisuals';
import { playSound, useSoundPreload } from '@app/features/sound/soundService';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { PlayLevel, PlayRoute } from '@app/services/supabase/play';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'PlayHome'>;

const PLAY_HOME_SOUNDS = ['play-locked'] as const;

// Athelete Play · portada (§28.6.1), all from get_play_home: the player level
// card with the Play streak, the challenge of the day, the route selector with
// its 5-node path and the level in play, and the goals of the week. Without
// connection it keeps the last data in cache with "Sin conexión" and the play
// buttons wait. Locked levels do not open (play-locked + warning haptic).
export function PlayHomeScreen({ navigation }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const query = usePlayHome();
  const home = query.data;
  const [picked, setPicked] = useState<PlayRoute | null>(null);
  useSoundPreload(PLAY_HOME_SOUNDS);

  const offline = query.isError && query.error?.code === 'offline';
  const selected: PlayRoute | null =
    picked ?? home?.dailyChallenge?.route ?? home?.routes[0]?.route ?? null;
  const view = selected ? findRoute(home, selected) : null;
  const focus = view ? routeFocusLevel(view) : null;
  const routeTitle = routeTitleOf(home);

  const openLevel = (route: PlayRoute, level: PlayLevel | number, isDaily = false) => {
    const number = typeof level === 'number' ? level : level.level;
    navigation.navigate(APP_ROUTES.PlayLevel, { route, level: number, isDaily });
  };
  const locked = () => playSound('play-locked');

  let content: React.ReactNode;
  if (!home && query.isLoading) {
    content = <PlayHomeSkeleton />;
  } else if (!home) {
    content = (
      <BlockError
        message={offline ? 'Conéctate para jugar.' : 'No pudimos cargar Athelete Play.'}
        onRetry={() => query.refetch().catch(() => {})}
      />
    );
  } else {
    const daily = home.dailyChallenge;
    const dailyLevel = daily ? findLevel(findRoute(home, daily.route), daily.level) : null;
    content = (
      <>
        <PlayerCard player={home.player} streak={home.streak.days} />
        {offline ? <OfflineNotice /> : null}
        {daily ? (
          <DailyCard
            daily={daily}
            routeTitle={routeTitle(daily.route)}
            best={dailyLevel?.bestScore ?? null}
            disabled={offline}
            onPress={() => openLevel(daily.route, daily.level, !daily.doneToday)}
          />
        ) : null}
        {view && focus ? (
          <View style={styles.section}>
            <TextV2 style={styles.sectionTitle} accessibilityRole="header">
              Tu ruta
            </TextV2>
            <View style={styles.gap10}>
              <RoutePills routes={home.routes} selected={view.route} onSelect={setPicked} />
              <RouteCard
                key={view.route}
                view={view}
                level={focus}
                disabled={offline}
                onOpen={level => (offline ? undefined : openLevel(view.route, level))}
                onLocked={locked}
              />
            </View>
          </View>
        ) : null}
        {home.weeklyGoals.goals.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.goalsHead}>
              <TextV2 style={styles.goalsTitle} accessibilityRole="header">
                Objetivos de la semana
              </TextV2>
              <TextV2 variant="meta" tone="secondary">
                Se renuevan el lunes
              </TextV2>
            </View>
            <WeeklyGoals goals={home.weeklyGoals.goals} />
          </View>
        ) : null}
      </>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      {/* Prototype: only the back button over the linen, no bar or lines. */}
      <View style={[styles.top, { paddingTop: insets.top + 6, paddingHorizontal: layout.floatingGutter }]}>
        <BackButton onPress={() => safeGoBack(navigation, [ROOT_ROUTES.MainTabs])} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: layout.gutter, paddingBottom: insets.bottom + 48 },
        ]}
      >
        <View style={styles.titleBlock}>
          <TextV2 style={styles.title} accessibilityRole="header">
            Athelete Play
          </TextV2>
          <TextV2 variant="body" tone="secondary">
            Pon a prueba tus conocimientos y sigue avanzando.
          </TextV2>
        </View>
        {content}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { paddingBottom: 6, alignItems: 'flex-start' },
  content: { paddingTop: 6, gap: 28 },
  titleBlock: { gap: 6, marginBottom: -6 },
  title: { fontSize: 38, lineHeight: 40, fontWeight: '700', letterSpacing: -1.33 },
  section: { gap: 16 },
  gap10: { gap: 10 },
  sectionTitle: { fontSize: 22, lineHeight: 26, fontWeight: '700', letterSpacing: -0.44 },
  goalsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  goalsTitle: { flexShrink: 1, fontSize: 20, lineHeight: 24, fontWeight: '700', letterSpacing: -0.3 },
});
