import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Lock, Unlink } from 'lucide-react-native';
import {
  AuthFormLayout,
  Button,
  RequirementList,
  TextField,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { AUTH_ROUTES } from '@app/constants/routes';
import {
  allRequirementsMet,
  resetPasswordRequirements,
} from '@app/features/auth/passwordRules';
import { useAuth } from '@app/hooks/useAuth';
import type { AuthStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

// AUTH_06 / AUTH_07 · Restablecer contraseña (Auth.dc.html). New password and
// confirmation with live requirements; success with an Ember check and the
// way back to Login. Recovery-session handling is unchanged.
export function ResetPasswordScreen({ navigation }: Props) {
  const {
    finishPasswordRecovery,
    isPasswordRecoveryActive,
    passwordRecoveryError,
    updateRecoveredPassword,
    session,
  } = useAuth();
  const { colors, mode } = useThemeV2();
  const confirmRef = useRef<TextInput>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const requirements = resetPasswordRequirements(password, confirmPassword);
  const canSubmit = allRequirementsMet(requirements);
  const errorColor =
    mode === 'light' ? colors.ember.deep : colors.ember.textOnDark;
  const email = session?.user?.email;

  const goToLogin = async () => {
    try {
      await finishPasswordRecovery();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'No se pudo cerrar la sesión de recuperación.',
      );
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!canSubmit) {
      return;
    }

    setSubmitting(true);

    try {
      await updateRecoveredPassword(password);
      setSuccess(true);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'No se pudo actualizar la contraseña.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (passwordRecoveryError || !isPasswordRecoveryActive) {
    return (
      <AuthFormLayout
        barTitle="Nueva contraseña"
        onBack={goToLogin}
        stateKey="unavailable"
      >
        <View style={[styles.disc, { backgroundColor: colors.surface.muted }]}>
          <Unlink color={colors.text.primary} size={24} strokeWidth={2} />
        </View>
        <View style={styles.texts}>
          <TextV2 variant="title24" accessibilityRole="header">
            El enlace ya no sirve
          </TextV2>
          <TextV2 variant="body" tone="secondary">
            {passwordRecoveryError ||
              'Caducó o ya se usó. Pide uno nuevo y ábrelo desde este teléfono.'}
          </TextV2>
        </View>
        <Button
          label="Pedir un enlace nuevo"
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: AUTH_ROUTES.ForgotPassword }],
            })
          }
          style={styles.cta}
        />
        <Button
          variant="text"
          label="Volver a iniciar sesión"
          onPress={goToLogin}
          style={styles.secondary}
        />
      </AuthFormLayout>
    );
  }

  if (success) {
    return (
      <AuthFormLayout barTitle="Nueva contraseña" stateKey="done" centered>
        <Animated.View
          entering={ZoomIn.duration(500)}
          style={[
            styles.successDisc,
            {
              backgroundColor: colors.ember.base,
              boxShadow: `0 0 0 10px ${colors.ember.glow[0]}`,
            },
          ]}
        >
          <Check color={colors.ember.onText} size={32} strokeWidth={2.5} />
        </Animated.View>
        <Animated.View
          entering={FadeInDown.duration(350).delay(150)}
          style={styles.successTexts}
        >
          <TextV2 variant="title24" align="center" accessibilityRole="header">
            Contraseña actualizada
          </TextV2>
          <TextV2 variant="body" tone="secondary" align="center">
            Ya puedes entrar con la nueva.
          </TextV2>
        </Animated.View>
        {error ? (
          <TextV2 variant="meta" color={errorColor} align="center">
            {error}
          </TextV2>
        ) : null}
        <Button
          label="Iniciar sesión"
          onPress={goToLogin}
          style={styles.successCta}
        />
      </AuthFormLayout>
    );
  }

  return (
    <AuthFormLayout barTitle="Nueva contraseña" onBack={goToLogin}>
      <View style={styles.texts}>
        <TextV2 variant="title24" accessibilityRole="header">
          Crea una contraseña nueva
        </TextV2>
        {email ? (
          <TextV2 variant="body" tone="secondary">
            Para {email}
          </TextV2>
        ) : null}
      </View>
      <TextField
        label="Nueva contraseña"
        icon={Lock}
        secure
        value={password}
        onChangeText={value => {
          setPassword(value);
          setError('');
        }}
        placeholder="Nueva contraseña"
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <TextField
        ref={confirmRef}
        label="Repite la contraseña"
        icon={Lock}
        secure
        value={confirmPassword}
        onChangeText={value => {
          setConfirmPassword(value);
          setError('');
        }}
        error={error || undefined}
        invalid={false}
        placeholder="Repítela"
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      <RequirementList requirements={requirements} />
      <Button
        label="Guardar contraseña"
        disabled={!canSubmit}
        loading={submitting}
        loadingLabel="Guardando…"
        onPress={handleSubmit}
        style={styles.cta}
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
  texts: {
    gap: 8,
  },
  cta: {
    marginTop: 6,
  },
  secondary: {
    alignSelf: 'center',
  },
  // The success moment sits lower (prototype padding-top 180 vs 130).
  successDisc: {
    marginTop: 50,
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTexts: {
    gap: 14,
    marginTop: 8,
    alignItems: 'center',
  },
  successCta: {
    marginTop: 14,
    alignSelf: 'stretch',
  },
});
