import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { visualOnboardingReachGoals } from '@app/assets/images';
import { Button } from '@app/components/ui';
import { ONBOARDING_ROUTES } from '@app/constants/routes';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { OnboardingStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <ImageBackground source={visualOnboardingReachGoals} style={styles.screen}>
      <View style={styles.overlay} />
      <View style={styles.content}>
        <View style={styles.copy}>
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>
            Antes de empezar, completa tu perfil para personalizar tus rutinas,
            tu progreso y las sugerencias de ELLIE.
          </Text>
        </View>
        <Button
          label="Completar mi perfil"
          onPress={() => navigation.navigate(ONBOARDING_ROUTES.Avatar)}
          style={styles.button}
          textStyle={styles.buttonText}
        />
      </View>
    </ImageBackground>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.48)',
    },
    content: {
      gap: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xxxl,
    },
    copy: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    title: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.display,
      fontWeight: theme.typography.weights.bold,
      textAlign: 'center',
    },
    subtitle: {
      maxWidth: 340,
      color: 'rgba(255,255,255,0.78)',
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      lineHeight: 24,
      textAlign: 'center',
    },
    button: {
      backgroundColor: '#FFFFFF',
      borderColor: 'rgba(255,255,255,0.5)',
    },
    buttonText: {
      color: '#111111',
    },
  });
}
