import type {
  CreateInviteResult,
  ProfileLookup,
  SocialService,
} from '@app/services/social/socialService';
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

// Supabase implementation of `SocialService` · W1 (personas: lectura, nombre de
// usuario y privacidad) and W2 (escrituras de personas). Only these methods
// talk to the backend; everything else is not connected yet (W3 to W7) and answers with an empty value (reads)
// or rejects (writes), so the real app never mixes in sample data.
// TODO(social-wire): W3 feed and posts, W4 compose, W5 challenges,
// W6 notifications, W7 moderation.

// BT-43 (placeholder): local acceptance of the Terms before the first post.
const TERMS_KEY = '@athelete/social-terms-accepted';

export class SocialNotWiredError extends Error {
  constructor(method: string) {
    super(`Comunidad: ${method} todavía no está conectado`);
    this.name = 'SocialNotWiredError';
  }
}

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

const unwired = (method: string) => (): Promise<never> =>
  Promise.reject(new SocialNotWiredError(method));

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

  // The photo goes up first ({uid}/{uuid}/photo.jpg in social-photos), then
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
      const path = `${me}/${createUuid()}/photo.jpg`;
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

  // ── Retos, notificaciones y moderación (W5 a W7) ────────────────────────
  async getMyChallenges() {
    return { active: [], invitations: [], recently_completed: [], official: null };
  },
  async getChallengeBoard() {
    return null;
  },
  respondChallengeInvite: unwired('respondChallengeInvite'),
  joinOfficialChallenge: unwired('joinOfficialChallenge'),
  leaveChallenge: unwired('leaveChallenge'),
  cancelFriendChallenge: unwired('cancelFriendChallenge'),
  addManualContribution: unwired('addManualContribution'),
  createFriendChallenge: unwired('createFriendChallenge'),
  markChallengeCelebrated: unwired('markChallengeCelebrated'),
  async getNotifications() {
    return [];
  },
  markNotificationsRead: unwired('markNotificationsRead'),
  async getModeratorRole() {
    return null;
  },
  async getModerationQueue() {
    return [];
  },
  async getModerationHistory() {
    return [];
  },
  moderateContent: unwired('moderateContent'),
};
