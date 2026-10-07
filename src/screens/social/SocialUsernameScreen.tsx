import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackButton,
  Button,
  Eyebrow,
  GlassHeader,
  GlassSurface,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { ROOT_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import {
  LEGAL_IS_PLACEHOLDER,
  TERMS_URL,
} from '@app/constants/legal';
import {
  USERNAME_ERRORS,
  USERNAME_MAX,
  USERNAME_MIN,
  validateUsername,
  type UsernameError,
} from '@app/features/social/socialModel';
import { useSocialResource, useSocialService } from '@app/features/social/useSocial';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialUsername'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Elegir o editar el nombre de usuario. No hay diseño en el handoff (D-79):
// sigue el paso "nombre" del onboarding (pregunta a 32 pt, campo con línea,
// "Siguiente" fijo). El backend lo exige antes de usar Comunidad
// (`ensure_social_settings`); desde Privacidad social se edita (`set_username`).
export function SocialUsernameScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useSocialService();
  const settings = useSocialResource('getSettings', s => s.getSettings());
  const { mode, devText, devError } = route.params;
  const creating = mode === 'create';
  const [text, setText] = useState(devText ?? '');
  const [submitted, setSubmitted] = useState(Boolean(devError));
  const [serverError, setServerError] = useState<'username_taken' | null>(
    devError ?? null,
  );
  const [saving, setSaving] = useState(false);

  const current = settings.data?.username ?? null;
  const check = validateUsername(text);
  // "Mínimo 3" only shows after trying to continue; the rest shows as you type.
  const liveError: UsernameError | null =
    text.length > 0 && !check.ok && check.error !== 'too_short'
      ? check.error
      : null;
  const submitError: UsernameError | null =
    submitted && !check.ok ? check.error : null;
  const message = serverError
    ? USERNAME_ERRORS[serverError]
    : USERNAME_ERRORS[(liveError ?? submitError) as UsernameError] ?? null;
  const showError = Boolean(serverError || liveError || submitError);
  const unchanged = check.ok && check.value === current;
  const canSubmit = check.ok && !unchanged && !saving;

  const leave = () => {
    if (creating) {
      // No username, no Comunidad: back to Inicio.
      navigation.navigate(ROOT_ROUTES.MainTabs, { screen: TAB_ROUTES.Home });
    } else {
      safeGoBack(navigation, BACK_FALLBACKS);
    }
  };

  const submit = async () => {
    setSubmitted(true);
    if (!check.ok || saving || unchanged) {
      return;
    }
    setSaving(true);
    setServerError(null);
    try {
      const result = await service.setUsername(check.value);
      if (result.ok) {
        toast.show(creating ? 'Ya puedes usar Comunidad' : 'Usuario guardado');
        safeGoBack(navigation, BACK_FALLBACKS);
      } else if (result.error === 'username_taken') {
        setServerError('username_taken');
      } else {
        setSubmitted(true);
      }
    } catch {
      toast.show('No se pudo guardar. Inténtalo de nuevo.', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const openTerms = () => {
    if (LEGAL_IS_PLACEHOLDER) {
      // TODO(testflight): BT-43 · real Terms page.
      toast.show('Los Términos estarán disponibles antes de TestFlight');
      return;
    }
    Linking.openURL(TERMS_URL).catch(() => {});
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: colors.bg }]}
    >
      <StatusBarV2 />
      <GlassHeader left={<BackButton onPress={leave} />} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: layout.gutter },
        ]}
      >
        <View style={styles.gap10}>
          <Eyebrow>{creating ? 'Comunidad' : 'Tu perfil social'}</Eyebrow>
          <TextV2 accessibilityRole="header" style={styles.question}>
            {creating ? 'Elige tu nombre de usuario' : 'Tu nombre de usuario'}
          </TextV2>
        </View>

        <View style={styles.gap10}>
          <View
            style={[
              styles.inputRow,
              {
                borderBottomColor: showError
                  ? colors.ember.deep
                  : colors.text.primary,
              },
            ]}
          >
            <TextV2 style={styles.at} tone="tertiary">
              @
            </TextV2>
            <TextInput
              value={text}
              onChangeText={value => {
                setText(value.replace(/\s/g, ''));
                setServerError(null);
              }}
              placeholder={current ?? 'tu.usuario'}
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              maxLength={USERNAME_MAX + 1}
              returnKeyType="done"
              onSubmitEditing={submit}
              accessibilityLabel="Nombre de usuario"
              selectionColor={colors.text.primary}
              style={[styles.input, { color: colors.text.primary }]}
            />
          </View>
          {showError && message ? (
            <TextV2
              variant="meta"
              accessibilityLiveRegion="polite"
              color={colors.ember.deep}
            >
              {message}
            </TextV2>
          ) : (
            <TextV2 variant="meta" tone="secondary">
              {`De ${USERNAME_MIN} a ${USERNAME_MAX} caracteres: letras, números, punto y guion bajo. Tus amigos te encuentran escribiéndolo completo.`}
            </TextV2>
          )}
        </View>

        {creating ? (
          <TextV2 variant="caption" tone="secondary">
            {'Al continuar aceptas los '}
            <TextV2
              variant="captionStrong"
              accessibilityRole="link"
              onPress={openTerms}
            >
              Términos de uso
            </TextV2>
            {' y las normas de la comunidad: respeto, sin contenido ofensivo. Puedes reportar y bloquear a cualquier persona.'}
          </TextV2>
        ) : null}
      </ScrollView>
      <GlassSurface
        kind="nav"
        style={[
          styles.footer,
          {
            paddingHorizontal: layout.gutter,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        <Button
          label={creating ? 'Continuar' : 'Guardar'}
          loading={saving}
          loadingLabel="Guardando"
          disabled={!canSubmit && !(submitted && !check.ok)}
          onPress={submit}
        />
      </GlassSurface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingTop: 24, paddingBottom: 24, gap: 32 },
  gap10: { gap: 10 },
  question: { fontSize: 32, fontWeight: '600', letterSpacing: -0.8, lineHeight: 35 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    paddingTop: 6,
    paddingBottom: 12,
    gap: 4,
  },
  at: { fontSize: 32, fontWeight: '500', letterSpacing: -0.64 },
  input: { flex: 1, fontSize: 32, fontWeight: '500', letterSpacing: -0.64, padding: 0 },
  footer: { paddingTop: 12 },
});
