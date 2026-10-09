import type {
  CreateInviteResult,
  ProfileLookup,
  SocialService,
} from '@app/services/social/socialService';
import {
  buildBoard,
  buildMyChallenges,
  inviterIds,
  listedIds,
  lookupFromBoard,
  parseBoard,
  parseContributions,
  parseCreateChallenge,
  parseJoinOfficial,
  parseManualContribution,
  parseMineRow,
  parseMyChallenges,
  parseOkFlag,
  parseRespondInvite,
  weekStart,
  type BoardLookup,
} from '@app/features/social/challengeMappers';
import type { ChallengeBoard, MyChallenges } from '@app/features/social/challengeTypes';
import {
  ModerationError,
  isValidAction,
  moderationFailure,
  openQueue,
  parseModeratorRole,
} from '@app/features/social/moderationModel';
import {
  nextNotificationCursor,
  notificationActorIds,
  parseNotifications,
  type NotificationPage,
} from '@app/features/social/notificationModel';
import {
  acceptsRequestsFrom,
  buildBlocked,
  buildFriendsOverview,
  inviteRowFrom,
  interpretUsernameRpc,
  isOkResponse,
  overviewPersonIds,
  parseChallengeCounts,
  parseFindUser,
  parseFriendActivity,
  parseInviteCreation,
  parseProfileDetail,
  parseRespondStatus,
  parseSendStatus,
  profileFromProfileRpc,
  profileMap,
  toSetUsernameResult,
  usernameErrorFromPostgres,
  withPhotoPolicy,
} from '@app/features/social/socialMappers';
import {
  inviteUrl,
  normalizeUsername,
  validateUsername,
} from '@app/features/social/socialModel';
import type {
  BlockedEntry,
  FindUserResult,
  FriendInviteRow,
  FriendsOverview,
  SendFriendRequestStatus,
  SetUsernameResult,
  SocialProfileRow,
  SocialSettingsPatch,
  SocialSettingsRow,
} from '@app/features/social/socialTypes';
import {
  isDuplicate,
  isNotAuthenticated,
  isUnavailable,
  isValidationError,
  parseActivityItems,
  parseCreatePost,
  parseFeedPage,
  parseFeedPost,
  toFeedComments,
  withActivityAuthors,
  type PostgrestLike,
} from '@app/features/social/feedMappers';
import {
  normalizePhotoMime,
  photoFileName,
  PHOTO_MAX_BYTES,
  POST_BODY_MAX,
  validateComment,
  validatePhoto,
  validateReport,
} from '@app/features/social/postModel';
import type {
  ActivityItem,
  CreatePostResult,
  FeedComment,
  FeedPage,
  FeedPost,
  ReportReason,
  ReportTarget,
  SocialCommentRow,
  ToggleLikeResult,
} from '@app/features/social/postTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUuid } from '@app/lib/uuid';
import { loadAttachmentSources } from '@app/services/social/attachmentSources';
import { getSupabaseClient } from '@app/services/supabase/client';
import {
  prefetchSocialPhotoUrls,
  resolveSocialPhotoUrl,
} from '@app/services/supabase/social-photos';
import { prefetchProfilePhotoUris } from '@app/services/supabase/profile-photo';

// Supabase implementation of `SocialService`: W1 (personas: lectura, nombre de
// usuario y privacidad), W2 (escrituras de personas), W3 (feed y publicaciones),
// W4 (publicar), W5 (retos), W6 (notificaciones) and W7 (moderación). Every
// method talks to the backend; the sample data only exists in the dev fixtures.

// BT-43 (placeholder): local acceptance of the Terms before the first post.
const TERMS_KEY = '@athelete/social-terms-accepted';

// 42501 = "no disponible" (no permission): the screens show the content as
// unavailable, not as a failure with retry.
export class SocialUnavailableError extends Error {
  constructor() {
    super('Contenido no disponible');
    this.name = 'SocialUnavailableError';
  }
}

// 23514 on a comment: the body is not 1 to 500 characters.
export class SocialValidationError extends Error {
  constructor(public field: 'comment' | 'report') {
    super(`Valor no válido: ${field}`);
    this.name = 'SocialValidationError';
  }
}

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }
  return supabase;
}

