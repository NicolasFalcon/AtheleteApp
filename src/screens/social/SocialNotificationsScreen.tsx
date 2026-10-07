import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ShieldAlert } from 'lucide-react-native';
import {
  AvatarStack,
  BackButton,
  Eyebrow,
  GlassHeader,
  PersonAvatar,
  PressableScale,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { APP_ROUTES, ROOT_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import {
  groupNotifications,
  notificationWhen,
  unreadIds,
  type NotificationGroup,
} from '@app/features/social/notificationModel';
import { useSocialResource, useSocialService } from '@app/features/social/useSocial';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialNotifications'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Notificaciones sociales (D-96, sin diseño en el handoff): solicitudes, me
// gusta, comentarios, invitaciones a retos y avisos de moderación, en filas
// planas como Notificaciones (HOME_08). Los me gusta de una publicación forman
// una sola línea. Solo dentro de la app (sin push, Q10).
export function SocialNotificationsScreen({ navigation }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const service = useSocialService();
  const list = useSocialResource('getNotifications', s => s.getNotifications());
  const items = list.data ?? [];
  const groups = groupNotifications(items);
  const fresh = groups.filter(group => group.unread);
  const older = groups.filter(group => !group.unread);
  const pending = unreadIds(items);

  const open = async (group: NotificationGroup) => {
    const ids = unreadIds(items, [group]);
    if (ids.length > 0) {
      service.markNotificationsRead(ids).catch(() => {});
    }
    const target = group.destination;
    const hub = navigation.getState().routeNames.includes(ROOT_ROUTES.MainTabs)
      ? ROOT_ROUTES.MainTabs
      : ROOT_ROUTES.DevFixtureTabs;
    switch (target.kind) {
      case 'friends':
        navigation.navigate(hub, { screen: TAB_ROUTES.Community, params: { segment: 'amigos' } });
        break;
      case 'profile':
        navigation.navigate(APP_ROUTES.SocialProfile, { userId: target.userId });
        break;
      case 'post':
        navigation.navigate(APP_ROUTES.SocialPost, { postId: target.postId });
        break;
      case 'challenge':
        navigation.navigate(APP_ROUTES.SocialChallenge, { challengeId: target.challengeId });
        break;
      default:
        break;
    }
  };

  const row = (group: NotificationGroup) => (
    <PressableScale
      key={group.key}
      accessibilityRole="button"
      accessibilityLabel={`${group.text}. ${notificationWhen(group)}${group.unread ? '. Sin leer' : ''}`}
      onPress={() => open(group)}
      style={[styles.row, { borderTopColor: colors.divider }]}
    >
      {group.actors.length > 1 ? (
        <AvatarStack
          size={30}
          max={3}
          ringColor={colors.bg}
          items={group.actors.map(actor => ({
            key: actor.id,
            name: actor.name,
            avatarKey: actor.avatar_key,
            profilePhotoUrl: actor.profile_photo_url,
            relationship: 'friends' as const,
          }))}
        />
      ) : group.actors.length === 1 ? (
        <PersonAvatar
          name={group.actors[0].name}
          avatarKey={group.actors[0].avatar_key}
          profilePhotoUrl={group.actors[0].profile_photo_url}
          relationship={group.type === 'friend_request' ? 'request_received' : 'friends'}
          size={44}
        />
      ) : (
        <View style={[styles.systemIcon, { backgroundColor: colors.surface.muted }]}>
          <ShieldAlert size={20} strokeWidth={1.8} color={colors.text.primary} />
        </View>
      )}
      <View style={styles.texts}>
        <TextV2 variant={group.unread ? 'bodyStrong' : 'body'}>{group.text}</TextV2>
        <TextV2 variant="caption" tone="tertiary">
          {notificationWhen(group)}
        </TextV2>
      </View>
      {group.unread ? <View style={[styles.dot, { backgroundColor: colors.ember.base }]} /> : null}
    </PressableScale>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Comunidad"
        subtitle="Notificaciones"
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
        right={
          pending.length > 0 ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Marcar todo como leído"
              onPress={() => service.markNotificationsRead(pending).catch(() => {})}
              style={styles.markAll}
            >
              <TextV2 variant="metaStrong">Marcar todo</TextV2>
            </PressableScale>
          ) : undefined
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: 12, paddingBottom: insets.bottom + 40, gap: 26 }}
      >
        {list.status === 'loading' ? (
          <SkeletonGroup>
            {[0, 1, 2, 3].map(index => (
              <View key={index} style={styles.skeletonRow}>
                <Skeleton width={44} height={44} radius={22} />
                <View style={styles.texts}>
                  <Skeleton width="80%" height={14} />
                  <Skeleton width="30%" height={12} />
                </View>
              </View>
            ))}
          </SkeletonGroup>
        ) : null}
        {list.status === 'error' ? (
          <BlockError message="No pudimos cargar tus notificaciones." onRetry={list.reload} />
        ) : null}
        {list.status === 'ready' && groups.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.systemIcon, styles.emptyIcon, { backgroundColor: colors.surface.muted }]}>
              <Bell size={28} strokeWidth={1.9} color={colors.text.secondary} />
            </View>
            <TextV2 variant="section" align="center">
              Todo al día
            </TextV2>
            <TextV2 variant="body" tone="secondary" align="center">
              Aquí verás solicitudes de amistad, me gusta, comentarios y retos de tus amigos.
            </TextV2>
          </View>
        ) : null}
        {fresh.length > 0 ? (
          <View>
            <Eyebrow style={styles.title}>Nuevas</Eyebrow>
            {fresh.map(row)}
          </View>
        ) : null}
        {older.length > 0 ? (
          <View>
            <Eyebrow style={styles.title}>Anteriores</Eyebrow>
            {older.map(row)}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1 },
  texts: { flex: 1, gap: 2 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  systemIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 56, paddingHorizontal: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32 },
  markAll: { paddingVertical: 8, paddingHorizontal: 4 },
});
