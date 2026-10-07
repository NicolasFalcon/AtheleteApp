import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AtSign,
  Award,
  Dumbbell,
  Image as ImageIcon,
  LifeBuoy,
  ListChecks,
  Scale,
  ShieldOff,
  Trophy,
  UserPlus,
  FileText,
  type LucideIcon,
} from 'lucide-react-native';
import {
  BackButton,
  Eyebrow,
  GlassHeader,
  Row,
  Segmented,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  SwitchV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import {
  LEGAL_IS_PLACEHOLDER,
  SUPPORT_EMAIL,
  TERMS_URL,
} from '@app/constants/legal';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import {
  AUDIENCE_OPTIONS,
  PRIVACY_ROWS,
  audienceLine,
  privacyPreview,
  type PrivacyRowKey,
} from '@app/features/social/socialModel';
import type { SocialAudience } from '@app/features/social/socialTypes';
import {
  useSocialResource,
  useSocialService,
} from '@app/features/social/useSocial';
import { BlockError } from '@app/features/home/v2/BlockError';
import { SettingsSection } from '@app/features/profile/v2/SettingsParts';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialPrivacy'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

const ROW_ICONS: Record<PrivacyRowKey, LucideIcon> = {
  share_workouts: Dumbbell,
  share_records: Trophy,
  share_achievements: Award,
  share_photos: ImageIcon,
  share_routines: ListChecks,
  share_body_weight: Scale,
  allow_friend_requests: UserPlus,
};

// Privacidad social (SOCIAL_14): audience in two levels, seven switches with a
// sentence each (peso corporal off by default) and "Así te ven tus amigos".
// Below, the social account rows (D-82): username, blocked users and the
// legal links App Store 1.2 asks for (BT-43).
export function SocialPrivacyScreen({ navigation }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useSocialService();
  const settings = useSocialResource('getSettings', s => s.getSettings());
  const blocked = useSocialResource('getBlocked', s => s.getBlocked());
  const data = settings.data;

  const update = async (
    patch: Parameters<typeof service.updateSettings>[0],
  ) => {
    try {
      await service.updateSettings(patch);
    } catch {
      toast.show('No se pudo guardar el cambio', { tone: 'error' });
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
  const openSupport = () => {
    if (LEGAL_IS_PLACEHOLDER) {
      // TODO(testflight): BT-43 · real support mailbox.
      toast.show('El correo de soporte estará disponible antes de TestFlight');
      return;
    }
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Privacidad social"
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 14,
          paddingBottom: insets.bottom + 40,
          gap: 28,
        }}
      >
        {settings.status === 'loading' ? (
          <SkeletonGroup>
            <Skeleton height={44} radius={22} />
            <Skeleton height={20} width="70%" />
            <Skeleton height={300} radius={16} />
          </SkeletonGroup>
        ) : null}

        {settings.status === 'error' ? (
          <BlockError
            message="No pudimos cargar tu privacidad."
            onRetry={settings.reload}
          />
        ) : null}

        {settings.status === 'ready' && data ? (
          <>
            <View style={styles.gap12}>
              <Eyebrow>Quién puede ver tu perfil</Eyebrow>
              <Segmented<SocialAudience>
                options={AUDIENCE_OPTIONS.map(option => ({
                  key: option.key,
                  label: option.label,
                }))}
                value={data.audience as SocialAudience}
                onChange={audience => update({ audience })}
              />
              <TextV2 variant="body" tone="secondary">
                {audienceLine(data.audience as SocialAudience)}
              </TextV2>
            </View>

            <View>
              <Eyebrow style={styles.rowsTitle}>Qué compartes</Eyebrow>
              {PRIVACY_ROWS.map(row => {
                const Icon = ROW_ICONS[row.key];
                return (
                  <Row
                    key={row.key}
                    leading={
                      <Icon
                        size={20}
                        color={colors.text.primary}
                        strokeWidth={1.8}
                        style={styles.icon}
                      />
                    }
                    title={row.title}
                    subtitle={row.subtitle}
                    trailing={
                      <SwitchV2
                        value={data[row.key]}
                        accessibilityLabel={row.title}
                        onValueChange={value => update({ [row.key]: value })}
                      />
                    }
                  />
                );
              })}
            </View>

            <View style={[styles.preview, { backgroundColor: colors.surface.muted }]}>
              <TextV2 variant="metaStrong">Así te ven tus amigos</TextV2>
              <TextV2 variant="body" tone="bodySoft">
                {privacyPreview(data)}
              </TextV2>
            </View>

            <SettingsSection title="Tu cuenta social">
              <Row
                leading={
                  <AtSign size={20} color={colors.text.primary} strokeWidth={1.8} style={styles.icon} />
                }
                title="Nombre de usuario"
                value={`@${data.username}`}
                trailing="chevron"
                onPress={() =>
                  navigation.navigate(APP_ROUTES.SocialUsername, { mode: 'edit' })
                }
              />
              <Row
                leading={
                  <ShieldOff size={20} color={colors.text.primary} strokeWidth={1.8} style={styles.icon} />
                }
                title="Usuarios bloqueados"
                value={blocked.data ? String(blocked.data.length) : undefined}
                trailing="chevron"
                onPress={() => navigation.navigate(APP_ROUTES.SocialBlocked)}
              />
            </SettingsSection>

            <SettingsSection title="Normas y ayuda">
              <Row
                leading={
                  <FileText size={20} color={colors.text.primary} strokeWidth={1.8} style={styles.icon} />
                }
                title="Términos de uso"
                trailing="chevron"
                onPress={openTerms}
              />
              <Row
                leading={
                  <LifeBuoy size={20} color={colors.text.primary} strokeWidth={1.8} style={styles.icon} />
                }
                title="Contactar con soporte"
                subtitle="Reportes y dudas sobre la comunidad"
                trailing="chevron"
                onPress={openSupport}
              />
            </SettingsSection>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  gap12: { gap: 12 },
  rowsTitle: { paddingBottom: 6 },
  icon: { marginRight: 2 },
  preview: { padding: 18, borderRadius: 22, gap: 6 },
});
