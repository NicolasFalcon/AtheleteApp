import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { TextV2, useThemeV2 } from '@app/components/v2';
import {
  deviceLanguage,
  isSocialCancel,
  socialCopy,
  socialErrorKind,
} from '@app/features/auth/socialSignIn';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { em } from '@app/theme/v2/typography';
import { useAuth } from '@app/hooks/useAuth';
import { appleSignInAvailable } from '@app/services/supabase/appleAuth';

const HEIGHT = 56;

// Login / Registro · the social buttons above the email form, then "O CON TU
// CORREO". Today Apple only, iOS only (Apple's official button: black on
// light, white on dark; `appleStyle="white"` on a dark scene like Login).
// Google will be one more row with the same pattern. After signing in, the
// app routes exactly like with email (AuthProvider).
export function SocialSignIn({
  mode,
  disabled = false,
  appleStyle = 'auto',
}: {
  mode: 'signIn' | 'signUp';
  disabled?: boolean;
  appleStyle?: 'auto' | 'white';
}) {
  const { colors, type } = useThemeV2();
  const { isDark } = useAppTheme();
  const { signInWithApple } = useAuth();
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const language = deviceLanguage();
  const copy = socialCopy(language);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    let alive = true;
    appleSignInAvailable().then(available => {
      if (alive) {
        setApple(available);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!apple) {
    return null;
  }

  const onApple = async () => {
    if (busy || disabled) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await signInWithApple();
    } catch (nextError) {
      if (!isSocialCancel(nextError)) {
        setError(copy.errors[socialErrorKind(nextError)]);
        if (__DEV__) {
          console.warn('[apple] Inicio de sesión fallido:', nextError);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.block}>
      <View style={busy || disabled ? styles.busy : null} pointerEvents={busy || disabled ? 'none' : 'auto'}>
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            mode === 'signUp'
              ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
              : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
          }
          buttonStyle={
            appleStyle === 'white' || isDark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={HEIGHT / 2}
          style={styles.apple}
          onPress={() => {
            onApple().catch(() => undefined);
          }}
        />
      </View>
      {error ? (
        <TextV2 variant="meta" color={colors.ember.deep} accessibilityLiveRegion="polite">
          {error}
        </TextV2>
      ) : null}
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
        <TextV2
          variant="micro"
          tone="secondary"
          style={{ letterSpacing: em(0.2, type.micro.fontSize) }}
        >
          {copy.divider.toUpperCase()}
        </TextV2>
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  apple: { height: HEIGHT, width: '100%' },
  busy: { opacity: 0.6 },
});
