import { useEffect } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { MessageCircle, Mic, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  LivingHalo,
  PressableScale,
  Sheet,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { ellieErrorLine, failureEffect } from '@app/features/ellie/ellieCopy';
import { useEllieVoice } from '@app/features/ellie/voice/useEllieVoice';
import {
  VOICE_ERROR_LINE,
  VOICE_HINT,
  haloFor,
  isVoiceActive,
  voiceLabel,
} from '@app/features/ellie/voice/voiceMachine';
import { useAuth } from '@app/hooks/useAuth';
import { safeGoBack, tabFallback } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';
import { plainMarkdown } from '@app/features/ellie/markdown';

const MUTED = '#A8A6A1';

// ELLIE · Modo voz (ELLIE_04–07). Dark in both themes: the Halo is the
// protagonist, the mic is the one Ember control. Listening and speaking happen
// on the device; what is said goes to ellie-chat like any message.
export function EllieVoiceScreen({
  navigation,
}: AppScreenProps<'EllieVoice'>) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { state, language, controller } = useEllieVoice();
  const busy = isVoiceActive(state.phase);
  const es = language === 'es';

  // The session is gone: back to the sign-in.
  useEffect(() => {
    if (
      state.error?.kind === 'reply' &&
      failureEffect(state.error.failure.code) === 'login'
    ) {
      signOut().catch(() => undefined);
    }
  }, [signOut, state.error]);

  const toggle = () => {
    controller.tap().catch(() => undefined);
  };

  // What is under the halo.
  const sample = (() => {
    switch (state.phase) {
      case 'listening':
        return state.transcript
          ? { text: state.transcript, dim: false }
          : { text: VOICE_HINT[language], dim: true };
      case 'thinking':
        return { text: state.transcript, dim: true };
      case 'speaking':
        return { text: plainMarkdown(state.reply), dim: false };
      case 'error':
        if (!state.error) {
          return { text: '', dim: true };
        }
        return {
          text:
            state.error.kind === 'permission'
              ? VOICE_ERROR_LINE.permission[language]
              : state.error.kind === 'recognition'
                ? VOICE_ERROR_LINE.recognition[language]
                : ellieErrorLine(state.error.failure, language),
          dim: true,
        };
      default:
        return state.reply
          ? { text: plainMarkdown(state.reply), dim: true }
          : { text: VOICE_HINT[language], dim: true };
    }
  })();

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
            accessibilityLabel={es ? 'Cerrar' : 'Close'}
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
          accessibilityLabel={busy ? (es ? 'Detener' : 'Stop') : es ? 'Hablar con ELLIE' : 'Talk to ELLIE'}
          onPress={toggle}
          style={styles.haloTouch}
        >
          <LivingHalo size="voice" state={haloFor(state.phase)} />
        </PressableScale>
        <TextV2 variant="body" color={MUTED} align="center" style={styles.label}>
          {voiceLabel(state.phase, language)}
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
          {state.hasPlan && state.phase === 'idle' ? (
            <TextV2 variant="meta" color={MUTED} align="center" style={styles.line}>
              {es ? 'Te dejé el plan en el chat.' : 'I left the plan in the chat.'}
            </TextV2>
          ) : null}
          {state.error?.kind === 'permission' ? (
            <Button
              label={es ? 'Abrir Ajustes' : 'Open Settings'}
              variant="onScene"
              onPress={() => {
                Linking.openSettings().catch(() => undefined);
              }}
              style={styles.settings}
            />
          ) : null}
        </View>

        <View style={styles.flex} />

        <View style={styles.bottom}>
          <View style={styles.side}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={es ? 'Escribir' : 'Type'}
            onPress={() => navigation.replace(APP_ROUTES.EllieChat, { focusInput: true })}
            style={styles.round52}
          >
            <MessageCircle size={20} color="#FFFFFF" strokeWidth={2} />
          </PressableScale>
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={busy ? (es ? 'Detener' : 'Stop') : es ? 'Hablar con ELLIE' : 'Talk to ELLIE'}
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

      <Sheet
        open={state.rationale}
        onClose={() => controller.dismissRationale()}
        title={es ? 'Para escucharte' : 'To hear you'}
        footer={
          <Button
            label={es ? 'Continuar' : 'Continue'}
            onPress={() => {
              controller.confirmPermission().catch(() => undefined);
            }}
            fullWidth
          />
        }
      >
        <TextV2 variant="body" tone="secondary">
          {es
            ? 'ELLIE usa el micrófono y el reconocimiento de voz de tu iPhone solo mientras hablas con ella. Lo que dices se convierte en texto y se envía como un mensaje; no guardamos el audio.'
            : "ELLIE uses your iPhone's microphone and speech recognition only while you talk to her. What you say becomes text and is sent as a message; we don't keep the audio."}
        </TextV2>
      </Sheet>
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
  settings: { marginTop: 14 },
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
