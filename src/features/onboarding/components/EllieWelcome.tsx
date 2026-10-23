import { useLayoutEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowRight } from 'lucide-react-native';
import {
  BrandLockup,
  Button,
  MonoPhoto,
  PosterTitle,
  PressableScale,
  Scrim,
  StatusBarV2,
  TextV2,
  TopSafeBar,
  displayLineBox,
  useThemeV2,
} from '@app/components/v2';
import { difficultyLabel } from '@app/features/home/v2/homeLabels';
import { HOME_PHOTOS } from '@app/features/home/v2/homePhotos';
import {
  DURATIONS,
  GOALS,
  type OnboardingAnswers,
} from '@app/features/onboarding/onboardingModel';
import { useTodaySuggestion } from '@app/hooks/useRoutines';
import { STACK_SCREEN_OPTIONS } from '@app/navigation/stackScreenOptions';
import { SceneScope } from '@app/providers/ThemeProvider';
import { em } from '@app/theme/v2/typography';

export type WelcomeSaveStatus = 'saving' | 'saved' | 'error';

export type EllieWelcomeProps = {
  answers: OnboardingAnswers;
  // The profile is saved while the welcome is shown.
  saveStatus: WelcomeSaveStatus;
  onRetrySave: () => void;
  // Navigation only (after a successful save).
  onGoHome: () => void;
  continuing?: boolean;
  error?: string;
};

// TODO(onboarding-assets): placeholder until
// assets/images/onboarding/plan-ready.jpg exists.
const BACKGROUND_PHOTO = require('@app/assets/v2/photos/hero-entreno.jpg');
// iPhone SE and other short phones: the headline goes one step down.
const COMPACT_HEIGHT = 700;
const STAGGER = 120;

function renderSceneTopSafeBar() {
  return <TopSafeBar variant="scene" />;
}

const enter = (index: number) =>
  FadeInDown.duration(250)
    .delay(index * STAGGER)
    .reduceMotion(ReduceMotion.System);

// ONB_03 · "Plan listo", the end of the onboarding: always dark, black and
// white photo, the user's name and the plan in Anton, the starting point in
// three figures and today's first session. The profile is saved in the
// background while this is shown; "Entrar a ATHELETE" stays busy until it is
// saved, and a failure offers "Reintentar".
export function EllieWelcome(props: EllieWelcomeProps) {
  const navigation = useNavigation();

  // The bar takes the dark plate of this screen (the wizard keeps the theme
  // bar).
  useLayoutEffect(() => {
    navigation.setOptions({ header: renderSceneTopSafeBar });
    return () => navigation.setOptions({ header: STACK_SCREEN_OPTIONS.header });
  }, [navigation]);

  return (
    <SceneScope>
      <PlanReady {...props} />
    </SceneScope>
  );
}

