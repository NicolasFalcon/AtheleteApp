import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import {
  ActivityLine,
  Button,
  PersonAvatar,
  PostCard,
  PressableScale,
  Segmented,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { isBlockedNow, useBlockedVersion } from '@app/features/social/communityStore';
import {
  buildFeedEntries,
  groupActivity,
  isRenderablePost,
  listedContent,
} from '@app/features/social/postModel';
import type { CommunityFeedKind } from '@app/features/social/postTypes';
import { routePostsEnabled } from '@app/features/social/routePosts';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { invalidateWorkoutQueries } from '@app/lib/queryInvalidation';
import {
  useOpenFeed,
  useSocialResource,
  useSocialService,
} from '@app/features/social/useSocial';
import {
  ContentActions,
  type ContentTarget,
} from '@app/features/social/v2/ContentActions';
import { SegmentPlaceholder } from '@app/features/social/v2/SocialParts';
import type { SocialProfileRow } from '@app/features/social/socialTypes';

const TABS: { key: CommunityFeedKind; label: string }[] = [
  { key: 'community', label: 'Comunidad' },
  { key: 'following', label: 'Siguiendo' },
];

// Feed (Comunidad abierta): "¿Qué entrenaste hoy?", then two tabs.
// Comunidad (get_community_feed, by default): public posts of open profiles.
// Siguiendo (get_following_feed): people I follow, friends' posts and mine,
// with the friends' activity lines. Infinite scroll with the server's cursor
// and pull to refresh (from the hub). Each post has "Seguir" next to the
// author and "···" (report, block).
export function FeedView({
  me,
  nearEnd,
  refreshSignal,
  onRefreshed,
  onCompose,
  onOpenPost,
  onOpenRoutine,
  onOpenProfile,
}: {
  me: SocialProfileRow;
  // The hub scroll is near the bottom: ask for the next page.
  nearEnd: boolean;
  // Pull to refresh: a new value reloads the feed; `onRefreshed` says when it ended.
  refreshSignal: number;
  onRefreshed: () => void;
  onCompose: () => void;
  onOpenPost: (postId: string) => void;
  onOpenRoutine: (postId: string) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const { colors } = useThemeV2();
  const toast = useToast();
  const service = useSocialService();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [tab, setTab] = useState<CommunityFeedKind>('community');
  const feed = useOpenFeed(tab);
  // The friends' activity lines live in Siguiendo.
  const activity = useSocialResource('getFriendActivity', s => s.getFriendActivity(8));
  const [target, setTarget] = useState<ContentTarget | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  // Reported or deleted here: out of the list before the server answers again.
  const [gone, setGone] = useState<string[]>([]);
  useBlockedVersion();

  useEffect(() => {
    if (refreshSignal > 0) {
      Promise.all([feed.refresh(), tab === 'following' ? activity.reload() : undefined])
        .catch(() => undefined)
        .finally(onRefreshed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  useEffect(() => {
    if (nearEnd) {
      feed.loadMore();
    }
  }, [nearEnd, feed.loadMore]);

  // Unknown post types (or `route` without Ruta) are not shown; neither is
  // anything of someone just blocked.
  const routeEnabled = routePostsEnabled();
  const posts = listedContent(feed.posts).filter(
    post =>
      isRenderablePost(post, { routeEnabled }) &&
      !gone.includes(post.id) &&
      !isBlockedNow(post.author_id),
  );
  const groups = useMemo(
    () => (tab === 'following' ? groupActivity(activity.data ?? []) : []),
    [activity.data, tab],
  );
  const entries = buildFeedEntries(
    posts,
    groups.filter(group => !group.people.some(person => isBlockedNow(person.id))),
    feed.hasMore,
  );

  const saveRoutine = async (postId: string) => {
    try {
      await service.saveSharedRoutine(postId);
      if (profile?.id) {
        invalidateWorkoutQueries(queryClient, profile.id).catch(() => undefined);
      }
      setSaved(current => [...current, postId]);
      toast.show('Rutina guardada en tus Entrenos', { withTabBar: true });
    } catch {
      toast.show('No se pudo guardar la rutina', { tone: 'error', withTabBar: true });
    }
  };

  return (
    <View style={styles.root}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="¿Qué entrenaste hoy? Publicar"
        onPress={onCompose}
        style={styles.composeRow}
      >
        <PersonAvatar
          name={me.name}
          avatarKey={me.avatar_key}
          profilePhotoUrl={me.profile_photo_url}
          relationship="self"
          size={44}
        />
        <View style={styles.composeTexts}>
          <TextV2 style={styles.composeTitle}>¿Qué entrenaste hoy?</TextV2>
          <TextV2 variant="caption" tone="secondary">
            Entreno, ruta, récord o rutina
          </TextV2>
        </View>
        <View style={[styles.composePlus, { backgroundColor: colors.ember.base }]}>
          <Plus size={22} strokeWidth={2.2} color="#FFFFFF" />
        </View>
      </PressableScale>

      <Segmented options={TABS} value={tab} onChange={setTab} size="compact" />

      <View style={styles.posts}>
        {feed.status === 'loading' ? (
          <SkeletonGroup>
            {[0, 1].map(index => (
              <View key={index} style={styles.skeletonPost}>
                <View style={styles.skeletonHeader}>
                  <Skeleton width={44} height={44} radius={22} />
                  <View style={styles.skeletonLines}>
                    <Skeleton width="40%" height={14} />
                    <Skeleton width="60%" height={12} />
                  </View>
                </View>
                <Skeleton height={index === 0 ? 260 : 180} radius={24} />
                <Skeleton width="30%" height={16} />
              </View>
            ))}
          </SkeletonGroup>
        ) : null}

        {feed.status === 'error' ? (
          <View style={styles.errorBox}>
            <TextV2 variant="section" align="center">
              No pudimos cargar el feed
            </TextV2>
            <TextV2 variant="body" tone="secondary" align="center">
              Sin conexión, tus entrenos siguen funcionando: puedes entrenar y se
              guardará en cuanto vuelvas a tener red.
            </TextV2>
            <Button
              label="Reintentar"
              variant="secondary"
              size="md"
              onPress={() => {
                feed.refresh().catch(() => undefined);
              }}
            />
          </View>
        ) : null}

        {feed.status === 'ready' && entries.length === 0 ? (
          tab === 'following' ? (
            <SegmentPlaceholder
              title="Sigue a atletas desde Comunidad"
              body="Aquí verás lo que publican las personas que sigues, lo de tus amigos y lo tuyo."
            >
              <Button
                label="Ir a Comunidad"
                size="md"
                onPress={() => setTab('community')}
                style={styles.centered}
              />
            </SegmentPlaceholder>
          ) : (
            <SegmentPlaceholder
              title="Aún no hay publicaciones"
              body="Cuando alguien comparta un entreno, un récord o una rutina en Comunidad, lo verás aquí."
            >
              <Button
                label="Publicar un entreno"
                size="md"
                onPress={onCompose}
                style={styles.centered}
              />
            </SegmentPlaceholder>
          )
        ) : null}

        {feed.status === 'ready'
          ? entries.map(entry =>
              entry.kind === 'activity' ? (
                <ActivityLine
                  key={entry.key}
                  text={entry.group.text}
                  people={entry.group.people.map(person => ({
                    key: person.id,
                    name: person.name,
                    avatarKey: person.avatar_key,
                    profilePhotoUrl: person.profile_photo_url,
                    relationship: 'friends' as const,
                  }))}
                  onPress={() => onOpenProfile(entry.group.people[0].id)}
                />
              ) : (
                <PostCard
                  key={entry.key}
                  post={entry.post}
                  withTabBar
                  followable
                  onOpenPost={() => onOpenPost(entry.post.id)}
                  onOpenRoutine={() => onOpenRoutine(entry.post.id)}
                  onOpenAuthor={() => onOpenProfile(entry.post.author_id)}
                  onMore={() =>
                    setTarget({
                      kind: 'post',
                      id: entry.post.id,
                      mine: entry.post.relationship === 'self',
                      body: entry.post.body,
                      author:
                        entry.post.relationship === 'self'
                          ? null
                          : { id: entry.post.author_id, name: entry.post.author?.name ?? 'Usuario' },
                    })
                  }
                  routineSaved={saved.includes(entry.post.id)}
                  onSaveRoutine={() => saveRoutine(entry.post.id)}
                />
              ),
            )
          : null}

        {feed.status === 'ready' && feed.moreStatus === 'loading' ? (
          <SkeletonGroup>
            <View style={styles.skeletonPost}>
              <View style={styles.skeletonHeader}>
                <Skeleton width={44} height={44} radius={22} />
                <View style={styles.skeletonLines}>
                  <Skeleton width="40%" height={14} />
                  <Skeleton width="60%" height={12} />
                </View>
              </View>
              <Skeleton height={160} radius={24} />
            </View>
          </SkeletonGroup>
        ) : null}

        {feed.status === 'ready' && feed.moreStatus === 'error' ? (
          <BlockError message="No pudimos cargar más publicaciones." onRetry={feed.loadMore} />
        ) : null}

        {feed.status === 'ready' && !feed.hasMore && entries.length > 0 ? (
          <View style={[styles.end, { borderTopColor: colors.divider }]}>
            <TextV2 variant="meta" tone="tertiary" align="center">
              {tab === 'following'
                ? 'Estás al día. Descubre a más atletas en Comunidad.'
                : 'Estás al día. Vuelve más tarde.'}
            </TextV2>
          </View>
        ) : null}
      </View>

      <ContentActions
        target={target}
        withTabBar
        onClose={() => setTarget(null)}
        onDone={(done, action) => {
          if (action === 'edited') {
            feed.refresh().catch(() => undefined);
          } else if (action !== 'blocked') {
            setGone(current => [...current, done.id]);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 24 },
  // Posts are 52 pt apart, with no dividers.
  posts: { gap: 52 },
  centered: { alignSelf: 'center' },
  composeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  composeTexts: { flex: 1, gap: 1 },
  composeTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.17 },
  composePlus: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 18px rgba(255,91,31,.28)',
  },
  skeletonPost: { gap: 14 },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonLines: { flex: 1, gap: 8 },
  errorBox: { gap: 12, alignItems: 'center', paddingTop: 40, paddingHorizontal: 12 },
  end: { borderTopWidth: 1, paddingTop: 20 },
});
