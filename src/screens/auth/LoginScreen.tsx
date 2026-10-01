import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock, Mail } from 'lucide-react-native';
import {
  AuthHeroLayout,
  Button,
  PressableScale,
  TextField,
  TextV2,
  ThemeToggleButton,
} from '@app/components/v2';
import { AUTH_ROUTES } from '@app/constants/routes';
import {
  toLoginError,
  type LoginErrorView,
} from '@app/features/auth/loginError';
import { useAuth } from '@app/hooks/useAuth';
import type { AuthStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const HERO_PHOTO = require('@app/assets/v2/photos/overhead.jpg');

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// AUTH_01 / AUTH_02 · Iniciar sesión (Auth.dc.html).
export function LoginScreen({ navigation }: Props) {
  const { signIn, isSupabaseConfigured } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<LoginErrorView | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

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
    setError(null);

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
    } catch (nextError) {
      setError(
        toLoginError(
          nextError instanceof Error
            ? nextError.message
            : 'Correo o contraseña incorrectos.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Typing clears the error (handoff §7 · Error · credenciales).
  const clearErrors = (field: 'email' | 'password') => {
    setError(null);
    setFieldErrors(current =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  };

  return (
    <AuthHeroLayout
      photo={HERO_PHOTO}
      title="Qué bueno verte de nuevo."
      topRight={<ThemeToggleButton />}
      footer={
        <View style={styles.footer}>
          <TextV2 variant="body" tone="secondary">
            ¿Primera vez aquí?
          </TextV2>
          <PressableScale
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => navigation.navigate(AUTH_ROUTES.Register)}
          >
            <TextV2 variant="bodyStrong">Crear cuenta</TextV2>
          </PressableScale>
        </View>
      }
    >
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
          clearErrors('email');
        }}
        error={fieldErrors.email}
        placeholder="tu@ejemplo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Contraseña"
        icon={Lock}
        secure
        value={password}
        onChangeText={value => {
          setPassword(value);
          clearErrors('password');
        }}
        error={fieldErrors.password ?? error?.text}
        invalid={
          Boolean(fieldErrors.password) || Boolean(error?.ringOnPassword)
        }
        placeholder="Tu contraseña"
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />
      <PressableScale
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => navigation.navigate(AUTH_ROUTES.ForgotPassword)}
        style={styles.forgot}
      >
        <TextV2 variant="label">¿Olvidaste tu contraseña?</TextV2>
      </PressableScale>
      <Button
        label="Iniciar sesión"
        loading={submitting}
        loadingLabel="Entrando…"
        onPress={handleSubmit}
        style={styles.cta}
      />
    </AuthHeroLayout>
  );
}

const styles = StyleSheet.create({
  forgot: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
  },
  cta: {
    marginTop: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
});