function PlanReady({
  answers,
  saveStatus,
  onRetrySave,
  onGoHome,
  continuing = false,
  error,
}: EllieWelcomeProps) {
  const { colors, display, scene, type } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const saved = saveStatus === 'saved';
  const failed = saveStatus === 'error';
  const busy = saveStatus === 'saving' || continuing;
  const compact = height < COMPACT_HEIGHT;

  // Today's suggestion once the profile exists (the same query as the Inicio
  // hero, so both show the same session).
  const suggestionQuery = useTodaySuggestion(saved);
  const firstSession = suggestionQuery.data?.suggestion ?? null;

  const firstName = answers.name.trim().split(/\s+/)[0] ?? '';
  const duration =
    answers.duration !== null ? DURATIONS[answers.duration] : null;
  const goal = answers.goal !== null ? GOALS[answers.goal] : null;

  const stats = [
    { value: String(answers.days), label: 'DÍAS / SEM' },
    { value: duration ? duration.minutes : '—', label: 'MIN / SESIÓN' },
    {
      value: goal ? goal.short[0].toUpperCase() : '—',
      label: goal ? goal.short[1].toUpperCase() : '',
    },
  ];
  const statValue = display.displayS;
  const caps = { letterSpacing: em(0.2, type.micro.fontSize) };

  return (
    <View style={[styles.fill, { backgroundColor: scene.plate }]}>
      <StatusBarV2 />
      <MonoPhoto source={BACKGROUND_PHOTO} style={StyleSheet.absoluteFill}>
        <Scrim variant="intro" />
      </MonoPhoto>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 8 },
        ]}
      >
        <View style={styles.header}>
          <BrandLockup />
        </View>
        <View style={styles.spacer} />

        <Animated.View entering={enter(0)} style={styles.gap16}>
          <PosterTitle
            display="displayL"
            size={compact ? 'compact' : 'regular'}
            eyebrow="ATHELETE INTELLIGENCE"
            headline={[firstName ? `${firstName.toUpperCase()},` : 'HOLA,']}
            accent={['TU PLAN ESTÁ', 'LISTO.']}
          />
          <TextV2 variant="body" color={colors.text.bodySoft}>
            Partimos de tu objetivo, tu nivel y tu semana. El plan se afina con
            cada sesión, cada noche y cada registro.
          </TextV2>
        </Animated.View>

        <Animated.View entering={enter(1)} style={styles.stats}>
          {stats.map((stat, index) => (
            <View
              key={stat.label || index}
              accessible
              accessibilityLabel={`${stat.value} ${stat.label}`}
              style={[
                styles.stat,
                index > 0
                  ? {
                      borderLeftWidth: StyleSheet.hairlineWidth,
                      borderLeftColor: colors.border.onDarkStrong,
                      paddingLeft: 16,
                    }
                  : null,
              ]}
            >
              <TextV2
                numberOfLines={1}
                adjustsFontSizeToFit
                color={colors.text.primary}
                style={[statValue, displayLineBox(statValue), styles.statValue]}
              >
                {stat.value}
              </TextV2>
              <TextV2
                variant="micro"
                color={colors.text.tertiary}
                numberOfLines={2}
                style={[styles.statLabel, caps]}
              >
                {stat.label}
              </TextV2>
            </View>
          ))}
        </Animated.View>

        {firstSession ? (
          <Animated.View entering={enter(2)}>
            {/* No route to a routine exists yet during the onboarding
                (the app stack mounts after it): same way out as the CTA. */}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Tu primera sesión: ${firstSession.title}`}
              disabled={!saved || continuing}
              onPress={onGoHome}
              style={[
                styles.session,
                {
                  backgroundColor: colors.border.onDark,
                  boxShadow: `inset 0 0 0 1px ${colors.border.onDarkStrong}`,
                },
              ]}
            >
              <MonoPhoto source={HOME_PHOTOS.mobility} style={styles.thumb} />
              <View style={styles.sessionTexts}>
                <TextV2
                  variant="micro"
                  color={colors.ember.base}
                  style={[styles.eyebrow, caps]}
                >
                  TU PRIMERA SESIÓN
                </TextV2>
                <TextV2 variant="cta" numberOfLines={1}>
                  {firstSession.title}
                </TextV2>
                <TextV2 variant="meta" tone="secondary">
                  {`${firstSession.duration} min · ${difficultyLabel(
                    firstSession.difficulty,
                  )}`}
                </TextV2>
              </View>
              <ArrowRight
                color={colors.text.primary}
                size={18}
                strokeWidth={2}
              />
            </PressableScale>
          </Animated.View>
        ) : null}

        {error ? (
          <TextV2
            variant="meta"
            color={colors.ember.textOnDark}
            align="center"
            accessibilityLiveRegion="polite"
          >
            {error}
          </TextV2>
        ) : null}
        {failed ? (
          <Button variant="commit" label="Reintentar" onPress={onRetrySave} />
        ) : (
          <Button
            variant="commit"
            label="Entrar a ATHELETE"
            loading={busy}
            loadingLabel={
              continuing ? 'Abriendo tu inicio…' : 'Guardando tu perfil…'
            }
            onPress={onGoHome}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 20,
  },
  header: {
    paddingTop: 16,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  gap16: {
    gap: 16,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    gap: 6,
    paddingRight: 8,
  },
  statValue: {
    includeFontPadding: false,
    fontVariant: [],
  },
  statLabel: {
    fontWeight: '700',
  },
  session: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    paddingRight: 18,
    borderRadius: 20,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  sessionTexts: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontWeight: '700',
  },
});
