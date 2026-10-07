import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, MoreHorizontal, UserCheck } from 'lucide-react-native';
import {
  BackButton,
  Button,
  IconButton,
  MetricTrio,
  PersonAvatar,
  Sheet,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import {
  canShowRealPhoto,
  firstName,
  friendsSinceLabel,
  goalText,
  initialsOf,
  mapSendRequestStatus,
  privacyLine,
  profileSections,
  relationActions,
} from '@app/features/social/socialModel';
import type { RelationshipState } from '@app/features/social/socialTypes';
import {
  useSocialResource,
  useSocialService,
} from '@app/features/social/useSocial';
import {
  PrivacyLine,
  RecentActivity,
  RecordsList,
} from '@app/features/social/v2/ProfileParts';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { SceneScope } from '@app/providers/ThemeProvider';
import {
  getDirectProfilePhotoUri,
  resolveProfilePhotoUri,
} from '@app/services/supabase/profile-photo';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialProfile'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];
const HERO_HEIGHT = 380;

// Real photo of a friend, signed on demand. Never requested for anyone who is
// not a friend (DA-119).
function useFriendPhoto(
  reference: string | null | undefined,
  allowed: boolean,
): string | null {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!allowed || !reference) {
      setUri(null);
      return undefined;
    }
    const direct = getDirectProfilePhotoUri(reference);
    if (direct) {
      setUri(direct);
      return undefined;
    }
    resolveProfilePhotoUri(reference)
      .then(value => {
        if (active) {
          setUri(value);
        }
      })
      .catch(() => {
        if (active) {
          setUri(null);
        }
      });
    return () => {
      active = false;
    };
  }, [allowed, reference]);

  return uri;
}

