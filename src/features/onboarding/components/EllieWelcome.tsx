import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import {
  Button,
  EllieOrb,
  Eyebrow,
  PressableScale,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import {
  DURATIONS,
  GOALS,
  LEVELS,
  type OnboardingAnswers,
} from '@app/features/onboarding/onboardingModel';

export type WelcomeSaveStatus = 'saving' | 'saved' | 'error';

export type EllieWelcomeProps = {
  answers: OnboardingAnswers;
  // The profile is saved while the welcome is shown.
  saveStatus: WelcomeSaveStatus;
  onRetrySave: () => void;
  // Navigation only (after a successful save).
  onGoHome: () => void;
  onTalkToEllie: () => void;
  continuing?: boolean;
  error?: string;
};

const FIRST_SESSION_PHOTO = require('@app/assets/v2/photos/movilidad.jpg');

// ONB_03 · Bienvenida de ELLIE (Auth.dc.html · bienvenida): ELLIE's linen,
// the breathing orb, her voice at 26/400, the starting point in three
// figures and the first session. Two ways out: Inicio or a conversation.
// The profile is saved in the background while this is shown; both ways out
// stay inactive until it is saved, and a failure offers "Reintentar".
export function EllieWelcome({
  answers,
  saveStatus,
  onRetrySave,
  onGoHome,
  onTalkToEllie,
  continuing = false,
  error,
}: EllieWelcomeProps) {
  const saved = saveStatus === 'saved';
  const failed = saveStatus === 'error';
  const busy = saveStatus === 'saving' || continuing;
  const { colors, mode } = useThemeV2();
  const insets = useSafeAreaInsets();
  const isLight = mode === 'light';
  const background = isLight
    ? [colors.ellie.linenAlt[0], colors.ellie.linenAlt[1], colors.bg]
    : [colors.ellie.linen[2], colors.ellie.linen[3], colors.bg];
  const hairline = isLight ? 'rgba(18,18,18,.08)' : colors.border.onDarkStrong;
  const name = answers.name.trim() || 'hola';
  const duration =
    answers.duration !== null ? DURATIONS[answers.duration] : null;
  const goal = answers.goal !== null ? GOALS[answers.goal] : null;
  const level = answers.level !== null ? LEVELS[answers.level] : null;
  const errorColor = isLight ? colors.ember.deep : colors.ember.textOnDark;

  const summary = [
    { value: String(answers.days), label: 'días/sem' },
    { value: duration ? duration.minutes.replace('+', '') : '—', label: 'min' },
    { value: goal ? goal.short[0] : '—', label: goal ? goal.short[1] : '' },
  ];

  return (
    <LinearGradient
      colors={background}
      locations={[0, 0.48, 1]}
      style={[
        styles.fill,
        {
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 16) + 18,
        },
      ]}
    >
      <StatusBarV2 />
      <View style={styles.center}>
        <Animated.View entering={FadeInDown.duration(600)}>
          <EllieOrb size={128} />
        </Animated.View>
        <Animated.View
          entering={FadeInDown.duration(500).delay(200)}
          style={styles.voice}
        >
          <Eyebrow>ELLIE · Tu coach</Eyebrow>
          <TextV2
            accessibilityRole="header"
            align="center"
            style={styles.greeting}
          >
            {`Hola, ${name}. Ya tengo tu punto de partida.`}
          </TextV2>
          <TextV2
            variant="body"
            tone="secondary"
            align="center"
            style={styles.sub}
          >
            Empezamos con algo corto para conocernos. Después ajusto el plan con
            lo que vea.
          </TextV2>
        </Animated.View>
        <Animated.View
          entering={FadeInDown.duration(500).delay(350)}
          style={styles.summary}
        >
          {summary.map((item, index) => (
            <View key={item.label + index} style={styles.summaryRow}>
              {index > 0 ? (
                <View
                  style={[styles.summaryDivider, { backgroundColor: hairline }]}
                />
              ) : null}
              <View style={styles.summaryCell}>
                <TextV2 variant="section">{item.value}</TextV2>
                <TextV2 variant="meta" tone="secondary">
                  {item.label}
                </TextV2>
              </View>
            </View>
          ))}
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.duration(500).delay(500)}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Tu primera sesión. Ver en Inicio"
          disabled={!saved || continuing}
          onPress={onGoHome}
          style={[styles.session, { borderTopColor: hairline }]}
        >
          <Image source={FIRST_SESSION_PHOTO} style={styles.sessionPhoto} />
          <View style={styles.sessionTexts}>
            <Eyebrow>Tu primera sesión</Eyebrow>
            <TextV2 variant="cta">Sesión de inicio</TextV2>
            <TextV2 variant="meta" tone="secondary">
              {[duration ? `${duration.minutes} min` : null, level?.label]
                .filter(Boolean)
                .join(' · ')}
            </TextV2>
          </View>
          <ArrowRight color={colors.text.primary} size={18} strokeWidth={2} />
        </PressableScale>
        {error ? (
          <TextV2
            variant="meta"
            color={errorColor}
            align="center"
            style={styles.error}
          >
            {error}
          </TextV2>
        ) : null}
        <View style={styles.actions}>
          {failed ? (
            <Button label="Reintentar" onPress={onRetrySave} />
          ) : (
            <Button
              label="Ir a Inicio"
              loading={busy}
              loadingLabel={
                continuing ? 'Abriendo tu inicio…' : 'Guardando tu perfil…'
              }
              onPress={onGoHome}
            />
          )}
          <Button
            variant="text"
            label="Hablar con ELLIE"
            disabled={!saved || continuing}
            onPress={onTalkToEllie}
            style={styles.talk}
          />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    paddingTop: 40,
  },
  voice: {
    alignItems: 'center',
    gap: 14,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '400',
    lineHeight: 34,
    letterSpacing: -0.26,
    maxWidth: 320,
  },
  sub: {
    maxWidth: 300,
  },
  summary: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 320,
  },
  summaryRow: {
    flex: 1,
    flexDirection: 'row',
  },
  summaryDivider: {
    width: 1,
    marginRight: 16,
  },
  summaryCell: {
    flex: 1,
    gap: 2,
  },
  session: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  sessionPhoto: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  sessionTexts: {
    flex: 1,
    gap: 2,
  },
  error: {
    marginBottom: 6,
  },
  actions: {
    gap: 6,
    marginTop: 10,
  },
  talk: {
    alignSelf: 'center',
    height: 44,
  },
});
