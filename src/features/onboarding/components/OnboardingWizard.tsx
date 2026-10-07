import { useEffect, type ReactNode } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackButton,
  Button,
  Eyebrow,
  GlassSurface,
  StatusBarV2,
  StepProgress,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import {
  BLOCKS,
  STEPS,
  canContinue,
  type OnboardingAnswers,
} from '@app/features/onboarding/onboardingModel';
import {
  BirthDateStep,
  BodyStep,
  DaysStep,
  DurationStep,
  EquipmentStep,
  GenderStep,
  GoalStep,
  LevelStep,
  NameStep,
} from '@app/features/onboarding/components/OnboardingSteps';

export type OnboardingWizardProps = {
  step: number;
  direction: 'forward' | 'back';
  answers: OnboardingAnswers;
  update: (patch: Partial<OnboardingAnswers>) => void;
  onNext: () => void;
  onBack: () => void;
  // The first step has no back unless the host provides an exit.
  canExit?: boolean;
};

const BLOCK_OF_STEP = STEPS.map(step => step.block);

// ONB_02 · Onboarding (9 steps): one question per screen at 32 pt, grouped in
// Tú · Tu objetivo · Tu semana, segmented progress and a fixed "Siguiente".
export function OnboardingWizard({
  step,
  direction,
  answers,
  update,
  onNext,
  onBack,
  canExit = false,
}: OnboardingWizardProps) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const showBack = step > 0 || canExit;
  const ready = canContinue(current.kind, answers);

  // Android back goes to the previous question instead of leaving the flow.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (step > 0 || canExit) {
          onBack();
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [canExit, onBack, step]);

  const body: Record<typeof current.kind, ReactNode> = {
    name: (
      <NameStep
        answers={answers}
        update={update}
        onSubmit={ready ? onNext : undefined}
      />
    ),
    birthDate: <BirthDateStep answers={answers} update={update} />,
    gender: <GenderStep answers={answers} update={update} />,
    body: <BodyStep answers={answers} update={update} />,
    goal: <GoalStep answers={answers} update={update} />,
    level: <LevelStep answers={answers} update={update} />,
    days: <DaysStep answers={answers} update={update} />,
    equipment: <EquipmentStep answers={answers} update={update} />,
    duration: <DurationStep answers={answers} update={update} />,
  };

  const entering = (
    direction === 'forward' ? FadeInRight : FadeInLeft
  ).duration(320);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: colors.bg }]}
    >
      <StatusBarV2 />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <View style={styles.side}>
            {showBack ? <BackButton onPress={onBack} /> : null}
          </View>
          <TextV2
            variant="metaStrong"
            tone="secondary"
            align="center"
            style={styles.flex1}
          >
            {`${BLOCKS[current.block]} · ${step + 1} de ${STEPS.length}`}
          </TextV2>
          <View style={styles.side} />
        </View>
        <StepProgress blocks={BLOCK_OF_STEP} current={step} />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: layout.gutter },
        ]}
      >
        <Animated.View key={step} entering={entering} style={styles.gap32}>
          <View style={styles.gap10}>
            <Eyebrow>{`0${current.block + 1} · ${
              BLOCKS[current.block]
            }`}</Eyebrow>
            <TextV2 accessibilityRole="header" style={styles.question}>
              {current.question}
            </TextV2>
          </View>
          {body[current.kind]}
        </Animated.View>
      </ScrollView>
      <GlassSurface
        kind="nav"
        style={[
          styles.footer,
          {
            paddingHorizontal: layout.gutter,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        <Button
          label={isLast ? 'Terminar' : 'Siguiente'}
          disabled={!ready}
          onPress={onNext}
        />
      </GlassSurface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 12,
    gap: 12,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    width: 44,
    height: 44,
  },
  content: {
    paddingTop: 36,
    paddingBottom: 24,
  },
  gap10: {
    gap: 10,
  },
  gap32: {
    gap: 32,
  },
  question: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -0.8,
    lineHeight: 35,
  },
  footer: {
    paddingTop: 12,
  },
});