// Perfil de otro usuario (SOCIAL_06): hero oscuro con nombre, objetivo y
// acciones según la relación; debajo, solo lo que el servidor devuelve y su
// dueño comparte. Lo privado se indica en una línea.
export function SocialProfileScreen({ navigation, route }: Props) {
  const { colors, layout, scene } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useSocialService();
  const { userId, devConfirmBlock } = route.params;
  const lookup = useSocialResource('getProfile', s => s.getProfile(userId), [userId]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(Boolean(devConfirmBlock));
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);

  const data = lookup.data;
  const profile = data?.profile ?? null;
  const detail = data?.detail ?? null;
  const relationship: RelationshipState = data?.blocked
    ? 'blocked'
    : detail?.relationship ?? 'none';
  const actions = relationActions(relationship, {
    acceptsRequests: data?.acceptsRequests,
  });
  const sections = profileSections(relationship, detail);
  const name = profile?.name ?? 'Usuario';
  const photo = useFriendPhoto(
    profile?.profile_photo_url,
    canShowRealPhoto(relationship),
  );

  const show = (message: string, tone?: 'error') =>
    toast.show(message, { tone });
  const run = async (task: () => Promise<void>, failure?: string) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await task();
    } catch {
      show(failure ?? 'No se pudo completar la acción', 'error');
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      const status = await service.sendFriendRequest(userId);
      const outcome = mapSendRequestStatus(status, firstName(name));
      show(outcome.message, outcome.ok ? undefined : 'error');
    });
  const cancel = () =>
    run(async () => {
      if (data?.requestId) {
        await service.cancelFriendRequest(data.requestId);
        show('Solicitud cancelada');
      }
    });
  const respond = (accept: boolean) =>
    run(async () => {
      if (data?.requestId) {
        await service.respondFriendRequest(data.requestId, accept);
        show(accept ? `${firstName(name)} ya es tu amigo` : 'Solicitud ignorada');
      }
    });
  const block = () =>
    run(async () => {
      await service.blockUser(userId);
      setConfirmBlock(false);
      show(`Bloqueaste a ${firstName(name)}`);
    });
  const removeFriend = () =>
    run(async () => {
      const removed = await service.removeFriend(userId);
      setConfirmRemove(false);
      show(
        removed
          ? `${firstName(name)} ya no es tu amigo`
          : `${firstName(name)} ya no estaba en tu lista`,
      );
    });
  const unblock = () =>
    run(async () => {
      await service.unblockUser(userId);
      show(`${firstName(name)} ya no está bloqueado`);
    });

  const subtitle = [
    goalText(profile?.goal),
    sections.friendsSince && detail?.friends_since
      ? friendsSinceLabel(detail.friends_since)
      : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <SceneScope>
          <View style={[styles.hero, { backgroundColor: scene.plate }]}>
            {photo ? (
              <Image
                source={{ uri: photo }}
                resizeMode="cover"
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View style={styles.initialsWrap} pointerEvents="none">
                <TextV2 style={[styles.bigInitials, { color: scene.onDark.primary }]}>
                  {initialsOf(name)}
                </TextV2>
              </View>
            )}
            <LinearGradient
              colors={['rgba(20,19,18,.4)', 'rgba(20,19,18,0)', 'rgba(20,19,18,.9)']}
              locations={[0, 0.3, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.heroBar, { top: insets.top + 8 }]}>
              <BackButton
                variant="glass"
                onPress={() => safeGoBack(navigation, BACK_FALLBACKS)}
              />
              {profile && relationship !== 'self' ? (
                <IconButton
                  icon={MoreHorizontal}
                  variant="glass"
                  accessibilityLabel="Más opciones"
                  onPress={() => setMenuOpen(true)}
                />
              ) : null}
            </View>
            {lookup.status === 'ready' && profile ? (
              <View style={styles.heroContent}>
                <View style={styles.heroTexts}>
                  <TextV2 variant="title28" color={scene.onDark.primary}>
                    {name}
                  </TextV2>
                  {subtitle ? (
                    <TextV2 variant="meta" color={scene.onDark.secondary}>
                      {subtitle}
                    </TextV2>
                  ) : null}
                </View>
                <View style={styles.heroActions}>
                  {actions.canSendRequest ? (
                    <Button label="Agregar" size="md" loading={busy} onPress={send} />
                  ) : null}
                  {actions.requestsClosed ? (
                    <Button
                      label="No acepta solicitudes"
                      variant="secondary"
                      size="md"
                      disabled
                      onPress={() => {}}
                    />
                  ) : null}
                  {actions.canCancelRequest ? (
                    <Button
                      label="Solicitado"
                      variant="secondary"
                      size="md"
                      icon={Clock}
                      onPress={cancel}
                    />
                  ) : null}
                  {actions.canAccept ? (
                    <Button label="Aceptar" size="md" onPress={() => respond(true)} />
                  ) : null}
                  {actions.canDecline ? (
                    <Button
                      label="Ignorar"
                      variant="secondary"
                      size="md"
                      onPress={() => respond(false)}
                    />
                  ) : null}
                  {relationship === 'friends' ? (
                    <Button
                      label="Amigos"
                      variant="secondary"
                      size="md"
                      icon={UserCheck}
                      onPress={() => setMenuOpen(true)}
                    />
                  ) : null}
                  {actions.canChallenge ? (
                    <Button
                      label="Retar"
                      size="md"
                      onPress={() =>
                        navigation.navigate(APP_ROUTES.SocialCreateChallenge, { inviteeId: userId })
                      }
                    />
                  ) : null}
                  {actions.canUnblock ? (
                    <Button label="Desbloquear" size="md" onPress={unblock} />
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        </SceneScope>

        <View style={[styles.body, { backgroundColor: colors.bg, paddingHorizontal: layout.gutter }]}>
          {lookup.status === 'loading' ? (
            <SkeletonGroup>
              <Skeleton height={48} radius={12} />
              <Skeleton height={20} width="40%" />
              <Skeleton height={120} radius={16} />
            </SkeletonGroup>
          ) : null}

          {lookup.status === 'error' ? (
            <BlockError
              message="No pudimos cargar este perfil."
              onRetry={lookup.reload}
            />
          ) : null}

          {lookup.status === 'ready' && !profile ? (
            // get_social_profiles may not return the row (SOCIAL_PLAN §8.1).
            <View style={styles.unavailable}>
              <PersonAvatar name="?" relationship="none" size={64} />
              <TextV2 variant="section" align="center">
                Este perfil no está disponible
              </TextV2>
              <TextV2 variant="body" tone="secondary" align="center">
                Puede que la persona haya eliminado su cuenta o no comparta su perfil.
              </TextV2>
            </View>
          ) : null}

          {lookup.status === 'ready' && profile && relationship === 'blocked' ? (
            <View style={styles.unavailable}>
              <TextV2 variant="section" align="center">
                {`Bloqueaste a ${firstName(name)}`}
              </TextV2>
              <TextV2 variant="body" tone="secondary" align="center">
                No ve tu actividad ni tú la suya. Puedes desbloquearle cuando quieras.
              </TextV2>
            </View>
          ) : null}

          {lookup.status === 'ready' && profile && relationship !== 'blocked' && detail ? (
            <>
              <MetricTrio
                items={[
                  { value: String(detail.streak_days), unit: 'días', label: 'Racha' },
                  ...(sections.sessions
                    ? [{ value: String(detail.sessions_total), label: 'Sesiones' }]
                    : []),
                  ...(sections.badges
                    ? [{ value: String(detail.badges_total), label: 'Logros' }]
                    : []),
                ]}
              />
              {sections.records && detail.records ? (
                <RecordsList records={detail.records} />
              ) : null}
              {sections.recentPosts && detail.recent_posts ? (
                <RecentActivity
                  posts={detail.recent_posts}
                  onOpen={() => show('Las publicaciones llegan con el feed')}
                />
              ) : null}
              <PrivacyLine
                text={privacyLine(
                  name,
                  detail.hidden_categories,
                  relationship,
                  relationship === 'friends' ||
                    sections.sessions ||
                    sections.records,
                )}
              />
            </>
          ) : null}
        </View>
      </ScrollView>

      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={name}
      >
        <View style={styles.menu}>
          {actions.canRemove ? (
            <Button
              label={`Eliminar a ${firstName(name)} de tus amigos`}
              variant="outline"
              onPress={() => {
                setMenuOpen(false);
                setConfirmRemove(true);
              }}
            />
          ) : null}
          {actions.canBlock ? (
            <Button
              label={`Bloquear a ${firstName(name)}`}
              variant="outline"
              onPress={() => {
                setMenuOpen(false);
                setConfirmBlock(true);
              }}
            />
          ) : null}
          {actions.canUnblock ? (
            <Button
              label="Desbloquear"
              variant="outline"
              onPress={() => {
                setMenuOpen(false);
                unblock();
              }}
            />
          ) : null}
        </View>
      </Sheet>

      <Sheet
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={`¿Eliminar a ${firstName(name)} de tus amigos?`}
        footer={
          <Button
            label="Eliminar"
            loading={busy}
            loadingLabel="Eliminando"
            onPress={removeFriend}
            style={styles.flex}
          />
        }
      >
        <TextV2 variant="body" tone="secondary">
          {`Dejaréis de veros la actividad y los retos compartidos. No le avisamos y puedes volver a agregarle cuando quieras.`}
        </TextV2>
      </Sheet>

      <Sheet
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        title={`¿Bloquear a ${firstName(name)}?`}
        footer={
          <Button
            label="Bloquear"
            loading={busy}
            loadingLabel="Bloqueando"
            onPress={block}
            style={styles.flex}
          />
        }
      >
        <TextV2 variant="body" tone="secondary">
          {`${firstName(name)} dejará de ser tu amigo y no podrá ver tu perfil ni tu actividad, ni enviarte solicitudes. Tampoco verás nada suyo. No le avisamos. Puedes desbloquearle desde Privacidad social.`}
        </TextV2>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  hero: { height: HERO_HEIGHT, overflow: 'hidden' },
  initialsWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 24,
    opacity: 0.14,
  },
  bigInitials: { fontSize: 180, fontWeight: '700', letterSpacing: -8 },
  heroBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroContent: { position: 'absolute', left: 20, right: 20, bottom: 40, gap: 14 },
  heroTexts: { gap: 4 },
  heroActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  body: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 26,
    paddingBottom: 24,
    gap: 32,
    minHeight: 320,
  },
  unavailable: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  menu: { gap: 10 },
});
