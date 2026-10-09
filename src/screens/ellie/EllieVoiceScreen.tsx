import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { MessageCircle, Mic, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LivingHalo,
  PressableScale,
  StatusBarV2,
  TextV2,
  VOICE_LABELS,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import {
  isVoiceBusy,
  nextVoiceState,
  VOICE_IDLE_HINT,
  VOICE_SAMPLE,
  type VoiceState,
} from '@app/features/ellie/v2/voiceSceneModel';
import { safeGoBack, tabFallback } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

const MUTED = '#A8A6A1';

// ELLIE · Modo voz (ELLIE_04–07, UI only). Dark in both themes: the Halo is
// the protagonist, the mic is the one Ember control. No microphone, speech
// recognition or TTS yet.
export function EllieVoiceScreen({
  navigation,
  route,
}: AppScreenProps<'EllieVoice'>) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<VoiceState>(
    __DEV__ ? route.params?.devState ?? 'idle' : 'idle',
  );
  const busy = isVoiceBusy(state);
  // Rest hint is real copy; the other lines are dev samples (no recognition).
  const sample =
    state === 'idle'
      ? { text: VOICE_IDLE_HINT, dim: true }
      : __DEV__
      ? VOICE_SAMPLE[state]
      : null;

  const toggle = () => {
    // TODO(voice): start/stop capture and recognition, then play the reply
    // (real device only; planned for TestFlight). Until then the dev build
    // just walks through the four visual states.
    if (__DEV__) {
      setState(nextVoiceState(state));
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.ellie.voiceBg }]}>
      <StatusBarV2 style="light" />
      <LinearGradient
        pointerEvents="none"
        colors={[colors.ellie.voiceBg, '#0C0B0A']}
        style={StyleSheet.absoluteFill}
      />
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="voiceGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FF5B1F" stopOpacity={0.07} />
            <Stop offset="1" stopColor="#FF5B1F" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50%" cy="38%" r="60%" fill="url(#voiceGlow)" />
      </Svg>

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 16) + 20,
            paddingHorizontal: layout.gutter + 8,
          },
        ]}
      >
        <View style={styles.top}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={() => safeGoBack(navigation, [tabFallback('Ellie')])}
            style={styles.round44}
          >
            <X size={20} color="#FFFFFF" strokeWidth={2} />
          </PressableScale>
          <TextV2 variant="eyebrow" color={MUTED} align="center" style={styles.title}>
            ELLIE · MODO VOZ
          </TextV2>
          <View style={styles.round44Spacer} />
        </View>

        <View style={styles.flex} />

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={busy ? 'Detener' : 'Hablar con ELLIE'}
          onPress={toggle}
          style={styles.haloTouch}
        >
          <LivingHalo size="voice" state={state} />
        </PressableScale>
        <TextV2 variant="body" color={MUTED} align="center" style={styles.label}>
          {VOICE_LABELS[state]}
        </TextV2>
        <View style={styles.textBlock}>
          {sample?.text ? (
            <TextV2
              variant="voice"
              color={sample.dim ? MUTED : '#FFFFFF'}
              align="center"
              style={styles.line}
            >
              {sample.text}
            </TextV2>
          ) : null}
        </View>

        <View style={styles.flex} />

        <View style={styles.bottom}>
          <View style={styles.side}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Escribir"
            onPress={() => navigation.replace(APP_ROUTES.EllieChat, { focusInput: true })}
            style={styles.round52}
          >
            <MessageCircle size={20} color="#FFFFFF" strokeWidth={2} />
          </PressableScale>
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={busy ? 'Detener' : 'Hablar con ELLIE'}
            onPress={toggle}
            style={[
              styles.main,
              { backgroundColor: colors.ember.base },
            ]}
          >
            {busy ? (
              <View style={styles.stop} />
            ) : (
              <Mic size={26} color="#FFFFFF" strokeWidth={2} />
            )}
          </PressableScale>
          <View style={styles.side} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  content: { flex: 1, alignItems: 'center' },
  top: { width: '100%', flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, letterSpacing: 1.1 },
  round44: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  round44Spacer: { width: 44, height: 44 },
  haloTouch: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { marginTop: 22, height: 20 },
  textBlock: {
    marginTop: 18,
    minHeight: 132,
    maxWidth: 320,
    alignItems: 'center',
  },
  bottom: { width: '100%', flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1, alignItems: 'flex-start' },
  line: { fontSize: 20, lineHeight: 28 },
  round52: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stop: { width: 16, height: 16, borderRadius: 4, backgroundColor: '#FFFFFF' },
});
