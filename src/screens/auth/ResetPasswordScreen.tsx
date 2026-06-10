import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrivacyIcon, SuccessIcon } from '@app/assets/icons';
import { AuthButton } from '@app/components/auth/AuthButton';
import { AuthScreenLayout } from '@app/components/auth/AuthScreenLayout';
import { AuthTextField } from '@app/components/auth/AuthTextField';
import { BrandHeader } from '@app/components/auth/BrandHeader';
import { FormMessage } from '@app/components/auth/FormMessage';
import { AUTH_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { AuthStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation }: Props) {
  const {
    finishPasswordRecovery,
    isPasswordRecoveryActive,
    passwordRecoveryError,
    updateRecoveredPassword,
  } = useAuth();
  const { theme } = useAppTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const styles = createStyles(theme);

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

  const validate = () => {
    if (password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (password !== confirmPassword) {
      return 'Las contraseñas no coinciden.';
    }

    return '';
  };

  const handleSubmit = async () => {
    setError('');

    const validationError = validate();

    if (validationError) {
      setError(validationError);
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
      <AuthScreenLayout
        centered
        footer={
          <AuthButton
            label="Solicitar nuevo enlace"
            onPress={() => {
              navigation.reset({
                index: 0,
                routes: [{ name: AUTH_ROUTES.ForgotPassword }],
              });
            }}
            variant="secondary"
          />
        }
        header={
          <BrandHeader
            compact
            subtitle="El enlace no está disponible o ya expiró."
            title="Recuperación no disponible"
          />
        }
        onBack={goToLogin}
      >
        <FormMessage
          appearance="dark"
          message={
            passwordRecoveryError ||
            'Abre el enlace más reciente desde tu correo o solicita uno nuevo.'
          }
          tone="error"
        />
      </AuthScreenLayout>
    );
  }

  if (success) {
    return (
      <AuthScreenLayout
        centered
        footer={<AuthButton label="Ir a iniciar sesión" onPress={goToLogin} />}
        header={
          <BrandHeader
            compact
            subtitle="Ya puedes entrar con tu nueva contraseña."
            title="Contraseña actualizada"
          />
        }
      >
        <View style={styles.body}>
          <SuccessIcon color={theme.colors.textPrimary} />
          <FormMessage
            appearance="dark"
            message="Ya puedes iniciar sesión con tu nueva contraseña."
            tone="success"
          />
        </View>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      backLabel="Cancelar"
      header={
        <BrandHeader
          compact
          subtitle="Elige una contraseña segura para proteger tu cuenta."
          title="Crea una nueva contraseña"
        />
      }
      onBack={goToLogin}
    >
      {error ? (
        <FormMessage appearance="dark" message={error} tone="error" />
      ) : null}
      <AuthTextField
        autoCapitalize="none"
        icon={<PrivacyIcon color={theme.colors.textSecondary} />}
        label="Nueva contraseña"
        onChangeText={setPassword}
        placeholder="Mínimo 6 caracteres"
        passwordToggle
        textContentType="newPassword"
        value={password}
      />
      <AuthTextField
        autoCapitalize="none"
        icon={<PrivacyIcon color={theme.colors.textSecondary} />}
        label="Confirmar contraseña"
        onChangeText={setConfirmPassword}
        placeholder="Repite la contraseña"
        passwordToggle
        textContentType="newPassword"
        value={confirmPassword}
      />
      <AuthButton
        label={submitting ? 'Guardando…' : 'Guardar contraseña'}
        loading={submitting}
        onPress={handleSubmit}
      />
    </AuthScreenLayout>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    body: {
      alignItems: 'center',
      gap: theme.spacing.xl,
    },
  });
}