async function currentUserId(): Promise<string> {
  const { data, error } = await client().auth.getSession();
  const id = data.session?.user.id;
  if (error || !id) {
    throw new Error('Sin sesión');
  }
  return id;
}

async function fetchProfiles(ids: string[]): Promise<Map<string, SocialProfileRow>> {
  if (ids.length === 0) {
    return new Map();
  }
  const { data, error } = await client().rpc('get_social_profiles', {
    _user_ids: ids,
  });
  if (error) {
    throw error;
  }
  return profileMap(data);
}

async function findUser(username: string): Promise<FindUserResult | null> {
  // The server only accepts the exact format; skip the call for anything else.
  if (!validateUsername(username).ok) {
    return null;
  }
  const { data, error } = await client().rpc('find_user_by_username', {
    _username: normalizeUsername(username),
  });
  if (error) {
    throw error;
  }
  return parseFindUser(data);
}

// Maps the errors of a W3 call: a gone session signs out (not_authenticated),
// no permission is "no disponible", a check violation is a validation error.
async function failed(error: PostgrestLike & object, field?: 'comment' | 'report'): Promise<never> {
  if (isNotAuthenticated(error)) {
    await client().auth.signOut().catch(() => undefined);
  }
  if (isUnavailable(error)) {
    throw new SocialUnavailableError();
  }
  if (field && isValidationError(error)) {
    throw new SocialValidationError(field);
  }
  throw error;
}

// People the viewer is friends with (to decide whose comment photo is shown).
async function friendIdSet(me: string): Promise<Set<string>> {
  const { data } = await client()
    .from('friendships')
    .select('user_low,user_high')
    .or(`user_low.eq.${me},user_high.eq.${me}`);
  return new Set(
    (data ?? []).map(row => (row.user_low === me ? row.user_high : row.user_low)),
  );
}

// Signs, in one request each, the friend avatars and the photos of a page.
async function prefetchPostPhotos(posts: FeedPost[]): Promise<void> {
  await Promise.all([
    prefetchSocialPhotoUrls(posts.map(post => post.photo_path)),
    prefetchProfilePhotoUris(posts.map(post => post.author?.profile_photo_url)),
  ]).catch(() => undefined);
}

