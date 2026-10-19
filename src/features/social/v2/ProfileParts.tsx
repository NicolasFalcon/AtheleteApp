import { StyleSheet, View } from 'react-native';
import { ChevronRight, Lock } from 'lucide-react-native';
import {
  Button,
  Eyebrow,
  PressableScale,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { postKindLabel, timeAgo } from '@app/features/social/postModel';
import type { FeedPost } from '@app/features/social/postTypes';
import type {
  SocialLoadState,
  SocialRecord,
} from '@app/features/social/socialTypes';

// "RÉCORDS PERSONALES": name, NUEVO tag and the figure on the right.
export function RecordsList({ records }: { records: SocialRecord[] }) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.block}>
      <Eyebrow style={styles.eyebrow}>Récords personales</Eyebrow>
      {records.map(record => (
        <View
          key={record.exercise_name}
          style={[styles.recordRow, { borderTopColor: colors.divider }]}
        >
          <View style={styles.recordName}>
            <TextV2 variant="body">{record.exercise_name}</TextV2>
            {record.is_new ? (
              <View
                style={[styles.newTag, { backgroundColor: colors.ember.base }]}
              >
                <TextV2 variant="eyebrow" color={colors.ember.onText}>
                  Nuevo
                </TextV2>
              </View>
            ) : null}
          </View>
          <View style={styles.recordValue}>
            <TextV2 variant="section">
              {String(record.value)}
            </TextV2>
            <TextV2 variant="meta" tone="secondary">
              {record.reps ? ` ${record.unit} × ${record.reps}` : ` ${record.unit}`}
            </TextV2>
          </View>
        </View>
      ))}
    </View>
  );
}

// What a post of the profile list is about: its attachment's title, else
// its text, else its kind.
export function profilePostTitle(post: FeedPost): string {
  const attachment = post.attachment as { title?: unknown } | null;
  const title = typeof attachment?.title === 'string' ? attachment.title.trim() : '';
  return title || post.body?.trim() || postKindLabel(post.type);
}

// "PUBLICACIONES" of a profile (mine or a friend's): get_user_posts, 20 per
// page, "Ver más" for the next one.
export function ProfilePosts({
  status,
  posts,
  hasMore,
  loadingMore,
  emptyText,
  onOpen,
  onMore,
  onRetry,
}: {
  status: SocialLoadState;
  posts: FeedPost[];
  hasMore: boolean;
  loadingMore: boolean;
  emptyText: string;
  onOpen: (post: FeedPost) => void;
  onMore: () => void;
  onRetry: () => void;
}) {
  const { colors } = useThemeV2();
  return (
    <View style={styles.block}>
      <Eyebrow style={styles.eyebrow}>Publicaciones</Eyebrow>
      {status === 'loading' ? (
        <SkeletonGroup>
          {[0, 1, 2].map(index => (
            <View key={index} style={styles.postSkeleton}>
              <Skeleton width="35%" height={11} />
              <Skeleton width="80%" height={15} />
            </View>
          ))}
        </SkeletonGroup>
      ) : status === 'error' ? (
        <BlockError message="No pudimos cargar las publicaciones." onRetry={onRetry} />
      ) : posts.length === 0 ? (
        <TextV2 variant="body" tone="secondary" style={styles.postsEmpty}>
          {emptyText}
        </TextV2>
      ) : (
        <>
          {posts.map(post => (
            <PressableScale
              key={post.id}
              accessibilityRole="button"
              accessibilityLabel={`${postKindLabel(post.type)}. ${profilePostTitle(post)}`}
              onPress={() => onOpen(post)}
              style={[styles.postRow, { borderTopColor: colors.divider }]}
            >
              <View style={styles.postTexts}>
                <TextV2 variant="eyebrow" tone="secondary">
                  {`${postKindLabel(post.type).toUpperCase()} · ${timeAgo(post.created_at)}`}
                </TextV2>
                <TextV2 variant="bodyStrong" numberOfLines={2}>
                  {profilePostTitle(post)}
                </TextV2>
              </View>
              <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2} />
            </PressableScale>
          ))}
          {hasMore ? (
            <Button
              label="Ver más"
              variant="secondary"
              size="md"
              loading={loadingMore}
              disabled={loadingMore}
              onPress={onMore}
              style={styles.more}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

export function PrivacyLine({ text }: { text: string }) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.privacy}>
      <Lock size={15} color={colors.text.tertiary} strokeWidth={1.8} />
      <TextV2 variant="meta" tone="secondary" style={styles.privacyText}>
        {text}
      </TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 0 },
  eyebrow: { paddingBottom: 4 },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  recordName: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  recordValue: { flexDirection: 'row', alignItems: 'baseline' },
  newTag: {
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 5,
    justifyContent: 'center',
  },
  postSkeleton: { gap: 8, paddingVertical: 12 },
  postsEmpty: { paddingVertical: 8 },
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  postTexts: { flex: 1, gap: 2 },
  more: { marginTop: 8 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  privacyText: { flex: 1 },
});
