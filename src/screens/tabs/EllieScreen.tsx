import { useCallback, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EllieComposer,
  PressableScale,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { lastLine } from '@app/features/ellie/chatModel';
import {
  AlsoCanList,
  EllieOpening,
  ReadWithEllie,
  ResumeRow,
  type EllieAsk,
} from '@app/features/ellie/v2/EllieHome';
import { useEllieEntry } from '@app/features/ellie/v2/useEllieEntry';
import { useAuth } from '@app/hooks/useAuth';
import { useEllieData } from '@app/hooks/useEllieData';
import { useEllieHistory } from '@app/hooks/useEllieHistory';
import { useTabBarMetrics } from '@app/hooks/useTabBarMetrics';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import { ScanCard } from '@app/features/ellie/v2/EllieHome';
import type { TabScreenProps } from '@app/types/navigation';

type Props = TabScreenProps<'Ellie'>;

const FIXTURE_RESUME = {
  text: 'Ajusta mi rutina de hoy para que dure 40 minutos.',
  when: 'Ayer',
};

// ELLIE (ELLIE_01_HOME): the orb and her voice, two quick asks, what else she
// can do, the machine scanner and the readings. Every ask opens the chat
// (EllieChat) and sends the prompt there; the floating field opens it with
// the keyboard up. Single conversation per user: "Retomar" continues it.
export function EllieScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const tabBarMotion = useTabBarMotion();
  const { bottomClearance } = useTabBarMetrics();
  const { profile } = useAuth();
  const ellieData = useEllieData();
  const history = useEllieHistory();
  const dev = __DEV__ ? route.params?.devState : undefined;
  const scrollRef = useRef<ScrollView>(null);
  const contentPaddingTop = insets.top;
  const entry = useEllieEntry(navigation, () =>
    scrollRef.current?.scrollTo({ y: 0, animated: false }),
  );
  entry.setContentTop(contentPaddingTop);

  const firstName = profile?.name?.trim().split(/\s+/)[0] ?? '';
  const voice =
    ellieData.heroInsight?.text ??
    `Hola${firstName ? `, ${firstName}` : ''}. ¿En qué te ayudo hoy?`;

  const resume = useMemo(() => {
    if (dev === 'data') {
      return FIXTURE_RESUME;
    }
    if (dev === 'empty' || dev === 'loading' || dev === 'error') {
      return null;
    }
    return lastLine(history.data ?? [], new Date());
  }, [dev, history.data]);

  const loading = dev === 'loading' || (!dev && history.isLoading);
  const failed = dev === 'error' || (!dev && history.isError);

  const open = useCallback(
    (ask: EllieAsk) =>
      navigation.navigate(APP_ROUTES.EllieChat, {
        prompt: ask.text,
        mode: ask.mode,
      }),
    [navigation],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <ScrollView
        ref={scrollRef}
        onScroll={tabBarMotion.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: contentPaddingTop,
          paddingHorizontal: layout.gutter + 4,
          // Clear of the tab bar AND of the floating field (56 pt + its 8 pt
          // gap + 40 pt of air), so nothing ends up underneath.
          paddingBottom: bottomClearance + 104,
          gap: 30,
        }}
      >
        <EllieOpening
          eyebrow="ELLIE · TU COACH"
          voice={voice}
          orbState={failed ? 'offline' : 'idle'}
          onAsk={open}
          showAnswers
          haloStyle={entry.haloStyle}
          onHaloLayout={entry.onHaloLayout}
          blockStyle={entry.blockStyle}
        />

        <AlsoCanList onAsk={open} />
        {/* Scan placeholder: the same notice as in Entrenos. */}
        <ScanCard
          onPress={() =>
            toast.show('Pronto podrás escanear máquinas', { withTabBar: true })
          }
        />
        <ReadWithEllie onAsk={open} />

        {loading ? (
          <SkeletonGroup>
            <Skeleton height={20} width="60%" />
          </SkeletonGroup>
        ) : failed ? (
          <PressableScale
            accessibilityRole="button"
            onPress={() => history.refetch()}
            style={styles.retry}
          >
            <TextV2 variant="meta" color={colors.text.secondary}>
              No pudimos cargar tu conversación ·{' '}
              <TextV2 variant="metaStrong">Reintentar</TextV2>
            </TextV2>
          </PressableScale>
        ) : resume ? (
          <ResumeRow
            text={resume.text}
            when={resume.when}
            onPress={() => navigation.navigate(APP_ROUTES.EllieChat, {})}
          />
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.composer,
          {
            bottom: bottomClearance + 8,
            left: layout.gutter,
            right: layout.gutter,
          },
        ]}
      >
        <EllieComposer
          variant="button"
          placeholder="Pregúntale algo a ELLIE"
          onPress={() =>
            navigation.navigate(APP_ROUTES.EllieChat, { focusInput: true })
          }
          onVoice={() => navigation.navigate(APP_ROUTES.EllieVoice)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  retry: { alignItems: 'center' },
  composer: { position: 'absolute' },
});
