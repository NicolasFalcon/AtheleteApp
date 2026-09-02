import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  EmailIcon,
  PrivacyIcon,
  ProfileIcon,
  SuccessIcon,
} from '@app/assets/icons';
import { AuthButton } from '@app/components/auth/AuthButton';
import { BrandHeader } from '@app/components/auth/BrandHeader';
import { AuthScreenLayout } from '@app/components/auth/AuthScreenLayout';
import { AuthTextField } from '@app/components/auth/AuthTextField';
import { FormMessage } from '@app/components/auth/FormMessage';
import { AUTH_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import {safeGoBack} from '@app/navigation/safeGoBack';
import type { AuthStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function RegisterScreen({ navigation }: Props) {
  const { signUp, isSupabaseConfigured } = useAuth();
  const { theme } = useAppTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const styles = createStyles(theme);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) {
      nextErrors.name = 'El nombre es obligatorio';
    }

    if (!email.trim()) {
      nextErrors.email = 'El correo es obligatorio';
    } else if (!isValidEmail(email)) {
      nextErrors.email = 'Correo inválido';
    }

    if (!password) {
      nextErrors.password = 'La contraseña es obligatoria';
    } else if (password.length < 6) {
      nextErrors.password = 'Mínimo 6 caracteres';
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    setFormError('');

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      await signUp(name.trim(), email.trim(), password);
      setEmailSent(true);
    } catch (nextError) {
      setFormError(
        nextError instanceof Error
          ? nextError.message
          : 'Error al crear la cuenta',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <AuthScreenLayout
        centered
        footer={
          <AuthButton
            label="Volver a iniciar sesión"
            onPress={() => safeGoBack(navigation, [AUTH_ROUTES.Login])}
            variant="secondary"
          />
        }
        header={
          <BrandHeader
            compact
            subtitle="Te enviamos un enlace para verificar tu cuenta antes de continuar."
            title="Revisa tu correo"
          />
        }
        onBack={() => safeGoBack(navigation, [AUTH_ROUTES.Login])}
      >
        <View style={styles.successBody}>
          <SuccessIcon color={theme.colors.textPrimary} />
          <FormMessage
            appearance="dark"
            message={`Enviamos un enlace de verificación a ${email}. Verifica tu correo para continuar.`}
            tone="success"
          />
        </View>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      backLabel="Volver"
      footer={
        <Text style={styles.footerText}>
          ¿Ya tienes cuenta?{' '}
          <Text
            onPress={() => safeGoBack(navigation, [AUTH_ROUTES.Login])}
            style={styles.footerLink}
          >
            Iniciar sesión
          </Text>
        </Text>
      }
      header={
        <BrandHeader
          subtitle="Empieza hoy y construye tu progreso con Athelete."
          title="Crea tu cuenta"
        />
      }
      onBack={() => safeGoBack(navigation, [AUTH_ROUTES.Login])}
    >
      {formError ? (
        <FormMessage appearance="dark" message={formError} tone="error" />
      ) : null}
      {!isSupabaseConfigured ? (
        <FormMessage
          appearance="dark"
          message="Supabase no está configurado todavía. Agrega SUPABASE_URL y SUPABASE_ANON_KEY en .env para habilitar este flujo."
          tone="neutral"
        />
      ) : null}
      <AuthTextField
        error={fieldErrors.name}
        icon={<ProfileIcon color={theme.colors.textSecondary} />}
        label="Nombre"
        onChangeText={setName}
        placeholder="Tu nombre"
        textContentType="name"
        value={name}
      />
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
        textContentType="newPassword"
        value={password}
      />
      <AuthTextField
        autoCapitalize="none"
        error={fieldErrors.confirmPassword}
        icon={<PrivacyIcon color={theme.colors.textSecondary} />}
        label="Confirmar contraseña"
        onChangeText={setConfirmPassword}
        placeholder="••••••••"
        passwordToggle
        textContentType="newPassword"
        value={confirmPassword}
      />
      <AuthButton
        label={submitting ? 'Creando cuenta…' : 'Crear cuenta'}
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
    successBody: {
      alignItems: 'center',
      gap: theme.spacing.xl,
    },
  });
}
