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
  PosterTitle,
  StatusBarV2,
  StepProgress,
  TextV2,
  useThemeV2,
  useTopSafeBarHeight,
} from '@app/components/v2';
import { Isologo } from '@app/components/v2/Isologo';
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
import { em } from '@app/theme/v2/typography';

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

const pad = (value: number) => String(value).padStart(2, '0');

// ONB_02 · Onboarding (9 steps): back · isotipo · "0N / 09", segmented
// progress (4·2·3), Ember eyebrow of the block, the question in Anton and a
// fixed "Siguiente" ("Terminar" in Ember on the last step).
export function OnboardingWizard({
  step,
  direction,
  answers,
  update,
  onNext,
  onBack,
  canExit = false,
}: OnboardingWizardProps) {
  // KeyboardAvoidingView measures itself from its parent, which starts
  // below the TopSafeBar (B-01).
  const topSafeBarHeight = useTopSafeBarHeight();
  const { colors, layout, type } = useThemeV2();
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
      keyboardVerticalOffset={topSafeBarHeight}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: colors.bg }]}
    >
      <StatusBarV2 />
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, paddingHorizontal: layout.gutter },
        ]}
      >
        <View style={styles.bar}>
          <View style={styles.side}>
            {showBack ? <BackButton onPress={onBack} /> : null}
          </View>
          <View style={styles.center} accessibilityElementsHidden>
            <Isologo size={28} color={colors.text.primary} />
          </View>
          <View style={[styles.side, styles.sideEnd]}>
            <TextV2
              variant="micro"
              tone="secondary"
              accessibilityLabel={`Paso ${step + 1} de ${STEPS.length}`}
              style={[
                styles.counter,
                { letterSpacing: em(0.2, type.micro.fontSize) },
              ]}
            >
              {`${pad(step + 1)} / ${pad(STEPS.length)}`}
            </TextV2>
          </View>
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
        <Animated.View key={step} entering={entering} style={styles.gap28}>
          <View style={styles.gap8}>
            <PosterTitle
              display="displayS"
              eyebrow={`${pad(current.block + 1)} · ${BLOCKS[
                current.block
              ].toUpperCase()}`}
              headline={current.title}
              accent={[]}
            />
            <TextV2 variant="body" tone="secondary">
              {current.subtitle}
            </TextV2>
          </View>
          {body[current.kind]}
        </Animated.View>
      </ScrollView>
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.bg,
            paddingHorizontal: layout.gutter,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        <Button
          variant={isLast ? 'commit' : 'primary'}
          label={isLast ? 'Terminar' : 'Siguiente'}
          disabled={!ready}
          onPress={onNext}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    gap: 14,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    width: 64,
    height: 44,
    justifyContent: 'center',
  },
  sideEnd: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  counter: {
    fontWeight: '700',
  },
  content: {
    paddingTop: 24,
    paddingBottom: 24,
  },
  gap8: {
    gap: 8,
  },
  gap28: {
    gap: 28,
  },
  footer: {
    paddingTop: 12,
  },
});
