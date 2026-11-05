import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackButton,
  Button,
  GlassSurface,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { useCoachText } from '@app/features/coach/coachCopy';
import { coachErrorMessage } from '@app/features/coach/coachModel';
import { useCoachMutations, useCoachPreview, useMyCoach } from '@app/features/coach/useCoach';
import { CoachAvatar } from '@app/features/coach/v2/CoachParts';
import { ShareRows } from '@app/features/coach/v2/ShareRows';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { CoachError } from '@app/services/coach/coachService';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'CoachConsent'>;

// Consentimiento (§30.4): who the coach is (coach_preview_invite) and the
// three categories (Entrenamientos required; Nutrición and Peso y sueño off
// by default). "Aceptar" = coach_accept_invite (the link is active at once).
// From an invitation link it opens straight here; its errors show here.
export function CoachConsentScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t, language } = useCoachText();
  const { code, via } = route.params;
  const preview = useCoachPreview(code);
  const linked = preview.error instanceof CoachError && preview.error.code === 'already_linked';
  const mine = useMyCoach(linked);
  const { acceptInvite } = useCoachMutations();
  const [shares, setShares] = useState({ nutrition: false, body: false });
  const coach = preview.data ?? null;

  const leave = () => {
    const routes = navigation.getState().routes;
    const below = routes[routes.length - 2]?.name;
    if (via === 'code' && below === APP_ROUTES.CoachJoin && routes.length > 2) {
      navigation.pop(2);
    } else {
      safeGoBack(navigation, [ROOT_ROUTES.MainTabs]);
    }
  };

  const accept = () => {
    if (!coach) {
      return;
    }
    acceptInvite.mutate(
      { code, shareNutrition: shares.nutrition, shareBody: shares.body },
      {
        onSuccess: () => {
          toast.show(t('coach.consent.linked', { name: coach.name }));
          leave();
        },
        onError: error => Alert.alert(t('coach.consent.failed'), coachErrorMessage(error, language, mine.data?.coach?.name)),
      },
    );
  };

  let body;
  if (preview.isError) {
    body = (
      <View style={styles.errorBlock}>
        <TextV2 variant="title22">{t('coach.consent.failed')}</TextV2>
        <TextV2 variant="bodyL" tone="secondary">
          {coachErrorMessage(preview.error, language, mine.data?.coach?.name)}
        </TextV2>
        <Button label={t('coach.cancel')} variant="secondary" onPress={() => safeGoBack(navigation, [ROOT_ROUTES.MainTabs])} />
      </View>
    );
  } else if (!coach) {
    body = (
      <SkeletonGroup>
        <View style={styles.center}>
          <Skeleton width={96} height={96} radius={48} />
          <Skeleton width={200} height={28} />
          <Skeleton width={240} height={14} />
          <Skeleton height={300} radius={24} />
        </View>
      </SkeletonGroup>
    );
  } else {
    body = (
      <>
        <View style={styles.center}>
          <CoachAvatar name={coach.name} avatar={coach.avatar} size={88} ring dark style={styles.selfCenter} />
          <TextV2 variant="title28" align="center" accessibilityRole="header">
            {coach.name}
          </TextV2>
          <TextV2 variant="body" tone="secondary" align="center">
            {coach.bio ?? t('coach.consent.coach')}
          </TextV2>
          <TextV2 variant="bodyL" align="center" style={styles.wants}>
            {t('coach.consent.wants')}
          </TextV2>
        </View>
        <ShareRows nutrition={shares.nutrition} body={shares.body} onChange={setShares} />
        <TextV2 variant="body" tone="secondary" align="center">
          {t('coach.consent.change')}
        </TextV2>
      </>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: layout.gutter,
          paddingBottom: insets.bottom + (coach ? 180 : 40),
          gap: 22,
        }}
      >
        <View style={styles.back}>
          <BackButton onPress={() => safeGoBack(navigation, [ROOT_ROUTES.MainTabs])} />
        </View>
        {body}
      </ScrollView>
      {coach ? (
        <GlassSurface
          kind="nav"
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: colors.divider, paddingHorizontal: layout.gutter },
          ]}
        >
          <Button
            label={t('coach.consent.accept')}
            variant="commit"
            loading={acceptInvite.isPending}
            onPress={accept}
          />
          <Button label={t('coach.cancel')} variant="text" onPress={leave} />
        </GlassSurface>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  back: { alignSelf: 'flex-start' },
  center: { alignItems: 'center', gap: 8 },
  selfCenter: { alignSelf: 'center', marginBottom: 6 },
  wants: { marginTop: 8 },
  errorBlock: { gap: 14, paddingTop: 24 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, gap: 4, borderTopWidth: StyleSheet.hairlineWidth },
});
