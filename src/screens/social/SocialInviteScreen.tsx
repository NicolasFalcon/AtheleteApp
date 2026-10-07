import { useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AtSign, Link2, Share2 } from 'lucide-react-native';
import {
  BackButton,
  Button,
  Eyebrow,
  GlassHeader,
  Row,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { ROOT_ROUTES } from '@app/constants/routes';
import {
  INVITE_DAYS,
  MAX_ACTIVE_INVITES,
  activeInviteCount,
  canCreateInvite,
  inviteExpiryLabel,
  inviteMessage,
  inviteUrl,
  isInviteActive,
  usernameShareMessage,
} from '@app/features/social/socialModel';
import {
  useSocialResource,
  useSocialService,
} from '@app/features/social/useSocial';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { useAuth } from '@app/hooks/useAuth';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialInvite'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Invitar amigos (D-81, sin diseño en el handoff; STATE_04 solo trae el botón
// "Invitar con un enlace"). Un enlace sirve a una persona y caduca en 7 días
// (`create_friend_invite`, máximo 5 activos); también se puede compartir el
// nombre de usuario, porque la búsqueda es exacta.
export function SocialInviteScreen({ navigation }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useSocialService();
  const settings = useSocialResource('getSettings', s => s.getSettings());
  const invites = useSocialResource('getInvites', s => s.getInvites());
  const [creating, setCreating] = useState(false);

  const list = invites.data ?? [];
  const active = list.filter(invite => isInviteActive(invite));
  const full = invites.status === 'ready' && !canCreateInvite(list);
  const { profile } = useAuth();
  const myName = profile?.name || 'Un amigo';
  const username = settings.data?.username ?? null;

  const share = async (message: string) => {
    try {
      await Share.share({ message });
    } catch {
      toast.show('No se pudo abrir el menú de compartir', { tone: 'error' });
    }
  };

  const createAndShare = async () => {
    if (creating) {
      return;
    }
    setCreating(true);
    try {
      const result = await service.createInvite();
      if (result.ok) {
        await share(inviteMessage(myName, result.link.url));
      } else {
        toast.show(
          `Ya tienes ${MAX_ACTIVE_INVITES} enlaces activos. Espera a que caduquen o se usen.`,
          { tone: 'error' },
        );
      }
    } catch {
      toast.show('No se pudo crear el enlace', { tone: 'error' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Invitar amigos"
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
        <View style={styles.gap10}>
          <TextV2 variant="title24">Tus amigos, a un enlace</TextV2>
          <TextV2 variant="body" tone="secondary">
            {`Cada enlace sirve para una persona y caduca en ${INVITE_DAYS} días. Al abrirlo, vuestra amistad queda hecha sin solicitudes.`}
          </TextV2>
        </View>

        <View style={styles.gap10}>
          <Button
            label="Compartir enlace de invitación"
            icon={Link2}
            loading={creating}
            loadingLabel="Creando enlace"
            disabled={full}
            onPress={createAndShare}
          />
          {full ? (
            <TextV2 variant="meta" color={colors.ember.deep}>
              {`Tienes ${MAX_ACTIVE_INVITES} enlaces activos. Podrás crear otro cuando uno caduque o se use.`}
            </TextV2>
          ) : null}
          {username ? (
            <Button
              label={`Compartir mi usuario @${username}`}
              icon={AtSign}
              variant="secondary"
              onPress={() => share(usernameShareMessage(myName, username))}
            />
          ) : null}
        </View>

        <View>
          <Eyebrow style={styles.title}>
            {invites.status === 'ready'
              ? `Enlaces activos · ${activeInviteCount(list)} de ${MAX_ACTIVE_INVITES}`
              : 'Enlaces activos'}
          </Eyebrow>

          {invites.status === 'loading' ? (
            <SkeletonGroup>
              <Skeleton height={56} radius={12} />
            </SkeletonGroup>
          ) : null}

          {invites.status === 'error' ? (
            <BlockError
              message="No pudimos cargar tus enlaces."
              onRetry={invites.reload}
            />
          ) : null}

          {invites.status === 'ready' && active.length === 0 ? (
            <TextV2 variant="meta" tone="secondary">
              No tienes enlaces activos. Crea uno con el botón de arriba.
            </TextV2>
          ) : null}

          {invites.status === 'ready'
            ? active.map(invite => (
                <Row
                  key={invite.id}
                  leading={
                    <Share2 size={20} color={colors.text.primary} strokeWidth={1.8} />
                  }
                  title={`Enlace …${invite.token.slice(-4)}`}
                  subtitle={inviteExpiryLabel(invite.expires_at)}
                  trailing="chevron"
                  accessibilityLabel={`Compartir de nuevo el enlace que termina en ${invite.token.slice(-4)}`}
                  onPress={() => share(inviteMessage(myName, inviteUrl(invite.token)))}
                />
              ))
            : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  gap10: { gap: 10 },
  title: { paddingBottom: 6 },
});
