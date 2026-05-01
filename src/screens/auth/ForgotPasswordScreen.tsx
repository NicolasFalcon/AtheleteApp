import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandHeader } from '@app/components/auth/BrandHeader';
import { AuthScreenLayout } from '@app/components/auth/AuthScreenLayout';
import { FormMessage } from '@app/components/auth/FormMessage';
import { AUTH_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { env } from '@app/lib/config/env';
import type { AuthStackParamList } from '@app/types/navigation';
import { AppTextInput, Button } from '@app/components/ui';

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

  const styles = StyleSheet.create({
    successIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    successEmoji: {
      fontSize: 28,
    },
    successBody: {
      gap: theme.spacing.lg,
    },
  });

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
        footer={
          <Button
            label="Volver a iniciar sesión"
            onPress={() => navigation.navigate(AUTH_ROUTES.Login)}
            variant="outline"
          />
        }
        header={
          <BrandHeader
            compact
            subtitle="Te enviamos un enlace para restablecer tu contraseña."
            title="Revisa tu bandeja de entrada"
          />
        }
        onBack={() => navigation.navigate(AUTH_ROUTES.Login)}>
        <View style={styles.successBody}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✉️</Text>
          </View>
          <FormMessage
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
          title="Recuperar contraseña"
        />
      }
      onBack={() => navigation.goBack()}>
      {error ? <FormMessage message={error} tone="error" /> : null}
      {!isSupabaseConfigured ? (
        <FormMessage
          message="Supabase no está configurado todavía. Agrega SUPABASE_URL y SUPABASE_ANON_KEY en .env para habilitar este flujo."
          tone="neutral"
        />
      ) : null}
      {isSupabaseConfigured && env.supabase.passwordResetUrl ? (
        <FormMessage
          message="Por ahora el enlace de recuperación redirige al flujo web de restablecimiento. El deep link nativo puede agregarse después."
          tone="neutral"
        />
      ) : null}
      <AppTextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        label="Correo electrónico"
        onChangeText={setEmail}
        placeholder="tu@ejemplo.com"
        textContentType="emailAddress"
        value={email}
      />
      <Button
        label={submitting ? 'Enviando…' : 'Enviar enlace de recuperación'}
        loading={submitting}
        onPress={handleSubmit}
      />
    </AuthScreenLayout>
  );
}
