import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandHeader } from '@app/components/auth/BrandHeader';
import { AuthScreenLayout } from '@app/components/auth/AuthScreenLayout';
import { FormMessage } from '@app/components/auth/FormMessage';
import { AUTH_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { AuthStackParamList } from '@app/types/navigation';
import { AppTextInput, Button } from '@app/components/ui';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginScreen({ navigation }: Props) {
  const { signIn, isSupabaseConfigured } = useAuth();
  const { theme } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const styles = StyleSheet.create({
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
    helperLink: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
    },
    accessory: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
    },
  });

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
          subtitle="Inicia sesión para continuar tu entrenamiento"
          title="Bienvenido a Athelete"
        />
      }
    >
      {error ? <FormMessage message={error} tone="error" /> : null}
      {!isSupabaseConfigured ? (
        <FormMessage
          message="Supabase no está configurado todavía. Agrega SUPABASE_URL y SUPABASE_ANON_KEY en .env para habilitar este flujo."
          tone="neutral"
        />
      ) : null}
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
            style={styles.accessory}
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </Text>
        }
        secureTextEntry={!showPassword}
        textContentType="password"
        value={password}
      />
      <Pressable
        onPress={() => navigation.navigate(AUTH_ROUTES.ForgotPassword)}
      >
        <Text style={styles.helperLink}>¿Olvidaste tu contraseña?</Text>
      </Pressable>
      <Button
        label={submitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
        loading={submitting}
        onPress={handleSubmit}
      />
    </AuthScreenLayout>
  );
}
