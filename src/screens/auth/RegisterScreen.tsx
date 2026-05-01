import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandHeader } from '@app/components/auth/BrandHeader';
import { AuthScreenLayout } from '@app/components/auth/AuthScreenLayout';
import { FormMessage } from '@app/components/auth/FormMessage';
import { AUTH_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { AuthStackParamList } from '@app/types/navigation';
import { AppTextInput, Button } from '@app/components/ui';

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
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const styles = StyleSheet.create({
    accessory: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
    },
    footerText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      textAlign: 'center',
    },
    footerLink: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontWeight: theme.typography.weights.medium,
    },
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
            subtitle="Te enviamos un enlace para verificar tu cuenta antes de continuar."
            title="Revisa tu correo"
          />
        }
        onBack={() => navigation.navigate(AUTH_ROUTES.Login)}>
        <View style={styles.successBody}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✉️</Text>
          </View>
          <FormMessage
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
            onPress={() => navigation.navigate(AUTH_ROUTES.Login)}
            style={styles.footerLink}>
            Iniciar sesión
          </Text>
        </Text>
      }
      header={
        <BrandHeader
          subtitle="Comienza tu camino fitness con Athelete"
          title="Crear cuenta"
        />
      }
      onBack={() => navigation.goBack()}>
      {formError ? <FormMessage message={formError} tone="error" /> : null}
      {!isSupabaseConfigured ? (
        <FormMessage
          message="Supabase no está configurado todavía. Agrega SUPABASE_URL y SUPABASE_ANON_KEY en .env para habilitar este flujo."
          tone="neutral"
        />
      ) : null}
      <AppTextInput
        error={fieldErrors.name}
        label="Nombre"
        onChangeText={setName}
        placeholder="Tu nombre"
        textContentType="name"
        value={name}
      />
      <AppTextInput
        autoCapitalize="none"
        autoCorrect={false}
        error={fieldErrors.email}
        keyboardType="email-address"
        label="Correo electrónico"
        onChangeText={setEmail}
        placeholder="tu@ejemplo.com"
        textContentType="emailAddress"
        value={email}
      />
      <AppTextInput
        autoCapitalize="none"
        autoCorrect={false}
        error={fieldErrors.password}
        label="Contraseña"
        onChangeText={setPassword}
        placeholder="••••••••"
        rightAccessory={
          <Text
            onPress={() => setShowPassword(current => !current)}
            style={styles.accessory}>
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </Text>
        }
        secureTextEntry={!showPassword}
        textContentType="newPassword"
        value={password}
      />
      <AppTextInput
        autoCapitalize="none"
        autoCorrect={false}
        error={fieldErrors.confirmPassword}
        label="Confirmar contraseña"
        onChangeText={setConfirmPassword}
        placeholder="••••••••"
        secureTextEntry={!showPassword}
        textContentType="newPassword"
        value={confirmPassword}
      />
      <Button
        label={submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        loading={submitting}
        onPress={handleSubmit}
      />
    </AuthScreenLayout>
  );
}
