import { useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBarV2, useThemeV2 } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import {
  EllieAskField,
  EllieHeader,
  EllieHelpGrid,
  EllieMessage,
  EllieOrbStage,
  type EllieAsk,
} from '@app/features/ellie/v2/EllieHome';
import { useEllieEntry } from '@app/features/ellie/v2/useEllieEntry';
import { useAuth } from '@app/hooks/useAuth';
import { useEllieData } from '@app/hooks/useEllieData';
import { useEllieLatest } from '@app/hooks/useEllieConversations';
import { useTabBarMetrics } from '@app/hooks/useTabBarMetrics';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import type { TabScreenProps } from '@app/types/navigation';

type Props = TabScreenProps<'Ellie'>;

const SUBTITLE =
  'Puedo ajustar tu entreno, tu comida o tu descanso según tu energía y el tiempo que tengas.';

// ELLIE · portada v2.15 (ELLIE_08, handoff 25.9): wordmark and history,
// the Halo in its ring with "EN LÍNEA", her message and two answers, what
// else she can help with (2 × 2 + Escanear máquina) and the field to talk to
// her, in the flow. Every ask opens the chat (EllieChat) and sends the
// prompt there; the clock opens the chat with its conversation list. No
// voice mode (B-27).
export function EllieScreen({ navigation }: Props) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const tabBarMotion = useTabBarMotion();
  const { bottomClearance } = useTabBarMetrics();
  const { profile } = useAuth();
  const ellieData = useEllieData();
  const history = useEllieLatest();
  const scrollRef = useRef<ScrollView>(null);
  const entry = useEllieEntry(navigation, () =>
    scrollRef.current?.scrollTo({ y: 0, animated: false }),
  );
  // The stage is measured inside the scroll content, padding included.
  entry.setContentTop(0);

  const firstName = profile?.name?.trim().split(/\s+/)[0] ?? '';
  const headline =
    ellieData.heroInsight?.text ??
    `Hola${firstName ? `, ${firstName}` : ''}. ¿En qué te ayudo hoy?`;

  const open = useCallback(
    (ask: EllieAsk) =>
      navigation.navigate(APP_ROUTES.EllieChat, {
        prompt: ask.text,
        mode: ask.mode,
        source: 'ellie',
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
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: bottomClearance + 32 },
        ]}
      >
        <EllieHeader
          onHistory={() =>
            navigation.navigate(APP_ROUTES.EllieChat, { showConversations: true })
          }
        />
        <EllieOrbStage
          orbState={history.isError ? 'offline' : 'idle'}
          haloStyle={entry.haloStyle}
          onLayout={entry.onHaloLayout}
        />
        <EllieMessage
          headline={headline}
          subtitle={SUBTITLE}
          onAsk={open}
          blockStyle={entry.blockStyle}
        />
        <EllieHelpGrid onAsk={open} onScan={() => navigation.navigate(APP_ROUTES.MachineScan)} />
        <EllieAskField
          onPress={() => navigation.navigate(APP_ROUTES.EllieChat, { focusInput: true })}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
});
