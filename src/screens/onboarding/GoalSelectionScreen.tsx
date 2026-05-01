import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@app/components/ScreenContainer';
import { GoalOptionCard } from '@app/components/onboarding/GoalOptionCard';
import { OnboardingProgress } from '@app/components/onboarding/OnboardingProgress';
import { ONBOARDING_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { OnboardingGoal } from '@app/types/auth';
import type { OnboardingStackParamList } from '@app/types/navigation';
import { Button } from '@app/components/ui';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'GoalSelection'>;

const GOALS: Array<{ value: OnboardingGoal; label: string; emoji: string }> = [
  { value: 'lose_weight', label: 'Perder peso', emoji: '🔥' },
  { value: 'gain_muscle', label: 'Ganar músculo', emoji: '💪' },
  { value: 'maintain', label: 'Mantenerme', emoji: '⚖️' },
  { value: 'improve_health', label: 'Mejorar salud', emoji: '❤️' },
];

export function GoalSelectionScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const { onboardingDraft, updateOnboardingDraft } = useAuth();

  const styles = StyleSheet.create({
    content: {
      gap: theme.spacing.xxl,
    },
    heading: {
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.title,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.6,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 20,
    },
    list: {
      gap: theme.spacing.md,
    },
    footer: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    backButton: {
      minWidth: 56,
    },
    continueButton: {
      flex: 1,
    },
    backText: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.content}>
      <OnboardingProgress step={1} />
      <View style={styles.heading}>
        <Text style={styles.title}>¿Cuál es tu objetivo principal?</Text>
        <Text style={styles.subtitle}>
          Elige el que más te importa ahora.
        </Text>
      </View>
      <View style={styles.list}>
        {GOALS.map(goal => (
          <GoalOptionCard
            emoji={goal.emoji}
            key={goal.value}
            label={goal.label}
            onPress={() => updateOnboardingDraft({ goal: goal.value })}
            selected={onboardingDraft.goal === goal.value}
          />
        ))}
      </View>
      <View style={styles.footer}>
        <Button
          fullWidth={false}
          label="←"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          variant="outline"
        />
        <Button
          accessoryRight={<Text style={styles.backText}>→</Text>}
          disabled={!onboardingDraft.goal}
          label="Continuar"
          onPress={() => navigation.navigate(ONBOARDING_ROUTES.BodyData)}
          style={styles.continueButton}
        />
      </View>
    </ScreenContainer>
  );
}
