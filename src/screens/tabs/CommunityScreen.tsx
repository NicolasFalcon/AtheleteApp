import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Shield } from 'lucide-react-native';
import { ProfileAvatar } from '@app/components/profile/ProfileAvatar';
import {
  GlassSurface,
  IconButton,
  UnderlineTabs,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  type UnderlineTabOption,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { hubSubtitle } from '@app/features/social/socialModel';
import type { FriendsOverview } from '@app/features/social/socialTypes';
import { useSocialResource } from '@app/features/social/useSocial';
import { ChallengesView } from '@app/features/social/v2/ChallengesView';
import { FeedView } from '@app/features/social/v2/FeedView';
import { FriendsView } from '@app/features/social/v2/FriendsView';
import { NoFriendsState } from '@app/features/social/v2/SocialParts';
import { useAuth } from '@app/hooks/useAuth';
import { useTabBarMetrics } from '@app/hooks/useTabBarMetrics';
import type { CommunitySegment, TabScreenProps } from '@app/types/navigation';

// Comunidad hub (v2.12 · feed / retos / amigos): "Comunidad" at 34/800 with
// the summary; bell (W6 counter), privacy and the avatar with an Ember ring
// (→ Perfil) on the right; Feed · Retos · Amigos as underlined tabs.
// Tanda UI-B builds the shell and Amigos; Feed (tanda A) and Retos (tanda C)
// are placeholders. The username is required before using Comunidad.
export function CommunityScreen({
  navigation,
  route,
}: TabScreenProps<'Community'>) {
  const { colors, layout, space } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { bottomClearance } = useTabBarMetrics();
  const { profile } = useAuth();
  const [segment, setSegment] = useState<CommunitySegment>(
    route.params?.segment ?? 'feed',
  );
  const [query, setQuery] = useState(route.params?.devQuery ?? '');
  const [nearEnd, setNearEnd] = useState(false);
  // Pull to refresh: the feed reloads itself (`refreshSignal`) and tells when
  // it is done; the rest of the hub reloads from here.
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const settings = useSocialResource('getSettings', service => service.getSettings());
  const overview = useSocialResource('getFriendsOverview', service => service.getFriendsOverview());
  const challenges = useSocialResource('getMyChallenges', service => service.getMyChallenges());
  const unreadResource = useSocialResource('getUnreadNotifications', service =>
    service.getUnreadNotifications(),
  );
  const unread = unreadResource.data ?? 0;
  const redirected = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const devEndUntil = useRef(0);
  const meProfile = useMemo(
    () => ({
      id: profile?.id ?? 'me',
      name: profile?.name || 'Tú',
      username: settings.data?.username ?? '',
      avatar_key: profile?.avatarKey ?? '',
      profile_photo_url: profile?.profilePhotoUrl ?? '',
      goal: profile?.goal ?? '',
      weight: 0,
    }),
    [profile, settings.data?.username],
  );

  useEffect(() => {
    if (route.params?.segment) {
      setSegment(route.params.segment);
    }
    if (route.params?.devQuery !== undefined) {
      setQuery(route.params.devQuery);
    }
  }, [route.params?.segment, route.params?.devQuery]);

  // Dev only: jump to the bottom so the feed loads its next pages.
  useEffect(() => {
    if (!__DEV__ || route.params?.devNonce === undefined) {
      return undefined;
    }
    if (typeof route.params.devScroll === 'number') {
      const y = route.params.devScroll;
      const id = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 900);
      return () => clearTimeout(id);
    }
    if (route.params.devScroll !== 'end') {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return undefined;
    }
    // Keep following the bottom while the pages arrive (content grows).
    devEndUntil.current = Date.now() + 9000;
    scrollRef.current?.scrollToEnd({ animated: false });
    return undefined;
  }, [route.params?.devNonce, route.params?.devScroll]);

  // No username yet: the backend needs it before anything social (D-79).
  useFocusEffect(
    useCallback(() => {
      if (settings.status === 'ready' && settings.data === null) {
        if (!redirected.current) {
          redirected.current = true;
          navigation.navigate(APP_ROUTES.SocialUsername, { mode: 'create' });
        }
      } else if (settings.status === 'ready') {
        redirected.current = false;
      }
    }, [navigation, settings.data, settings.status]),
  );

  const data: FriendsOverview | null = overview.data;
  const friends = data?.friends ?? [];
  const received = data?.received.length ?? 0;
  const noFriends = overview.status === 'ready' && friends.length === 0;
  const subtitle =
    overview.status !== 'ready'
      ? ' '
      : noFriends
      ? 'Aún sin amigos'
      : hubSubtitle(friends.length, data?.activeChallenges ?? 0);
  const options: UnderlineTabOption<CommunitySegment>[] = [
    { key: 'feed', label: 'Feed' },
    {
      key: 'retos',
      label: 'Retos',
      badge: challenges.data?.invitations.length || undefined,
    },
    { key: 'amigos', label: 'Amigos', badge: received || undefined },
  ];
  const openProfile = (userId: string) =>
    navigation.navigate(APP_ROUTES.SocialProfile, { userId });
  const openInvite = () => navigation.navigate(APP_ROUTES.SocialInvite);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassSurface
        kind="nav"
        style={[
          styles.header,
          { paddingTop: insets.top + space.s8, paddingHorizontal: layout.gutter },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.titles}>
            <TextV2 accessibilityRole="header" style={styles.title}>
              Comunidad
            </TextV2>
            <TextV2 variant="meta" tone="secondary">
              {subtitle}
            </TextV2>
          </View>
          <View style={styles.actions}>
            <IconButton
              icon={Bell}
              badgeCount={unread}
              accessibilityLabel={unread > 0 ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
              onPress={() => navigation.navigate(APP_ROUTES.SocialNotifications)}
            />
            <IconButton
              icon={Shield}
              accessibilityLabel="Privacidad social"
              onPress={() => navigation.navigate(APP_ROUTES.SocialPrivacy)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Perfil"
              hitSlop={4}
              onPress={() => navigation.navigate(APP_ROUTES.Profile)}
              style={[styles.avatarRing, { borderColor: colors.ember.base }]}
            >
              <ProfileAvatar
                avatarKey={profile?.avatarKey}
                profilePhotoUrl={profile?.profilePhotoUrl}
                size={layout.iconButton - 8}
              />
            </Pressable>
          </View>
        </View>
        <UnderlineTabs options={options} value={segment} onChange={setSegment} />
      </GlassSurface>

      <ScrollView
        ref={scrollRef}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.text.secondary}
            onRefresh={() => {
              setRefreshing(true);
              settings.reload();
              overview.reload();
              challenges.reload();
              unreadResource.reload();
              if (segment === 'feed') {
                setRefreshSignal(value => value + 1);
              } else {
                setTimeout(() => setRefreshing(false), 600);
              }
            }}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={64}
        onContentSizeChange={() => {
          if (__DEV__ && devEndUntil.current > Date.now()) {
            scrollRef.current?.scrollToEnd({ animated: false });
          }
        }}
        onScroll={event => {
          // Close to the bottom: the feed asks for its next page.
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          setNearEnd(
            contentOffset.y + layoutMeasurement.height >= contentSize.height - 700,
          );
        }}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 18,
          paddingBottom: bottomClearance,
        }}
      >
        {segment === 'amigos' ? (
          <FriendsView
            status={overview.status}
            overview={data}
            onReload={overview.reload}
            query={query}
            onQueryChange={setQuery}
            onOpenProfile={openProfile}
            onInvite={openInvite}
            username={settings.data?.username ?? null}
          />
        ) : null}

        {segment === 'feed' ? (
          overview.status === 'loading' ? (
            <SkeletonGroup>
              <View style={styles.feedSkeleton}>
                <Skeleton width={40} height={40} radius={20} />
                <Skeleton width="60%" height={14} />
              </View>
              <Skeleton height={220} radius={20} />
            </SkeletonGroup>
          ) : noFriends ? (
            <NoFriendsState
              title="Tu feed empieza con un amigo"
              body="Cuando tus amigos entrenen, lo verás aquí. Tú decides qué compartes."
              onSearch={() => setSegment('amigos')}
              onInvite={openInvite}
            />
          ) : (
            <FeedView
              me={meProfile}
              nearEnd={nearEnd}
              refreshSignal={refreshSignal}
              onRefreshed={() => setRefreshing(false)}
              onCompose={() => navigation.navigate(APP_ROUTES.SocialCompose, {})}
              onOpenPost={postId => navigation.navigate(APP_ROUTES.SocialPost, { postId })}
              onOpenRoutine={postId => navigation.navigate(APP_ROUTES.SocialRoutine, { postId })}
              onOpenProfile={openProfile}
            />
          )
        ) : null}

        {segment === 'retos' ? (
          <ChallengesView
            onOpenChallenge={challengeId =>
              navigation.navigate(APP_ROUTES.SocialChallenge, { challengeId })
            }
            onCreate={() => navigation.navigate(APP_ROUTES.SocialCreateChallenge, {})}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: 10 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 56,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -1, lineHeight: 38 },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { gap: 2, flexShrink: 1 },
  feedSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
});
