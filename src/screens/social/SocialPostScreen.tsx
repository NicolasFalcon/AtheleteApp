import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackButton,
  CommentComposer,
  CommentRow,
  GlassHeader,
  PostCard,
  RetiredContent,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { ROOT_ROUTES, APP_ROUTES } from '@app/constants/routes';
import {
  COMMENT_MAX,
  commentCountLabel,
  contentState,
  listedContent,
  retiredCopy,
  sortComments,
  timeAgo,
  validateComment,
} from '@app/features/social/postModel';
import {
  useSocialResource,
  useSocialService,
} from '@app/features/social/useSocial';
import {
  ContentActions,
  type ContentTarget,
} from '@app/features/social/v2/ContentActions';
import { useAuth } from '@app/hooks/useAuth';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialPost'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Publicación y comentarios (SOCIAL_03): the post on top, flat comments below
// (no threads) and the fixed comment field. Removed or hidden content shows
// its placeholder; a post that is no longer available says so.
export function SocialPostScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useSocialService();
  const { profile } = useAuth();
  const { postId } = route.params;
  const post = useSocialResource(s => s.getPost(postId), [postId]);
  const comments = useSocialResource(s => s.getComments(postId), [postId]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const { devAction } = route.params;
  const [target, setTarget] = useState<ContentTarget | null>(
    devAction === 'reportComment'
      ? { kind: 'comment', id: 'fx-c1', mine: false }
      : devAction
      ? { kind: 'post', id: postId, mine: devAction === 'delete' }
      : null,
  );
  const [saved, setSaved] = useState(false);

  const check = validateComment(draft);
  const tooLong = !check.ok && check.error === 'too_long';
  const list = sortComments(listedContent(comments.data ?? []));

  const send = async () => {
    if (!check.ok || sending) {
      return;
    }
    setSending(true);
    try {
      await service.addComment(postId, check.body);
      setDraft('');
    } catch {
      toast.show('No se pudo enviar tu comentario', { tone: 'error' });
    } finally {
      setSending(false);
    }
  };

  const openAuthor = (userId: string) =>
    navigation.navigate(APP_ROUTES.SocialProfile, { userId });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: colors.bg }]}
    >
      <StatusBarV2 />
      <GlassHeader
        title="Publicación"
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 18,
          paddingBottom: 24,
          gap: 18,
        }}
      >
        {post.status === 'loading' ? (
          <SkeletonGroup>
            <View style={styles.skeletonHeader}>
              <Skeleton width={44} height={44} radius={22} />
              <View style={styles.skeletonLines}>
                <Skeleton width="40%" height={14} />
                <Skeleton width="60%" height={12} />
              </View>
            </View>
            <Skeleton height={240} radius={24} />
          </SkeletonGroup>
        ) : null}

        {post.status === 'error' ? (
          <BlockError message="No pudimos cargar la publicación." onRetry={post.reload} />
        ) : null}

        {post.status === 'ready' && !post.data ? (
          <RetiredContent
            title="Contenido no disponible"
            body="Ya no se puede ver: su autor lo eliminó o se retiró por incumplir las normas."
          />
        ) : null}

        {post.status === 'ready' && post.data ? (
          <PostCard
            post={post.data}
            detail
            onOpenAuthor={
              post.data.author ? () => openAuthor(post.data!.author_id) : undefined
            }
            onMore={() =>
              setTarget({
                kind: 'post',
                id: post.data!.id,
                mine: post.data!.relationship === 'self',
              })
            }
            routineSaved={saved}
            onSaveRoutine={async () => {
              try {
                await service.saveSharedRoutine(postId);
                setSaved(true);
                toast.show('Rutina guardada en tus Entrenos');
              } catch {
                toast.show('No se pudo guardar la rutina', { tone: 'error' });
              }
            }}
          />
        ) : null}

        {post.status === 'ready' && post.data && contentState(post.data) === 'visible' ? (
          <View style={[styles.comments, { borderTopColor: colors.divider }]}>
            <TextV2 variant="metaStrong" tone="secondary">
              {commentCountLabel(list.length)}
            </TextV2>
            {comments.status === 'loading' ? (
              <SkeletonGroup>
                <Skeleton height={44} radius={12} />
                <Skeleton height={44} radius={12} />
              </SkeletonGroup>
            ) : null}
            {comments.status === 'error' ? (
              <BlockError
                message="No pudimos cargar los comentarios."
                onRetry={comments.reload}
              />
            ) : null}
            {comments.status === 'ready' && list.length === 0 ? (
              <TextV2 variant="body" tone="secondary">
                Sé el primero en comentar.
              </TextV2>
            ) : null}
            {list.map(comment => {
              const state = contentState(comment);
              if (state === 'removed' || state === 'hidden') {
                const copy = retiredCopy(state, comment.relationship === 'self');
                return (
                  <RetiredContent
                    key={comment.id}
                    compact
                    title={copy.title === 'Contenido retirado' ? 'Comentario retirado' : 'Comentario en revisión'}
                    body={copy.body}
                  />
                );
              }
              const name = comment.author?.name ?? 'Usuario';
              return (
                <CommentRow
                  key={comment.id}
                  name={name}
                  time={timeAgo(comment.created_at)}
                  text={comment.body}
                  avatar={{
                    avatarKey: comment.author?.avatar_key,
                    profilePhotoUrl: comment.author?.profile_photo_url,
                    relationship: comment.relationship,
                  }}
                  onMore={() =>
                    setTarget({
                      kind: 'comment',
                      id: comment.id,
                      mine: comment.relationship === 'self',
                    })
                  }
                />
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {post.status === 'ready' && post.data && contentState(post.data) === 'visible' ? (
        <View>
          {tooLong ? (
            <TextV2
              variant="caption"
              color={colors.ember.deep}
              style={[styles.tooLong, { paddingHorizontal: layout.gutter }]}
            >
              {`Máximo ${COMMENT_MAX} caracteres.`}
            </TextV2>
          ) : null}
          <CommentComposer
            value={draft}
            onChangeText={setDraft}
            onSend={send}
            canSend={check.ok}
            sending={sending}
            maxLength={COMMENT_MAX}
            me={{
              name: profile?.name || 'Tú',
              avatarKey: profile?.avatarKey,
              profilePhotoUrl: profile?.profilePhotoUrl,
            }}
          />
        </View>
      ) : (
        <View style={{ height: insets.bottom }} />
      )}

      <ContentActions
        target={target}
        initialStep={
          devAction === 'report' || devAction === 'reportComment'
            ? 'report'
            : devAction === 'delete'
            ? 'delete'
            : 'menu'
        }
        onClose={() => setTarget(null)}
        onDone={(done, action) => {
          if (done.kind === 'post') {
            safeGoBack(navigation, BACK_FALLBACKS);
          } else if (action === 'reported') {
            comments.reload();
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonLines: { flex: 1, gap: 8 },
  comments: { borderTopWidth: 1, paddingTop: 14, gap: 18 },
  tooLong: { paddingBottom: 4 },
});
