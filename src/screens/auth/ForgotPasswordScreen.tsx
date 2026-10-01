import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock, Mail } from 'lucide-react-native';
import {
  AuthFormLayout,
  Button,
  TextField,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { AUTH_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AuthStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// AUTH_04 / AUTH_05 · Recuperar contraseña (Auth.dc.html). One field, one
// action; once sent, the same space confirms and offers to resend.
export function ForgotPasswordScreen({ navigation }: Props) {
  const { requestPasswordReset, isSupabaseConfigured } = useAuth();
  const { colors, scene, shadow, mode } = useThemeV2();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const goToLogin = () => safeGoBack(navigation, [AUTH_ROUTES.Login]);

  const send = async (isResend: boolean) => {
    setError('');

    if (!email.trim() || !isValidEmail(email.trim())) {
      setError('Escribe un correo válido.');
      return;
    }

    setSubmitting(true);

    try {
      await requestPasswordReset(email.trim());
      setSent(true);
      if (isResend) {
        toast.show('Te enviamos otro enlace');
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'No pudimos enviar el enlace. Inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthFormLayout
        barTitle="Recuperar contraseña"
        onBack={goToLogin}
        stateKey="sent"
      >
        <View
          style={[
            styles.disc,
            styles.sentDisc,
            {
              backgroundColor: colors.surface.raised,
              boxShadow:
                mode === 'light'
                  ? '0 1px 2px rgba(0,0,0,.05), 0 10px 24px rgba(0,0,0,.07)'
                  : shadow.subtle,
            },
          ]}
        >
          <Mail color={colors.text.primary} size={26} strokeWidth={2} />
        </View>
        <View style={styles.texts}>
          <TextV2 variant="title24" accessibilityRole="header">
            Revisa tu correo
          </TextV2>
          <TextV2 variant="body" tone="secondary">
            Te enviamos un enlace a{' '}
            <TextV2 variant="bodyStrong">{email.trim()}</TextV2>. Ábrelo desde
            este teléfono para crear tu contraseña nueva.
          </TextV2>
        </View>
        {error ? (
          <TextV2
            variant="meta"
            color={
              mode === 'light' ? colors.ember.deep : colors.ember.textOnDark
            }
          >
            {error}
          </TextV2>
        ) : null}
        <Button
          label="Volver a iniciar sesión"
          onPress={goToLogin}
          style={styles.cta}
        />
        <Button
          variant="text"
          label="Reenviar"
          loading={submitting}
          loadingLabel="Reenviando…"
          onPress={() => send(true)}
          style={styles.resend}
        />
      </AuthFormLayout>
    );
  }

  return (
    <AuthFormLayout barTitle="Recuperar contraseña" onBack={goToLogin}>
      <View
        style={[
          styles.disc,
          {
            backgroundColor: mode === 'light' ? scene.plate : scene.deep,
          },
        ]}
      >
        <Lock color={scene.onDark.primary} size={24} strokeWidth={2} />
      </View>
      <View style={styles.texts}>
        <TextV2 variant="title24" accessibilityRole="header">
          ¿Olvidaste tu contraseña?
        </TextV2>
        <TextV2 variant="body" tone="secondary">
          Escribe tu correo y te enviamos un enlace para crear una nueva.
        </TextV2>
      </View>
      {!isSupabaseConfigured ? (
        <TextV2 variant="meta" tone="secondary">
          Supabase no está configurado todavía. Agrega SUPABASE_URL y
          SUPABASE_ANON_KEY en .env para habilitar este flujo.
        </TextV2>
      ) : null}
      <TextField
        label="Correo electrónico"
        icon={Mail}
        value={email}
        onChangeText={value => {
          setEmail(value);
          setError('');
        }}
        error={error || undefined}
        placeholder="tu@ejemplo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={() => send(false)}
      />
      <Button
        label="Enviar enlace"
        loading={submitting}
        loadingLabel="Enviando…"
        onPress={() => send(false)}
        style={styles.ctaForm}
      />
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  disc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The confirmation starts 20 pt lower than the form (150 vs 130).
  sentDisc: {
    marginTop: 20,
  },
  texts: {
    gap: 8,
  },
  ctaForm: {
    marginTop: 4,
  },
  cta: {
    marginTop: 6,
  },
  resend: {
    alignSelf: 'center',
    height: 40,
  },
});
