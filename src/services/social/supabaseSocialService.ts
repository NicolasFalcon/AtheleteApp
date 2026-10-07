import type {
  CreateInviteResult,
  ProfileLookup,
  SocialService,
} from '@app/services/social/socialService';
import {
  buildBlocked,
  buildFriendsOverview,
  interpretUsernameRpc,
  overviewPersonIds,
  parseChallengeCounts,
  parseFindUser,
  parseFriendActivity,
  parseProfileDetail,
  profileMap,
  toSetUsernameResult,
  usernameErrorFromPostgres,
} from '@app/features/social/socialMappers';
import {
  normalizeUsername,
  validateUsername,
} from '@app/features/social/socialModel';
import type {
  BlockedEntry,
  FindUserResult,
  FriendsOverview,
  SetUsernameResult,
  SocialProfileRow,
  SocialSettingsPatch,
  SocialSettingsRow,
} from '@app/features/social/socialTypes';
import { getSupabaseClient } from '@app/services/supabase/client';

// Supabase implementation of `SocialService` · W1 (personas: lectura, nombre de
// usuario y privacidad). Only the W1 methods talk to the backend; everything
// else is not connected yet (W2 to W6) and answers with an empty value (reads)
// or rejects (writes), so the real app never mixes in sample data.
// TODO(social-wire): W2 writes of friends/blocks/invites, W3 feed and posts,
// W4 compose, W5 challenges, W6 notifications, W7 moderation.

export class SocialNotWiredError extends Error {
  constructor(method: string) {
    super(`Comunidad: ${method} todavía no está conectado`);
    this.name = 'SocialNotWiredError';
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

    return buildFriendsOverview({
      me,
      friendships: friendships.data,
      requests: requests.data,
      profiles,
      activity: parseFriendActivity(activity),
      counts: parseChallengeCounts(challenges),
    });
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
    // An unreadable profile is "no disponible", not a failure: an error with a
    // database code (the RPC refused the profile) maps to null; only a failure
    // without one (network, session) is an error with retry.
    if (detailResult.error && !detailResult.error.code) {
      throw detailResult.error;
    }
    const detail = detailResult.error ? null : parseProfileDetail(detailResult.data);
    if (block.error) {
      throw block.error;
    }
    const profile = profiles.get(userId) ?? null;

    // accepts_requests is only exposed by the exact search.
    let acceptsRequests = true;
    if (profile?.username && detail?.relationship === 'none') {
      const found = await findUser(profile.username).catch(() => null);
      acceptsRequests = found?.accepts_requests ?? true;
    }

    return {
      profile,
      detail,
      acceptsRequests,
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

  // ── W2 · escrituras de amistad (todavía no conectadas) ──────────────────
  sendFriendRequest: unwired('sendFriendRequest'),
  respondFriendRequest: unwired('respondFriendRequest'),
  cancelFriendRequest: unwired('cancelFriendRequest'),
  blockUser: unwired('blockUser'),
  unblockUser: unwired('unblockUser'),
  createInvite: unwired('createInvite') as () => Promise<CreateInviteResult>,
  async getInvites() {
    return [];
  },

  // ── Contenido (W3, W4) ──────────────────────────────────────────────────
  async getFeed() {
    return { posts: [], nextCursor: null };
  },
  async getFriendActivity() {
    return [];
  },
  async getPost() {
    return null;
  },
  toggleLike: unwired('toggleLike'),
  async getComments() {
    return [];
  },
  addComment: unwired('addComment'),
  deleteComment: unwired('deleteComment'),
  deletePost: unwired('deletePost'),
  async getAttachmentSources() {
    return [];
  },
  createPost: unwired('createPost'),
  async getPostPhotoSource() {
    return null;
  },
  reportContent: unwired('reportContent'),
  saveSharedRoutine: unwired('saveSharedRoutine'),
  async getTermsAccepted() {
    return false;
  },
  acceptTerms: unwired('acceptTerms'),

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
