import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ImagePlus } from 'lucide-react-native';
import {
  ActivityLine,
  Button,
  PersonAvatar,
  PostCard,
  PressableScale,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { buildFeedEntries, listedContent } from '@app/features/social/postModel';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { invalidateWorkoutQueries } from '@app/lib/queryInvalidation';
import { useFeed, useSocialService } from '@app/features/social/useSocial';
import {
  ContentActions,
  type ContentTarget,
} from '@app/features/social/v2/ContentActions';
import { SegmentPlaceholder } from '@app/features/social/v2/SocialParts';
import type { SocialProfileRow } from '@app/features/social/socialTypes';

// Feed (SOCIAL_01): "Comparte tu último entreno", posts by type, activity
// lines and paginated loading. States: loading (STATE_01), error (STATE_07),
// empty with friends, loading more, error loading more and end of the list.
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
  const feed = useFeed();
  const [target, setTarget] = useState<ContentTarget | null>(null);
  const [saved, setSaved] = useState<string[]>([]);

  // Coming back from the detail or the composer shows what changed.
  const first = useCallback(() => {
    feed.refresh(feed.status === 'ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.refresh]);
  useFocusEffect(first);

  useEffect(() => {
    if (refreshSignal > 0) {
      feed.refresh(true).finally(onRefreshed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  useEffect(() => {
    if (nearEnd) {
      feed.loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearEnd, feed.loadMore]);

  const entries = buildFeedEntries(
    listedContent(feed.posts),
    feed.activity,
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
        accessibilityLabel="Comparte tu último entreno"
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
        <View style={[styles.composePill, { backgroundColor: colors.surface.muted }]}>
          <TextV2 variant="body" tone="secondary">
            Comparte tu último entreno
          </TextV2>
        </View>
        <View style={[styles.composeImage, { backgroundColor: colors.surface.muted }]}>
          <ImagePlus size={18} strokeWidth={1.9} color={colors.text.primary} />
        </View>
      </PressableScale>

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
          <Button label="Reintentar" variant="secondary" size="md" onPress={feed.retry} />
        </View>
      ) : null}

      {feed.status === 'ready' && entries.length === 0 ? (
        <SegmentPlaceholder
          title="Aún no hay publicaciones"
          body="Cuando tus amigos compartan un entreno, un récord o una rutina, lo verás aquí. Tú decides qué compartes."
        >
          <Button label="Comparte tu último entreno" size="md" onPress={onCompose} />
        </SegmentPlaceholder>
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
                onOpenPost={() => onOpenPost(entry.post.id)}
                onOpenRoutine={() => onOpenRoutine(entry.post.id)}
                onOpenAuthor={
                  entry.post.author
                    ? () => onOpenProfile(entry.post.author_id)
                    : undefined
                }
                onMore={() =>
                  setTarget({
                    kind: 'post',
                    id: entry.post.id,
                    mine: entry.post.relationship === 'self',
                    body: entry.post.body,
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
        <BlockError message="No pudimos cargar más publicaciones." onRetry={feed.retryMore} />
      ) : null}

      {feed.status === 'ready' && !feed.hasMore && entries.length > 0 ? (
        <View style={[styles.end, { borderTopColor: colors.divider }]}>
          <TextV2 variant="meta" tone="tertiary" align="center">
            Estás al día. Vuelve cuando tus amigos entrenen.
          </TextV2>
        </View>
      ) : null}

      <ContentActions
        target={target}
        withTabBar
        onClose={() => setTarget(null)}
        onDone={(done, action) =>
          action === 'edited' ? feed.refresh(true) : feed.removePost(done.id)
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 36 },
  composeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  composePill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  composeImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonPost: { gap: 14 },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonLines: { flex: 1, gap: 8 },
  errorBox: { gap: 12, alignItems: 'center', paddingTop: 40, paddingHorizontal: 12 },
  end: { borderTopWidth: 1, paddingTop: 20 },
});