export const supabaseSocialService: SocialService = {
  // ── W1 · privacidad y nombre de usuario ─────────────────────────────────
  async getSettings(): Promise<SocialSettingsRow | null> {
    const me = await currentUserId();
    const { data, error } = await client()
      .from('social_settings')
      .select('*')
      .eq('user_id', me)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data ?? null;
  },

  async setUsername(username): Promise<SetUsernameResult> {
    const value = normalizeUsername(username);
    const current = await supabaseSocialService.getSettings();
    const supabase = client();

    // First time: ensure_social_settings creates the row with the username;
    // afterwards set_username changes it.
    const call = current
      ? await supabase.rpc('set_username', { _username: value })
      : await supabase.rpc('ensure_social_settings', { _username: value });
    if (call.error) {
      const mapped = usernameErrorFromPostgres(call.error);
      if (mapped) {
        return { ok: false, error: mapped };
      }
      throw call.error;
    }

    const parsed = interpretUsernameRpc(call.data);
    // The row appeared meanwhile (created = false): apply the new name.
    if (parsed.kind === 'ok' && parsed.created === false && parsed.username !== value) {
      const retry = await supabase.rpc('set_username', { _username: value });
      if (retry.error) {
        const mapped = usernameErrorFromPostgres(retry.error);
        if (mapped) {
          return { ok: false, error: mapped };
        }
        throw retry.error;
      }
      const result = toSetUsernameResult(interpretUsernameRpc(retry.data), value);
      if (result) {
        return result;
      }
      throw new Error('Respuesta inesperada de set_username');
    }
    const result = toSetUsernameResult(parsed, value);
    if (!result) {
      throw new Error('Respuesta inesperada del nombre de usuario');
    }
    return result;
  },

  async updateSettings(patch: SocialSettingsPatch): Promise<SocialSettingsRow> {
    const me = await currentUserId();
    const { data, error } = await client()
      .from('social_settings')
      .update(patch)
      .eq('user_id', me)
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    return data;
  },

  // ── W1 · personas (lectura) ─────────────────────────────────────────────
  async getFriendsOverview(): Promise<FriendsOverview> {
    const me = await currentUserId();
    const supabase = client();
    const mine = `user_low.eq.${me},user_high.eq.${me}`;
    const [friendships, requests] = await Promise.all([
      supabase.from('friendships').select('*').or(mine),
      supabase
        .from('friend_requests')
        .select('*')
        .eq('status', 'pending')
        .or(`sender_id.eq.${me},receiver_id.eq.${me}`),
    ]);
    if (friendships.error) {
      throw friendships.error;
    }
    if (requests.error) {
      throw requests.error;
    }

    const ids = overviewPersonIds(me, friendships.data, requests.data);
    // Activity and challenge counts only decorate the list: if they fail the
    // people still show (counts 0, no activity line).
    const [profiles, activity, challenges] = await Promise.all([
      fetchProfiles(ids),
      supabase
        .rpc('get_friend_activity', { _limit: 50 })
        .then(
          result => (result.error ? null : result.data),
          () => null,
        ),
      supabase
        .rpc('get_my_challenges')
        .then(
          result => (result.error ? null : result.data),
          () => null,
        ),
    ]);

    const overview = buildFriendsOverview({
      me,
      friendships: friendships.data,
      requests: requests.data,
      profiles,
      activity: parseFriendActivity(activity),
      counts: parseChallengeCounts(challenges),
    });
    // Photos are storage paths: sign the friends' ones in one request (DA-119:
    // only friends get a real photo). The avatars then find them in the cache.
    await prefetchProfilePhotoUris(
      overview.friends.map(friend => friend.profile.profile_photo_url),
    ).catch(() => undefined);
    return overview;
  },

  async findByUsername(username): Promise<FindUserResult | null> {
    return findUser(username);
  },

  async getProfile(userId): Promise<ProfileLookup> {
    const me = await currentUserId();
    const supabase = client();
    const [detailResult, profiles, block, requests] = await Promise.all([
      supabase.rpc('get_social_profile', { _user_id: userId }),
      fetchProfiles([userId]),
      supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', me)
        .eq('blocked_id', userId)
        .maybeSingle(),
      supabase
        .from('friend_requests')
        .select('id')
        .eq('status', 'pending')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${me}),and(sender_id.eq.${me},receiver_id.eq.${userId})`,
        )
        .limit(1),
    ]);
    // null from the RPC (block, no such user, no config and not friends) or an
    // error with a database code is "no disponible"; only a failure without a
    // code (network, session) is an error with retry.
    if (detailResult.error && !detailResult.error.code) {
      throw detailResult.error;
    }
    if (block.error) {
      throw block.error;
    }
    const detail = detailResult.error ? null : parseProfileDetail(detailResult.data);
    // get_social_profile carries the identity too; get_social_profiles covers
    // the case where only the batch RPC returns the row.
    const identity =
      (detailResult.error ? null : profileFromProfileRpc(detailResult.data)) ??
      profiles.get(userId) ??
      null;
    const profile = identity
      ? withPhotoPolicy(identity, detail?.relationship ?? 'none')
      : null;
    if (profile && (detail?.relationship === 'friends' || detail?.relationship === 'self')) {
      await prefetchProfilePhotoUris([profile.profile_photo_url]).catch(() => undefined);
    }

    return {
      profile,
      detail,
      acceptsRequests: detailResult.error ? true : acceptsRequestsFrom(detailResult.data),
      blocked: block.data !== null,
      requestId: requests.error ? null : (requests.data?.[0]?.id ?? null),
    };
  },

  async getBlocked(): Promise<BlockedEntry[]> {
    const me = await currentUserId();
    const { data, error } = await client()
      .from('user_blocks')
      .select('*')
      .eq('blocker_id', me)
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    const profiles = await fetchProfiles(data.map(block => block.blocked_id));
    return buildBlocked(data, profiles);
  },

  // ── W2 · escrituras de personas ─────────────────────────────────────────
  async sendFriendRequest(target): Promise<SendFriendRequestStatus> {
    const { data, error } = await client().rpc('send_friend_request', {
      _target: target,
    });
    if (error) {
      throw error;
    }
    return parseSendStatus(data);
  },

  async respondFriendRequest(requestId, accept) {
    const { data, error } = await client().rpc('respond_friend_request', {
      _request_id: requestId,
      _accept: accept,
    });
    if (error) {
      throw error;
    }
    return parseRespondStatus(data, accept);
  },

  async cancelFriendRequest(requestId) {
    const { error } = await client().rpc('cancel_friend_request', {
      _request_id: requestId,
    });
    if (error) {
      throw error;
    }
  },

  async removeFriend(friendId): Promise<boolean> {
    const { data, error } = await client().rpc('remove_friend', {
      _friend: friendId,
    });
    if (error) {
      throw error;
    }
    if (!isOkResponse(data)) {
      throw new Error('remove_friend no respondió ok');
    }
    return (data as { removed?: unknown }).removed !== false;
  },

  async blockUser(target) {
    const { data, error } = await client().rpc('block_user', { _target: target });
    if (error) {
      throw error;
    }
    if (!isOkResponse(data)) {
      throw new Error('block_user no respondió ok');
    }
  },

  async unblockUser(target) {
    const me = await currentUserId();
    const { error } = await client()
      .from('user_blocks')
      .delete()
      .eq('blocker_id', me)
      .eq('blocked_id', target);
    if (error) {
      throw error;
    }
  },

  async createInvite(): Promise<CreateInviteResult> {
    const me = await currentUserId();
    const { data, error } = await client().rpc('create_friend_invite');
    if (error) {
      throw error;
    }
    const created = parseInviteCreation(data);
    if (!created.ok) {
      if (created.error === 'limit') {
        return { ok: false, error: 'limit' };
      }
      throw new Error('Respuesta inesperada de create_friend_invite');
    }
    // The stored row (the list shows the real dates); the response is enough
    // when it cannot be read back.
    const stored = await client()
      .from('friend_invites')
      .select('*')
      .eq('id', created.id)
      .maybeSingle();
    const invite: FriendInviteRow = stored.data ?? inviteRowFrom(created, me);
    return { ok: true, link: { invite, url: inviteUrl(invite.token) } };
  },

  async getInvites(): Promise<FriendInviteRow[]> {
    const me = await currentUserId();
    const { data, error } = await client()
      .from('friend_invites')
      .select('*')
      .eq('inviter_id', me)
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    return data;
  },

  async revokeInvite(inviteId): Promise<boolean> {
    const me = await currentUserId();
    // Only a link that is neither used nor revoked can be revoked.
    const { data, error } = await client()
      .from('friend_invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', inviteId)
      .eq('inviter_id', me)
      .is('used_at', null)
      .is('revoked_at', null)
      .select('id');
    if (error) {
      throw error;
    }
    return data.length > 0;
  },

  // ── Contenido (W3) ──────────────────────────────────────────────────────
  async getFeed(cursor, limit): Promise<FeedPage> {
    const me = await currentUserId();
    const { data, error } = await client().rpc('get_feed', {
      _limit: limit,
      ...(cursor ? { _before: cursor } : {}),
    });
    if (error) {
      return failed(error);
    }
    const page = parseFeedPage(data, me, limit);
    await prefetchPostPhotos(page.posts);
    return page;
  },

  async getFriendActivity(limit): Promise<ActivityItem[]> {
    const supabase = client();
    const { data, error } = await supabase.rpc('get_friend_activity', {
      _limit: Math.min(100, Math.max(1, limit)),
    });
    if (error) {
      return failed(error);
    }
    const items = parseActivityItems(data);
    // The activity has no photo: complete the authors with get_social_profiles.
    const profiles = await fetchProfiles(Array.from(new Set(items.map(item => item.user_id))));
    const withAuthors = withActivityAuthors(items, profiles, data);
    await prefetchProfilePhotoUris(
      withAuthors.map(item => item.author?.profile_photo_url),
    ).catch(() => undefined);
    return withAuthors;
  },

  // get_post: same format as a row of get_feed, or null when it cannot be seen
  // (no permission error): the screen shows "no disponible".
  async getPost(postId): Promise<FeedPost | null> {
    const me = await currentUserId();
    const { data, error } = await client().rpc('get_post', { _id: postId });
    if (error) {
      if (isUnavailable(error)) {
        return null;
      }
      return failed(error);
    }
    const post = parseFeedPost(data, me);
    if (post) {
      await prefetchPostPhotos([post]);
    }
    return post;
  },

  async toggleLike(postId, like): Promise<ToggleLikeResult> {
    const me = await currentUserId();
    const supabase = client();
    // Like: INSERT … ON CONFLICT DO NOTHING (a second tap is not an error).
    // Unlike: DELETE (nothing to delete is not an error either).
    const write = like
      ? await supabase
          .from('social_post_likes')
          .upsert(
            { post_id: postId, user_id: me },
            { onConflict: 'post_id,user_id', ignoreDuplicates: true },
          )
      : await supabase
          .from('social_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', me);
    if (write.error && !isDuplicate(write.error)) {
      return failed(write.error);
    }
    // The server keeps the counter: read it back; without it the screen keeps
    // its own figure.
    const counted = await supabase
      .from('social_posts')
      .select('like_count')
      .eq('id', postId)
      .maybeSingle();
    return { liked: like, count: counted.error ? null : (counted.data?.like_count ?? null) };
  },

  async getComments(postId): Promise<FeedComment[]> {
    const me = await currentUserId();
    const { data, error } = await client()
      .from('social_post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) {
      return failed(error);
    }
    const rows: SocialCommentRow[] = data ?? [];
    const authors = Array.from(new Set(rows.map(row => row.author_id)));
    const [profiles, friends] = await Promise.all([fetchProfiles(authors), friendIdSet(me)]);
    const comments = toFeedComments(rows, profiles, me, friends);
    await prefetchProfilePhotoUris(
      comments.map(comment => comment.author?.profile_photo_url),
    ).catch(() => undefined);
    return comments;
  },

  async addComment(postId, body): Promise<FeedComment> {
    // 1 to 500 characters, checked before sending (23514 maps to the same).
    const check = validateComment(body);
    if (!check.ok) {
      throw new SocialValidationError('comment');
    }
    const me = await currentUserId();
    const { data, error } = await client()
      .from('social_post_comments')
      .insert({ post_id: postId, author_id: me, body: check.body })
      .select('*')
      .single();
    if (error) {
      return failed(error, 'comment');
    }
    const profiles = await fetchProfiles([me]);
    return toFeedComments([data], profiles, me, new Set())[0];
  },

  async deleteComment(commentId) {
    // The author of the comment or the author of the post can delete it.
    const { data, error } = await client().rpc('delete_comment', {
      _comment_id: commentId,
    });
    if (error) {
      return failed(error);
    }
    if (!isOkResponse(data)) {
      throw new Error('delete_comment no respondió ok');
    }
  },

  async deletePost(postId) {
    const me = await currentUserId();
    const { data, error } = await client()
      .from('social_posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('author_id', me)
      .select('id');
    if (error) {
      return failed(error);
    }
    // 0 rows updated: nothing was deleted (not yours, or already gone).
    if (data.length === 0) {
      throw new Error('No se pudo borrar la publicación');
    }
  },

  // ── Publicar (W4) ───────────────────────────────────────────────────────
  async editPost(postId, body) {
    const me = await currentUserId();
    const text = body.trim();
    if (text.length > POST_BODY_MAX) {
      throw new SocialValidationError('comment');
    }
    const { data, error } = await client()
      .from('social_posts')
      .update({ body: text.length > 0 ? text : null })
      .eq('id', postId)
      .eq('author_id', me)
      .select('id');
    if (error) {
      return failed(error);
    }
    // 0 rows updated: nothing changed (not yours, deleted or removed).
    if (data.length === 0) {
      throw new Error('No se pudo editar la publicación');
    }
  },

  async getAttachmentSources(focus) {
    const me = await currentUserId();
    const settings = await supabaseSocialService.getSettings();
    return loadAttachmentSources(me, settings, focus);
  },

  // The photo goes up first ({uid}/{uuid}/photo.<ext> in social-photos, by its real type), then
  // create_post. If create_post fails the upload is not retried: orphan photos
  // are deleted by the server after 24 h.
  async createPost(input): Promise<CreatePostResult> {
    const me = await currentUserId();
    const supabase = client();
    let photoPath: string | undefined;
    let size: { width: number; height: number } | null = null;

    if (input.photo) {
      const photo = input.photo;
      const issue = validatePhoto(photo);
      if (issue) {
        return { ok: false, error: issue };
      }
      if (!photo.uri) {
        return { ok: false, error: 'validation' };
      }
      input.onStep?.('uploading');
      let bytes: ArrayBuffer;
      try {
        bytes = await (await fetch(photo.uri)).arrayBuffer();
      } catch {
        return { ok: false, error: 'upload_failed' };
      }
      // The real size of the file: what the picker reported can be off.
      if (bytes.byteLength > PHOTO_MAX_BYTES) {
        return { ok: false, error: 'photo_size' };
      }
      const path = `${me}/${createUuid()}/${photoFileName(photo.mime)}`;
      const upload = await supabase.storage.from('social-photos').upload(path, bytes, {
        contentType: normalizePhotoMime(photo.mime),
        upsert: false,
      });
      if (upload.error) {
        const status = String(
          (upload.error as { statusCode?: string | number }).statusCode ?? '',
        );
        return {
          ok: false,
          error:
            status === '413' || /too large|payload/i.test(upload.error.message)
              ? 'photo_size'
              : 'upload_failed',
        };
      }
      photoPath = path;
      size = { width: Math.round(photo.width), height: Math.round(photo.height) };
    }

    input.onStep?.('publishing');
    const { data, error } = await supabase.rpc('create_post', {
      _type: input.type,
      ...(input.sourceId ? { _source_id: input.sourceId } : {}),
      ...(input.body ? { _body: input.body } : {}),
      ...(photoPath && size
        ? { _photo_path: photoPath, _photo_width: size.width, _photo_height: size.height }
        : {}),
    });
    if (error) {
      return failed(error);
    }
    return parseCreatePost(data);
  },

  async getPostPhotoSource(path) {
    const uri = await resolveSocialPhotoUrl(path);
    return uri ? { uri } : null;
  },
  async reportContent(
    target: ReportTarget,
    targetId: string,
    reason: ReportReason,
    details: string | null,
  ) {
    const check = validateReport({ reason, details: details ?? '' });
    if (!check.ok) {
      throw new SocialValidationError('report');
    }
    const me = await currentUserId();
    const { error } = await client()
      .from('content_reports')
      .insert({
        reporter_id: me,
        target_type: target,
        target_id: targetId,
        reason: check.reason,
        details: check.details,
      });
    // Reporting the same thing twice is not an error (ON CONFLICT DO NOTHING);
    // the server already hides it from the reporter.
    if (error && !isDuplicate(error)) {
      return failed(error, 'report');
    }
  },
  // Saves the copy of a shared routine in my Entrenos (save_shared_routine).
  async saveSharedRoutine(postId) {
    const { data, error } = await client().rpc('save_shared_routine', {
      _post_id: postId,
    });
    if (error) {
      return failed(error);
    }
    const body = data as { ok?: unknown; created?: unknown; template_id?: unknown } | null;
    if (body?.ok !== true || typeof body.template_id !== 'string') {
      throw new Error('save_shared_routine no respondió ok');
    }
    return { templateId: body.template_id, created: body.created !== false };
  },
  // BT-43: the acceptance lives on the device until the server flag exists.
  // TODO(testflight): pass the acceptance to the server (profiles.terms_accepted_at).
  async getTermsAccepted() {
    const me = await currentUserId();
    try {
      return (await AsyncStorage.getItem(`${TERMS_KEY}:${me}`)) === 'true';
    } catch {
      return false;
    }
  },
  async acceptTerms() {
    const me = await currentUserId();
    await AsyncStorage.setItem(`${TERMS_KEY}:${me}`, 'true');
  },

  // ── Retos (W5) ──────────────────────────────────────────────────────────
  // The list comes from get_my_challenges; the avatars and the leader of each
  // row come from its board (one get_challenge_board per listed challenge,
  // capped). A board that fails only leaves that row without them.
  async getMyChallenges(): Promise<MyChallenges> {
    const supabase = client();
    const { data, error } = await supabase.rpc('get_my_challenges');
    if (error) {
      return failed(error);
    }
    const parsed = parseMyChallenges(data);
    const settled = await Promise.allSettled(
      listedIds(parsed).map(async id => {
        const board = await supabase.rpc('get_challenge_board', { _challenge_id: id });
        return [id, board.error ? null : lookupFromBoard(parseBoard(board.data))] as const;
      }),
    );
    const lookups = new Map<string, BoardLookup>();
    settled.forEach(result => {
      if (result.status === 'fulfilled' && result.value[1]) {
        lookups.set(result.value[0], result.value[1]);
      }
    });
    const known = new Set(
      Array.from(lookups.values()).flatMap(lookup => lookup.board.map(entry => entry.user_id)),
    );
    const missing = inviterIds(parsed).filter(id => !known.has(id));
    const profiles = await fetchProfiles(missing).catch(() => new Map<string, SocialProfileRow>());
    const result = buildMyChallenges(parsed, lookups, profiles);
    await prefetchProfilePhotoUris(
      [result.official, ...result.active, ...result.invitations].flatMap(summary =>
        summary
          ? [
              summary.inviter?.profile_photo_url,
              ...summary.people.map(person => person.profile?.profile_photo_url),
            ]
          : [],
      ),
    ).catch(() => undefined);
    return result;
  },

  // Ranking only: the API has no activity per challenge. null = "no disponible".
  async getChallengeBoard(challengeId): Promise<ChallengeBoard | null> {
    const me = await currentUserId();
    const supabase = client();
    const { data, error } = await supabase.rpc('get_challenge_board', {
      _challenge_id: challengeId,
    });
    if (error) {
      if (isUnavailable(error)) {
        return null;
      }
      return failed(error);
    }
    const parsed = parseBoard(data);
    if (!parsed) {
      return null;
    }
    const now = new Date();
    const official = parsed.head.kind === 'official';
    // My own row (celebrated_at, rank) and, for the official challenge, my
    // contributions of the week (bars and what I added by hand today).
    const [participant, contributions] = await Promise.all([
      supabase
        .from('social_challenge_participants')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('user_id', me)
        .maybeSingle(),
      official
        ? supabase
            .from('social_challenge_contributions')
            .select('amount,source,occurred_at')
            .eq('challenge_id', challengeId)
            .eq('user_id', me)
            .gte('occurred_at', weekStart(now).toISOString())
        : Promise.resolve(null),
    ]);
    const mine = participant.error ? null : parseMineRow(participant.data);
    const inviterId = mine?.invited_by ?? null;
    const inviter = inviterId
      ? (parsed.board.find(entry => entry.user_id === inviterId)?.profile ??
        (await fetchProfiles([inviterId]).catch(() => new Map<string, SocialProfileRow>())).get(
          inviterId,
        ) ??
        null)
      : null;
    await prefetchProfilePhotoUris(
      [...parsed.board.map(entry => entry.profile?.profile_photo_url), inviter?.profile_photo_url],
    ).catch(() => undefined);
    return buildBoard({
      parsed,
      mine,
      contributions:
        contributions && !contributions.error ? parseContributions(contributions.data) : null,
      inviter,
      now,
    });
  },

  async respondChallengeInvite(challengeId, accept) {
    const { data, error } = await client().rpc('respond_challenge_invite', {
      _challenge_id: challengeId,
      _accept: accept,
    });
    if (error) {
      return failed(error);
    }
    return parseRespondInvite(data, accept);
  },
  async joinOfficialChallenge(challengeId) {
    const { data, error } = await client().rpc('join_official_challenge', {
      _challenge_id: challengeId,
    });
    if (error) {
      return failed(error);
    }
    return parseJoinOfficial(data);
  },
  async leaveChallenge(challengeId) {
    const { data, error } = await client().rpc('leave_challenge', {
      _challenge_id: challengeId,
    });
    if (error) {
      return failed(error);
    }
    return parseOkFlag(data);
  },
  async cancelFriendChallenge(challengeId) {
    const { data, error } = await client().rpc('cancel_friend_challenge', {
      _challenge_id: challengeId,
    });
    if (error) {
      return failed(error);
    }
    return parseOkFlag(data);
  },
  async addManualContribution(challengeId, amount) {
    const { data, error } = await client().rpc('add_manual_contribution', {
      _challenge_id: challengeId,
      _amount: amount,
    });
    if (error) {
      return failed(error);
    }
    return parseManualContribution(data);
  },
  async createFriendChallenge(input) {
    const { data, error } = await client().rpc('create_friend_challenge', {
      _metric: input.metric,
      _goal: input.goal,
      _duration_days: input.durationDays,
      _invitee_ids: Array.from(new Set(input.inviteeIds)),
    });
    if (error) {
      return failed(error);
    }
    return parseCreateChallenge(data);
  },
  // Idempotent on the server (COALESCE): calling it twice never fails.
  async markChallengeCelebrated(challengeId) {
    const { error } = await client().rpc('mark_challenge_celebrated', {
      _challenge_id: challengeId,
    });
    if (error) {
      return failed(error);
    }
  },

  // ── Notificaciones y moderación (W6 y W7) ───────────────────────────────
  // Newest first, paged by created_at. Unknown types are dropped when parsing.
  async getNotifications(cursor, limit): Promise<NotificationPage> {
    const me = await currentUserId();
    let query = client()
      .from('social_notifications')
      .select('*')
      .eq('recipient_id', me)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (cursor) {
      query = query.lt('created_at', cursor);
    }
    const { data, error } = await query;
    if (error) {
      return failed(error);
    }
    const profiles = await fetchProfiles(notificationActorIds(data)).catch(
      () => new Map<string, SocialProfileRow>(),
    );
    // A friend request comes from someone who is not a friend yet (DA-119:
    // no real photo for them).
    const items = parseNotifications(data, profiles).map(item =>
      item.actor && item.type === 'friend_request'
        ? { ...item, actor: withPhotoPolicy(item.actor, 'none') }
        : item,
    );
    await prefetchProfilePhotoUris(items.map(item => item.actor?.profile_photo_url)).catch(
      () => undefined,
    );
    return { items, nextCursor: nextNotificationCursor(data, limit) };
  },
  async getUnreadNotifications() {
    const me = await currentUserId();
    const { count, error } = await client()
      .from('social_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', me)
      .is('read_at', null);
    if (error) {
      return failed(error);
    }
    return count ?? 0;
  },
  // UPDATE read_at = now() for my unread rows (RLS only lets me write mine).
  async markNotificationsRead(ids) {
    if (ids.length === 0) {
      return;
    }
    const me = await currentUserId();
    const { error } = await client()
      .from('social_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', me)
      .is('read_at', null)
      .in('id', ids);
    if (error) {
      return failed(error);
    }
  },
  async markAllNotificationsRead() {
    const me = await currentUserId();
    const { error } = await client()
      .from('social_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', me)
      .is('read_at', null);
    if (error) {
      return failed(error);
    }
  },
  async deleteNotifications(ids) {
    if (ids.length === 0) {
      return;
    }
    const me = await currentUserId();
    const { error } = await client()
      .from('social_notifications')
      .delete()
      .eq('recipient_id', me)
      .in('id', ids);
    if (error) {
      return failed(error);
    }
  },
  // The panel exists for moderators only. The role comes from my own row of
  // app_moderators; if that cannot be read, is_moderator() answers yes / no.
  // The real security is on the server (RLS and moderate_content).
  async getModeratorRole() {
    const me = await currentUserId();
    const supabase = client();
    const row = await supabase
      .from('app_moderators')
      .select('role')
      .eq('user_id', me)
      .maybeSingle();
    if (!row.error) {
      return parseModeratorRole(row.data?.role);
    }
    const check = await supabase.rpc('is_moderator');
    if (check.error) {
      return failed(check.error);
    }
    return check.data === true ? 'moderator' : null;
  },
  // The view already comes ordered; a non-moderator gets no rows.
  async getModerationQueue() {
    const { data, error } = await client().from('moderation_queue').select('*');
    if (error) {
      return failed(error);
    }
    const rows = openQueue(data ?? []);
    await prefetchSocialPhotoUrls(rows.map(row => row.photo_path)).catch(() => undefined);
    return rows;
  },
  async getModerationHistory() {
    const { data, error } = await client()
      .from('moderation_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      return failed(error);
    }
    return data ?? [];
  },
  // restore / remove for a post or comment, dismiss for a user. The server
  // checks is_moderator() and the action; its refusals become ModerationError.
  async moderateContent(target, targetId, action, note) {
    if (!isValidAction(target, action)) {
      throw new ModerationError('invalid_action');
    }
    const { data, error } = await client().rpc('moderate_content', {
      _target_type: target,
      _target_id: targetId,
      _action: action,
      ...(note ? { _note: note } : {}),
    });
    const failure = moderationFailure(data, error);
    if (failure) {
      throw new ModerationError(failure);
    }
  },
};
