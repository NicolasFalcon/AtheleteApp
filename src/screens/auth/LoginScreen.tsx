import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmailIcon, PrivacyIcon } from '@app/assets/icons';
import { AuthButton } from '@app/components/auth/AuthButton';
import { BrandHeader } from '@app/components/auth/BrandHeader';
import { AuthScreenLayout } from '@app/components/auth/AuthScreenLayout';
import { AuthTextField } from '@app/components/auth/AuthTextField';
import { AuthThemeToggle } from '@app/components/auth/AuthTopActions';
import { FormMessage } from '@app/components/auth/FormMessage';
import { AUTH_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { AuthStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginScreen({ navigation }: Props) {
  const { signIn, isSupabaseConfigured } = useAuth();
  const { theme } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const styles = createStyles(theme);

  const validate = () => {
    const nextErrors: typeof fieldErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'El correo es obligatorio';
    } else if (!isValidEmail(email)) {
      nextErrors.email = 'Formato de correo inválido';
    }

    if (!password) {
      nextErrors.password = 'La contraseña es obligatoria';
    } else if (password.length < 6) {
      nextErrors.password = 'Mínimo 6 caracteres';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    setError('');

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Credenciales inválidas',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout
      centered
      footer={
        <Text style={styles.footerText}>
          ¿No tienes cuenta?{' '}
          <Text
            onPress={() => navigation.navigate(AUTH_ROUTES.Register)}
            style={styles.footerLink}
          >
            Crear cuenta
          </Text>
        </Text>
      }
      header={
        <BrandHeader
          showLogo
          subtitle="Inicia sesión para continuar con tu progreso."
          title="Qué bueno verte de nuevo"
        />
      }
      topActions={<AuthThemeToggle />}
    >
      {error ? (
        <FormMessage appearance="dark" message={error} tone="error" />
      ) : null}
      {!isSupabaseConfigured ? (
        <FormMessage
          appearance="dark"
          message="Supabase no está configurado todavía. Agrega SUPABASE_URL y SUPABASE_ANON_KEY en .env para habilitar este flujo."
          tone="neutral"
        />
      ) : null}
      <AuthTextField
        autoCapitalize="none"
        error={fieldErrors.email}
        icon={<EmailIcon color={theme.colors.textSecondary} />}
        keyboardType="email-address"
        label="Correo electrónico"
        onChangeText={setEmail}
        placeholder="tu@ejemplo.com"
        textContentType="emailAddress"
        value={email}
      />
      <AuthTextField
        autoCapitalize="none"
        error={fieldErrors.password}
        icon={<PrivacyIcon color={theme.colors.textSecondary} />}
        label="Contraseña"
        onChangeText={setPassword}
        placeholder="••••••••"
        passwordToggle
        textContentType="password"
        value={password}
      />
      <Pressable
        hitSlop={8}
        onPress={() => navigation.navigate(AUTH_ROUTES.ForgotPassword)}
        style={styles.helper}
      >
        <Text style={styles.helperLink}>¿Olvidaste tu contraseña?</Text>
      </Pressable>
      <AuthButton
        label={submitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
        loading={submitting}
        onPress={handleSubmit}
      />
    </AuthScreenLayout>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    footerText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      textAlign: 'center',
    },
    footerLink: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontWeight: theme.typography.weights.semibold,
    },
    helper: {
      alignSelf: 'flex-end',
      paddingVertical: theme.spacing.xs,
    },
    helperLink: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
    },
  });
}
