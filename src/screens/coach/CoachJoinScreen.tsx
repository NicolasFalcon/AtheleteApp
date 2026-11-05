import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Globe } from 'lucide-react-native';
import { BackButton, Button, StatusBarV2, TextV2, useThemeV2 } from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { useCoachText } from '@app/features/coach/coachCopy';
import { coachErrorMessage, inviteCodeReady, normalizeInviteCode } from '@app/features/coach/coachModel';
import { coachKeys } from '@app/features/coach/useCoach';
import { antonStyle } from '@app/features/coach/v2/CoachParts';
import { useAuth } from '@app/hooks/useAuth';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { CoachError, coachService } from '@app/services/coach/coachService';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'CoachJoin'>;

// Perfil › Tengo un coach (§30.4): the code in a big ATH-XXXX field (a whole
// invitation link pasted there works too). "Continuar" (7+ characters) runs
// coach_preview_invite and opens the consent; its errors stay here with the
// error ring.
export function CoachJoinScreen({ navigation, route }: Props) {
  const { colors, layout, fonts } = useThemeV2();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t, language } = useCoachText();
  const [input, setInput] = useState(route.params?.code ?? '');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const ready = inviteCodeReady(input);

  const next = async () => {
    const code = normalizeInviteCode(input);
    setChecking(true);
    setError(null);
    try {
      await queryClient.fetchQuery({
        queryKey: coachKeys.preview(code),
        queryFn: () => coachService.previewInvite(code),
        staleTime: 60_000,
      });
      navigation.navigate(APP_ROUTES.CoachConsent, { code, via: 'code' });
    } catch (failure) {
      queryClient.removeQueries({ queryKey: coachKeys.preview(code) });
      let current: string | null = null;
      if (failure instanceof CoachError && failure.code === 'already_linked') {
        current =
          (
            await queryClient
              .fetchQuery({ queryKey: coachKeys.mine(profile?.id), queryFn: () => coachService.getMyCoach() })
              .catch(() => null)
          )?.coach?.name ?? null;
      }
      setError(coachErrorMessage(failure, language, current));
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: layout.gutter,
          paddingBottom: insets.bottom + 32,
          gap: 18,
        }}
      >
        <View style={styles.back}>
          <BackButton onPress={() => safeGoBack(navigation, [ROOT_ROUTES.MainTabs])} />
        </View>
        <View style={styles.eyebrow}>
          <View style={[styles.dot, { backgroundColor: colors.ember.base }]} />
          <TextV2 variant="eyebrow" tone="ember">
            {t('coach.brand')}
          </TextV2>
        </View>
        <TextV2 accessibilityRole="header" style={[antonStyle(fonts.display, 52), styles.upper]}>
          {t('coach.join.title')}
        </TextV2>
        <TextV2 variant="bodyL" tone="secondary">
          {t('coach.join.body')}
        </TextV2>
        <TextInput
          value={input}
          onChangeText={value => {
            setInput(value);
            setError(null);
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="go"
          onSubmitEditing={() => {
            if (ready && !checking) {
              next().catch(() => undefined);
            }
          }}
          placeholder={t('coach.join.placeholder')}
          placeholderTextColor={colors.text.tertiary}
          accessibilityLabel={t('coach.join.label')}
          style={[
            antonStyle(fonts.display, 44),
            styles.input,
            {
              backgroundColor: colors.surface.muted,
              color: colors.text.primary,
              borderColor: error ? colors.ember.base : 'transparent',
            },
          ]}
        />
        {error ? (
          <TextV2 variant="body" tone="ember" accessibilityLiveRegion="polite">
            {error}
          </TextV2>
        ) : null}
        <Button
          label={t('coach.join.continue')}
          disabled={!ready}
          loading={checking}
          onPress={() => {
            next().catch(() => undefined);
          }}
        />
        <View style={styles.or}>
          <View style={[styles.line, { backgroundColor: colors.divider }]} />
          <TextV2 variant="body" tone="secondary">
            {t('coach.join.or')}
          </TextV2>
          <View style={[styles.line, { backgroundColor: colors.divider }]} />
        </View>
        <Button
          label={t('coach.join.link')}
          icon={Globe}
          variant="outline"
          onPress={() => Alert.alert(t('coach.join.link.title'), t('coach.join.link.body'), [{ text: t('coach.join.ok') }])}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  back: { alignSelf: 'flex-start', marginBottom: 12 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  upper: { textTransform: 'uppercase' },
  input: { height: 96, borderRadius: 26, textAlign: 'center', borderWidth: 2, paddingHorizontal: 12 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});
