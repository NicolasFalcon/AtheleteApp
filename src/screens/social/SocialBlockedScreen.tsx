import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldOff } from 'lucide-react-native';
import {
  BackButton,
  GlassHeader,
  PersonRow,
  PersonStateButton,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { ROOT_ROUTES } from '@app/constants/routes';
import { firstName } from '@app/features/social/socialModel';
import {
  useSocialResource,
  useSocialService,
} from '@app/features/social/useSocial';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialBlocked'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Usuarios bloqueados (D-83): flat list of people you blocked, each with
// "Desbloquear". No handoff screen: Friend Row + the Ajustes header. A blocked
// profile may be absent from get_social_profiles (shown as "Usuario").
export function SocialBlockedScreen({ navigation }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useSocialService();
  const blocked = useSocialResource('getBlocked', s => s.getBlocked());
  const entries = blocked.data ?? [];

  const unblock = async (id: string, name: string) => {
    try {
      await service.unblockUser(id);
      toast.show(`${firstName(name)} ya no está bloqueado`);
    } catch {
      toast.show('No se pudo desbloquear', { tone: 'error' });
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Usuarios bloqueados"
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 14,
          paddingBottom: insets.bottom + 40,
          gap: 18,
        }}
      >
        {blocked.status === 'loading' ? (
          <SkeletonGroup>
            {[0, 1, 2].map(index => (
              <View key={index} style={styles.skeletonRow}>
                <Skeleton width={48} height={48} radius={24} />
                <View style={styles.skeletonTexts}>
                  <Skeleton width="50%" height={16} />
                  <Skeleton width="30%" height={12} />
                </View>
                <Skeleton width={104} height={34} radius={17} />
              </View>
            ))}
          </SkeletonGroup>
        ) : null}

        {blocked.status === 'error' ? (
          <BlockError
            message="No pudimos cargar tu lista de bloqueados."
            onRetry={blocked.reload}
          />
        ) : null}

        {blocked.status === 'ready' && entries.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.iconCircle, { backgroundColor: colors.surface.muted }]}>
              <ShieldOff size={28} color={colors.text.secondary} strokeWidth={2} />
            </View>
            <TextV2 variant="section" align="center">
              No has bloqueado a nadie
            </TextV2>
            <TextV2 variant="body" tone="secondary" align="center">
              Si bloqueas a alguien desde su perfil, aparecerá aquí.
            </TextV2>
          </View>
        ) : null}

        {blocked.status === 'ready' && entries.length > 0 ? (
          <>
            <TextV2 variant="meta" tone="secondary">
              Las personas bloqueadas no ven tu perfil ni tu actividad, y tú no ves
              la suya. No reciben aviso.
            </TextV2>
            <View>
              {entries.map(entry => {
                const name = entry.profile?.name ?? 'Usuario';
                return (
                  <PersonRow
                    key={entry.block.blocked_id}
                    name={name}
                    subtitle={
                      entry.profile ? `@${entry.profile.username}` : 'Perfil no disponible'
                    }
                    avatar={{
                      avatarKey: entry.profile?.avatar_key,
                      relationship: 'blocked',
                    }}
                    trailing={
                      <PersonStateButton
                        state="unblock"
                        onPress={() => unblock(entry.block.blocked_id, name)}
                      />
                    }
                  />
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  skeletonTexts: { flex: 1, gap: 8 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 56, paddingHorizontal: 12 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
