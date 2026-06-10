import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmailIcon, SuccessIcon } from '@app/assets/icons';
import { AuthButton } from '@app/components/auth/AuthButton';
import { BrandHeader } from '@app/components/auth/BrandHeader';
import { AuthScreenLayout } from '@app/components/auth/AuthScreenLayout';
import { AuthTextField } from '@app/components/auth/AuthTextField';
import { FormMessage } from '@app/components/auth/FormMessage';
import { AUTH_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { AuthStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ForgotPasswordScreen({ navigation }: Props) {
  const { requestPasswordReset, isSupabaseConfigured } = useAuth();
  const { theme } = useAppTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const styles = createStyles(theme);

  const handleSubmit = async () => {
    setError('');

    if (!email.trim() || !isValidEmail(email)) {
      setError('Ingresa un correo válido');
      return;
    }

    setSubmitting(true);

    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'No se pudo enviar el correo de recuperación',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthScreenLayout
        centered
        footer={
          <AuthButton
            label="Volver a iniciar sesión"
            onPress={() => navigation.navigate(AUTH_ROUTES.Login)}
            variant="secondary"
          />
        }
        header={
          <BrandHeader
            compact
            subtitle="Abre el enlace desde este dispositivo para crear tu nueva contraseña en Athelete."
            title="Revisa tu bandeja de entrada"
          />
        }
        onBack={() => navigation.navigate(AUTH_ROUTES.Login)}
      >
        <View style={styles.successBody}>
          <SuccessIcon color={theme.colors.textPrimary} />
          <FormMessage
            appearance="dark"
            message={`Enviamos un enlace de recuperación a ${email}.`}
            tone="success"
          />
        </View>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      backLabel="Volver"
      header={
        <BrandHeader
          compact
          subtitle="Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña."
          title="¿Olvidaste tu contraseña?"
        />
      }
      onBack={() => navigation.goBack()}
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
        icon={<EmailIcon color={theme.colors.textSecondary} />}
        keyboardType="email-address"
        label="Correo electrónico"
        onChangeText={setEmail}
        placeholder="tu@ejemplo.com"
        textContentType="emailAddress"
        value={email}
      />
      <AuthButton
        label={submitting ? 'Enviando…' : 'Enviar enlace'}
        loading={submitting}
        onPress={handleSubmit}
      />
    </AuthScreenLayout>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    successBody: {
      alignItems: 'center',
      gap: theme.spacing.xl,
    },
  });
}
