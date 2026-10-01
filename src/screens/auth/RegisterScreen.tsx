import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock, Mail, User } from 'lucide-react-native';
import {
  AuthFormLayout,
  AuthHeroLayout,
  BackButton,
  Button,
  PressableScale,
  RequirementList,
  TextField,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { AUTH_ROUTES } from '@app/constants/routes';
import {
  allRequirementsMet,
  registerPasswordRequirements,
} from '@app/features/auth/passwordRules';
import { useAuth } from '@app/hooks/useAuth';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AuthStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const HERO_PHOTO = require('@app/assets/v2/photos/barra-mujer.jpg');

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// AUTH_03 · Crear cuenta (Auth.dc.html). Requirements are checked live with
// an Ember check; the CTA stays inactive until name, email and password are
// valid. After sign-up Supabase asks to verify the email (kept from v1).
export function RegisterScreen({ navigation }: Props) {
  const { signUp, isSupabaseConfigured } = useAuth();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [formError, setFormError] = useState('');
  const [emailError, setEmailError] = useState('');

  const requirements = registerPasswordRequirements(password);
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    allRequirementsMet(requirements);

  const goToLogin = () => safeGoBack(navigation, [AUTH_ROUTES.Login]);

  const handleSubmit = async () => {
    setFormError('');

    if (!canSubmit) {
      return;
    }

    if (!isValidEmail(email.trim())) {
      setEmailError('Revisa el formato del correo.');
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
          : 'No pudimos crear la cuenta. Inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (emailSent) {
    return <VerifyEmailState email={email.trim()} onDone={goToLogin} />;
  }

  return (
    <AuthHeroLayout
      photo={HERO_PHOTO}
      heroHeight={230}
      brand="eyebrow"
      scrim="authShort"
      title="Crea tu cuenta"
      topLeft={<BackButton variant="glass" onPress={goToLogin} />}
      footer={
        <View style={styles.footer}>
          <TextV2 variant="caption" tone="tertiary" align="center">
            Al continuar aceptas los Términos y la Política de privacidad.
          </TextV2>
          <View style={styles.loginRow}>
            <TextV2 variant="body" tone="secondary">
              ¿Ya tienes cuenta?
            </TextV2>
            <PressableScale
              accessibilityRole="button"
              hitSlop={10}
              onPress={goToLogin}
            >
              <TextV2 variant="bodyStrong">Iniciar sesión</TextV2>
            </PressableScale>
          </View>
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
        label="Nombre"
        icon={User}
        value={name}
        onChangeText={value => {
          setName(value);
          setFormError('');
        }}
        placeholder="Tu nombre"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
        label="Correo electrónico"
        icon={Mail}
        value={email}
        onChangeText={value => {
          setEmail(value);
          setEmailError('');
          setFormError('');
        }}
        error={emailError || undefined}
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
          setFormError('');
        }}
        error={formError || undefined}
        invalid={false}
        placeholder="Crea una contraseña"
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      <RequirementList requirements={requirements} />
      <Button
        label="Crear cuenta"
        disabled={!canSubmit}
        loading={submitting}
        loadingLabel="Creando cuenta…"
        onPress={handleSubmit}
        style={styles.cta}
      />
    </AuthHeroLayout>
  );
}

// Email verification required by Supabase sign-up. Not in the prototype
// (it jumps to the intro); styled like "Revisa tu correo" of AUTH_05.
function VerifyEmailState({
  email,
  onDone,
}: {
  email: string;
  onDone: () => void;
}) {
  const { colors, shadow, mode } = useThemeV2();

  return (
    <AuthFormLayout barTitle="Crear cuenta" onBack={onDone} stateKey="sent">
      <View
        style={[
          styles.disc,
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
          Te enviamos un enlace a <TextV2 variant="bodyStrong">{email}</TextV2>{' '}
          para verificar tu cuenta antes de continuar.
        </TextV2>
      </View>
      <Button label="Volver a iniciar sesión" onPress={onDone} />
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  cta: {
    marginTop: 6,
  },
  footer: {
    gap: 14,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  disc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    gap: 8,
  },
});
