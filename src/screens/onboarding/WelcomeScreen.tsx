import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@app/components/ScreenContainer';
import { ONBOARDING_ROUTES } from '@app/constants/routes';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { OnboardingStackParamList } from '@app/types/navigation';
import { Button } from '@app/components/ui';
import { OnboardingProgress } from '@app/components/onboarding/OnboardingProgress';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xxxl,
      gap: theme.spacing.xxl,
    },
    hero: {
      alignItems: 'center',
      gap: theme.spacing.xl,
    },
    iconBox: {
      width: 80,
      height: 80,
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconText: {
      fontSize: 34,
      color: theme.colors.textPrimary,
    },
    copy: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 32,
      lineHeight: 36,
      fontWeight: theme.typography.weights.bold,
      textAlign: 'center',
      letterSpacing: -0.8,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      lineHeight: 24,
      textAlign: 'center',
      maxWidth: 300,
    },
    buttonArrow: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <OnboardingProgress step={0} />
      <View style={styles.hero}>
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>◎</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Configuremos tu perfil</Text>
          <Text style={styles.subtitle}>
            Esto nos ayuda a personalizar tu experiencia de entrenamiento y
            nutrición.
          </Text>
        </View>
      </View>
      <Button
        accessoryRight={<Text style={styles.buttonArrow}>→</Text>}
        label="Comenzar"
        onPress={() => navigation.navigate(ONBOARDING_ROUTES.GoalSelection)}
      />
    </ScreenContainer>
  );
}
