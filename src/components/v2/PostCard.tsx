import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';
import { PersonAvatar } from '@app/components/v2/PersonAvatar';
import {
  AchievementBody,
  ChallengeBody,
  PhotoBody,
  RecordBody,
  RoutineBody,
  RouteBody,
  WorkoutLightBody,
  WorkoutPhotoBody,
} from '@app/components/v2/PostBodies';
import { PressableScale } from '@app/components/v2/PressableScale';
import { ReactionBar } from '@app/components/v2/ReactionBar';
import { RetiredContent } from '@app/components/v2/RetiredContent';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import { useToast } from '@app/components/v2/Toast';
import {
  contentState,
  isHighlightedKind,
  isWorkoutAttachment,
  postBodyKind,
  postKindLabel,
  retiredCopy,
  settleLike,
  timeAgo,
  toggleLikeState,
  type LikeState,
} from '@app/features/social/postModel';
import type {
  AchievementAttachment,
  ChallengeAttachment,
  FeedPost,
  RecordAttachment,
  RoutineAttachment,
  RouteAttachment,
} from '@app/features/social/postTypes';
import { routePostsEnabled } from '@app/features/social/routePosts';
import { useSocialService } from '@app/features/social/useSocial';

export type PostCardProps = {
  post: FeedPost;
  // Detail screen: the card is not pressable and shows the whole text.
  detail?: boolean;
  onOpenPost?: () => void;
  onOpenAuthor?: () => void;
  onMore?: () => void;
  onComment?: () => void;
  routineSaved?: boolean;
  onSaveRoutine?: () => void;
  // "Ver rutina" opens SOCIAL_04.
  onOpenRoutine?: () => void;
  // Tab bar visible under the toast (feed) or not (detail).
  withTabBar?: boolean;
};

// Social Post (handoff §5): author header, a short text, the composition of
// its type and the reactions. The text is user content: always plain text.
// Removed or hidden posts show their placeholder instead (never the content).
export function PostCard({
  post,
  detail = false,
  onOpenPost,
  onOpenAuthor,
  onMore,
  onComment,
  routineSaved = false,
  onSaveRoutine,
  onOpenRoutine,
  withTabBar = false,
}: PostCardProps) {
  const { colors } = useThemeV2();
  const toast = useToast();
  const service = useSocialService();
  const [like, setLike] = useState<LikeState>({
    liked: post.liked_by_me,
    count: post.like_count,
  });

  // A refreshed list brings the server figures.
  useEffect(() => {
    setLike({ liked: post.liked_by_me, count: post.like_count });
  }, [post.liked_by_me, post.like_count]);

  const state = contentState(post);
  if (state === 'deleted') {
    return null;
  }
  if (state !== 'visible') {
    const copy = retiredCopy(state, post.relationship === 'self');
    return <RetiredContent title={copy.title} body={copy.body} />;
  }

  // Optimistic like: show it now, keep the server figures, revert on failure.
  const onLike = async () => {
    const previous = like;
    setLike(toggleLikeState(previous));
    try {
      const result = await service.toggleLike(post.id, !previous.liked);
      setLike(settleLike(previous, result));
    } catch {
      setLike(settleLike(previous, null));
      toast.show('No se pudo registrar tu me gusta', {
        tone: 'error',
        withTabBar,
      });
    }
  };

  const name = post.author?.name ?? 'Usuario';
  const kind = postBodyKind(post, { routeEnabled: routePostsEnabled() });
  // A type this app does not know (or `route` without Ruta) is not shown.
  if (kind === 'unknown') {
    return null;
  }
  const attachment = post.attachment;
  const open = detail ? undefined : onOpenPost;
  const sport =
    kind === 'route' && attachment && 'sport' in attachment
      ? (attachment as RouteAttachment).sport
      : undefined;
  const label = postKindLabel(post.type, sport).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Perfil de ${name}`}
          disabled={!onOpenAuthor}
          onPress={onOpenAuthor}
          style={styles.author}
        >
          <PersonAvatar
            name={name}
            size={40}
            avatarKey={post.author?.avatar_key}
            profilePhotoUrl={post.author?.profile_photo_url}
            relationship={post.relationship}
          />
          <View style={styles.authorTexts}>
            <TextV2 variant="bodyStrong" numberOfLines={1}>
              {name}
            </TextV2>
            <View style={styles.kindRow}>
              <TextV2
                style={[
                  styles.kind,
                  { color: isHighlightedKind(post.type) ? colors.ember.base : colors.text.secondary },
                ]}
              >
                {label}
              </TextV2>
              <TextV2 variant="caption" color={colors.text.secondary} numberOfLines={1}>
                {`· ${timeAgo(post.created_at)}`}
              </TextV2>
            </View>
          </View>
        </PressableScale>
        {onMore ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Más opciones de la publicación"
            hitSlop={12}
            onPress={onMore}
          >
            <MoreHorizontal size={18} strokeWidth={2} color={colors.text.tertiary} />
          </PressableScale>
        ) : null}
      </View>

      {kind === 'workoutPhoto' && isWorkoutAttachment(attachment) && post.photo_path ? (
        <WorkoutPhotoBody
          attachment={attachment}
          photoPath={post.photo_path}
          width={post.photo_width}
          height={post.photo_height}
          onPress={open}
        />
      ) : null}
      {kind === 'workoutLight' && isWorkoutAttachment(attachment) ? (
        <WorkoutLightBody attachment={attachment} onPress={open} />
      ) : null}
      {kind === 'record' && attachment ? (
        <RecordBody attachment={attachment as RecordAttachment} onPress={open} />
      ) : null}
      {kind === 'routine' && attachment ? (
        <RoutineBody
          attachment={attachment as RoutineAttachment}
          saved={routineSaved}
          onOpen={onOpenRoutine ?? onOpenPost ?? (() => {})}
          onSave={onSaveRoutine ?? (() => {})}
        />
      ) : null}
      {kind === 'achievement' && attachment ? (
        <AchievementBody attachment={attachment as AchievementAttachment} onPress={open} />
      ) : null}
      {kind === 'challenge' && attachment ? (
        <ChallengeBody attachment={attachment as ChallengeAttachment} onPress={open} />
      ) : null}
      {kind === 'route' && attachment ? (
        <RouteBody attachment={attachment as RouteAttachment} onPress={open} />
      ) : null}
      {kind === 'photo' && post.photo_path ? (
        <PhotoBody
          photoPath={post.photo_path}
          width={post.photo_width}
          height={post.photo_height}
        />
      ) : null}

      <ReactionBar
        liked={like.liked}
        likes={like.count}
        comments={post.comment_count}
        onLike={onLike}
        onComment={onComment ?? onOpenPost}
      />

      {post.body ? (
        <TextV2 variant="bodyL" selectable={false} style={styles.caption}>
          <TextV2 variant="bodyL" style={styles.captionName}>{`${name} `}</TextV2>
          {post.body}
        </TextV2>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  authorTexts: { flex: 1, gap: 2 },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kind: { fontSize: 12, fontWeight: '700', letterSpacing: 0.7 },
  // The text is the footer: "**Nombre** texto".
  caption: { fontSize: 15, lineHeight: 22, marginTop: -4 },
  captionName: { fontSize: 15, fontWeight: '700' },
});
