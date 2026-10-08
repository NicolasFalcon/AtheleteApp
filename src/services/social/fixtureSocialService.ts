import type { ImageSourcePropType } from 'react-native';
import {
  buildFixtureState,
  type FixtureState,
  type SocialScenario,
} from '@app/dev/socialFixtures';
import {
  activeInviteCount,
  inviteUrl,
  MAX_ACTIVE_INVITES,
  normalizeUsername,
  validateUsername,
} from '@app/features/social/socialModel';
import { challengeTitle, challengeViewState, validateManualAmount } from '@app/features/social/challengeModel';
import type {
  BoardEntry,
  ChallengeBoard,
  ChallengeSummary,
  CreateChallengeInput,
  CreateChallengeResult,
  ManualContributionResult,
  MyChallenges,
} from '@app/features/social/challengeTypes';
import type { FixtureChallenge } from '@app/dev/socialChallengeFixtures';
import type {
  ModerationAction,
  ModerationActionRow,
  ModerationQueueRow,
  ModerationTarget,
  ModeratorRole,
} from '@app/features/social/moderationModel';
import { allowedActions } from '@app/features/social/moderationModel';
import type { AttachmentFocus } from '@app/services/social/attachmentSources';
import type { SocialNotification } from '@app/features/social/notificationModel';
import { validatePost } from '@app/features/social/postModel';
import type {
  ActivityItem,
  CreatePostInput,
  CreatePostResult,
  FeedComment,
  FeedPage,
  FeedPost,
  ReportReason,
  ReportTarget,
  ToggleLikeResult,
} from '@app/features/social/postTypes';
import type {
  BlockedEntry,
  FindUserResult,
  FriendEntry,
  FriendInviteRow,
  FriendsOverview,
  Relationship,
  RelationshipState,
  SendFriendRequestStatus,
  SetUsernameResult,
  SocialProfileDetail,
  SocialProfileRow,
  SocialSettingsPatch,
  SocialSettingsRow,
} from '@app/features/social/socialTypes';
import type {
  CreateInviteResult,
  ProfileLookup,
  SocialService,
} from '@app/services/social/socialService';

// In-memory implementation of `SocialService` over the fixtures. Actions
// change the local state and notify the screens; nothing leaves the device.
// Dev only: the real app uses `supabaseSocialService` (see `socialSource.ts`).
// TODO(social-wire): delete this file once every wave (W2 to W7) is connected.

let state: FixtureState = buildFixtureState('default');
// Set by the dev screens (reset); the real app never reads fixtures.
let active = false;
let version = 0;
let resetVersion = 0;
let sequence = 0;
const listeners = new Set<() => void>();

function commit(next: FixtureState) {
  state = next;
  version += 1;
  listeners.forEach(listener => listener());
}

export const socialFixtureStore = {
  getVersion: () => version,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  // Dev only: bumps when a scenario is loaded, so mounted lists reload.
  getResetVersion: () => resetVersion,
  isActive: () => active,
  reset(scenario: SocialScenario = 'default') {
    active = true;
    resetVersion += 1;
    commit(buildFixtureState(scenario));
  },
  clearFeedFailure() {
    if (state.feedFailure) {
      commit({ ...state, feedFailure: null });
    }
  },
  // "Reintentar" on an error state: the next load succeeds.
  clearFailure() {
    if (
      state.failure ||
      state.challengesFailure ||
      state.notificationsFailure ||
      state.moderationFailure
    ) {
      commit({
        ...state,
        failure: null,
        challengesFailure: null,
        notificationsFailure: null,
        moderationFailure: null,
      });
    }
  },
  getState: () => state,
};

// A "loading" scenario never resolves; an "error" scenario rejects.
async function ready(): Promise<void> {
  if (state.failure === 'loading') {
    await new Promise<void>(() => {});
  }
  if (state.failure === 'error') {
    throw new Error('Sin conexión (datos de ejemplo)');
  }
  await Promise.resolve();
}

// The feed has its own failure (the rest of the hub keeps working).
async function feedReady(isMore: boolean): Promise<void> {
  await ready();
  if (state.feedFailure === 'loading') {
    await new Promise<void>(() => {});
  }
  if (
    state.feedFailure === 'error' ||
    (state.feedFailure === 'moreError' && isMore)
  ) {
    throw new Error('Sin conexión (datos de ejemplo)');
  }
}

// Sections with their own failure (the rest of the hub keeps working).
async function sectionReady(
  key: 'challengesFailure' | 'notificationsFailure' | 'moderationFailure',
): Promise<void> {
  await ready();
  if (state[key] === 'loading') {
    await new Promise<void>(() => {});
  }
  if (state[key] === 'error') {
    throw new Error('Sin conexión (datos de ejemplo)');
  }
}

function personProfile(who: string): SocialProfileRow | null {
  return who === 'me' ? state.meProfile : state.people[who]?.profile ?? null;
}

function relationOfWho(who: string): RelationshipState {
  if (who === 'me') {
    return 'self';
  }
  return state.relations[state.people[who]?.profile.id ?? ''] ?? 'none';
}

function summaryOf(item: FixtureChallenge): ChallengeSummary {
  const leader = [...item.participants]
    .filter(entry => entry.who !== 'me')
    .sort((a, b) => b.progress - a.progress)[0];
  return {
    challenge: item.head,
    mine: item.mine,
    people: item.participants.map(entry => ({
      profile: personProfile(entry.who),
      isMe: entry.who === 'me',
    })),
    inviter: item.inviter ? personProfile(item.inviter) : null,
    participants_total: item.participantsTotal,
    leader: leader
      ? { profile: personProfile(leader.who), progress: leader.progress }
      : null,
  };
}

function patchChallenge(id: string, patch: (item: FixtureChallenge) => FixtureChallenge): FixtureState {
  return {
    ...state,
    challenges: state.challenges.map(item => (item.head.id === id ? patch(item) : item)),
  };
}

const PHOTO_ASSETS: Record<string, ImageSourcePropType> = {
  'fx://barra-mujer': require('@app/assets/v2/photos/barra-mujer.jpg'),
  'fx://hero-entreno': require('@app/assets/v2/photos/hero-entreno.jpg'),
  'fx://overhead': require('@app/assets/v2/photos/overhead.jpg'),
};

// A post as the viewer gets it: what they reported does not come back.
function isListed(item: { id: string }): boolean {
  return !state.reportedIds.includes(item.id);
}

function replacePost(id: string, patch: Partial<FeedPost>): FixtureState {
  return {
    ...state,
    posts: state.posts.map(post => (post.id === id ? { ...post, ...patch } : post)),
  };
}

function relationOf(id: string): RelationshipState {
  return state.relations[id] ?? 'none';
}

function setRelation(id: string, relation: RelationshipState): FixtureState {
  return { ...state, relations: { ...state.relations, [id]: relation } };
}

function profileOf(id: string): SocialProfileRow | null {
  const found = Object.values(state.people).find(
    item => item.profile.id === id,
  );
  return found ? found.profile : null;
}

// What the viewer may see (get_social_profile): friends get everything their
// owner shares; others only streak and, with a public audience, the activity.
function visibleDetail(id: string): SocialProfileDetail | null {
  const found = Object.values(state.people).find(
    item => item.profile.id === id,
  );
  if (!found) {
    return null;
  }
  const relation = relationOf(id);
  const detail = found.detail;
  const relationship: Relationship =
    relation === 'blocked' ? 'none' : (relation as Relationship);

  if (relation === 'friends') {
    return { ...detail, relationship };
  }
  const base: SocialProfileDetail = {
    relationship,
    streak_days: detail.streak_days,
    hidden_categories: detail.hidden_categories,
  };
  if (found.audience === 'public' && relation !== 'blocked') {
    return {
      ...base,
      sessions_total: detail.sessions_total,
      badges_total: detail.badges_total,
      records: detail.records,
      recent_posts: detail.recent_posts,
    };
  }
  return base;
}

function pendingRequest(id: string) {
  return (
    state.requests.find(
      item =>
        item.status === 'pending' &&
        (item.sender_id === id || item.receiver_id === id),
    ) ?? null
  );
}

export const fixtureSocialService: SocialService = {
  async getSettings() {
    await ready();
    return state.settings;
  },

  async setUsername(username): Promise<SetUsernameResult> {
    await ready();
    const check = validateUsername(username);
    if (!check.ok) {
      return { ok: false, error: 'invalid_username' };
    }
    const own = state.settings?.username;
    if (check.value !== own && state.takenUsernames.includes(check.value)) {
      return { ok: false, error: 'username_taken' };
    }
    const now = new Date().toISOString();
    const settings: SocialSettingsRow = state.settings
      ? { ...state.settings, username: check.value, updated_at: now }
      : {
          user_id: state.me.id,
          username: check.value,
          audience: 'friends',
          share_workouts: true,
          share_records: true,
          share_achievements: true,
          share_photos: true,
          share_routines: true,
          share_body_weight: false,
          allow_friend_requests: true,
          created_at: now,
          updated_at: now,
        };
    commit({ ...state, settings });
    return { ok: true, username: check.value };
  },

  async updateSettings(patch: SocialSettingsPatch) {
    await ready();
    if (!state.settings) {
      throw new Error('Sin configuración social');
    }
    const settings = {
      ...state.settings,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    commit({ ...state, settings });
    return settings;
  },

  async getFriendsOverview(): Promise<FriendsOverview> {
    await ready();
    const friends: FriendEntry[] = [];
    Object.entries(state.relations).forEach(([id, relation]) => {
      const profile = relation === 'friends' ? profileOf(id) : null;
      if (profile) {
        friends.push({
          profile,
          friendsSince: state.friendsSince[id] ?? new Date().toISOString(),
          lastActivity: state.activities[id] ?? null,
        });
      }
    });
    friends.sort((a, b) =>
      (b.lastActivity?.created_at ?? '').localeCompare(
        a.lastActivity?.created_at ?? '',
      ),
    );
    const received = state.requests
      .filter(item => item.status === 'pending' && item.receiver_id === state.me.id)
      .map(request => ({ request, profile: profileOf(request.sender_id) }))
      .filter(
        (entry): entry is { request: typeof entry.request; profile: SocialProfileRow } =>
          entry.profile !== null,
      );
    const sent = state.requests
      .filter(item => item.status === 'pending' && item.sender_id === state.me.id)
      .map(request => ({ request, profile: profileOf(request.receiver_id) }))
      .filter(
        (entry): entry is { request: typeof entry.request; profile: SocialProfileRow } =>
          entry.profile !== null,
      );

    return {
      friends,
      received,
      sent,
      activeChallenges: state.activeChallenges,
      pendingInvitations: state.pendingInvitations,
    };
  },

  async findByUsername(username): Promise<FindUserResult | null> {
    await ready();
    const value = normalizeUsername(username);
    if (value === state.settings?.username) {
      return {
        user_id: state.me.id,
        username: value,
        name: state.me.name,
        avatar_key: null,
        accepts_requests: false,
        relationship: 'self',
      };
    }
    const found = Object.values(state.people).find(
      item => item.profile.username === value,
    );
    // A block hides the person (and their search) in both directions.
    if (!found || relationOf(found.profile.id) === 'blocked') {
      return null;
    }
    return {
      user_id: found.profile.id,
      username: found.profile.username,
      name: found.profile.name,
      avatar_key: found.profile.avatar_key,
      accepts_requests: found.acceptsRequests,
      relationship: relationOf(found.profile.id) as Relationship,
    };
  },

  async getProfile(userId): Promise<ProfileLookup> {
    await ready();
    const found = Object.values(state.people).find(
      item => item.profile.id === userId,
    );
    return {
      profile: found ? found.profile : null,
      detail: visibleDetail(userId),
      acceptsRequests: found ? found.acceptsRequests : false,
      blocked: relationOf(userId) === 'blocked',
      requestId: pendingRequest(userId)?.id ?? null,
    };
  },

  async sendFriendRequest(target): Promise<SendFriendRequestStatus> {
    await ready();
    const found = Object.values(state.people).find(
      item => item.profile.id === target,
    );
    const relation = relationOf(target);
    if (!found || relation === 'blocked' || relation === 'self') {
      return 'unavailable';
    }
    if (relation === 'friends') {
      return 'already_friends';
    }
    if (relation === 'request_sent') {
      return 'pending';
    }
    if (relation === 'request_received') {
      const request = pendingRequest(target);
      commit({
        ...setRelation(target, 'friends'),
        requests: state.requests.filter(item => item !== request),
        friendsSince: { ...state.friendsSince, [target]: new Date().toISOString() },
      });
      return 'accepted';
    }
    if (!found.acceptsRequests) {
      return 'not_accepting';
    }
    commit({
      ...setRelation(target, 'request_sent'),
      requests: [
        ...state.requests,
        {
          id: `fx-req-${target}`,
          sender_id: state.me.id,
          receiver_id: target,
          status: 'pending',
          created_at: new Date().toISOString(),
          responded_at: null,
        },
      ],
    });
    return 'sent';
  },

  async respondFriendRequest(requestId, accept) {
    await ready();
    const request = state.requests.find(item => item.id === requestId);
    if (!request) {
      return 'not_found';
    }
    const other = request.sender_id;
    const requests = state.requests.filter(item => item.id !== requestId);
    if (accept) {
      commit({
        ...setRelation(other, 'friends'),
        requests,
        friendsSince: { ...state.friendsSince, [other]: new Date().toISOString() },
      });
      return 'accepted';
    }
    commit({ ...setRelation(other, 'none'), requests });
    return 'declined';
  },

  async cancelFriendRequest(requestId) {
    await ready();
    const request = state.requests.find(item => item.id === requestId);
    if (!request) {
      return;
    }
    commit({
      ...setRelation(request.receiver_id, 'none'),
      requests: state.requests.filter(item => item.id !== requestId),
    });
  },

  async removeFriend(friendId) {
    await ready();
    if (relationOf(friendId) !== 'friends') {
      return false;
    }
    const friendsSince = { ...state.friendsSince };
    delete friendsSince[friendId];
    commit({ ...setRelation(friendId, 'none'), friendsSince });
    return true;
  },

  async blockUser(target) {
    await ready();
    const friendsSince = { ...state.friendsSince };
    delete friendsSince[target];
    commit({
      ...setRelation(target, 'blocked'),
      requests: state.requests.filter(
        item => item.sender_id !== target && item.receiver_id !== target,
      ),
      friendsSince,
      blocks: [
        ...state.blocks.filter(item => item.blocked_id !== target),
        {
          blocker_id: state.me.id,
          blocked_id: target,
          created_at: new Date().toISOString(),
        },
      ],
    });
  },

  async unblockUser(target) {
    await ready();
    commit({
      ...setRelation(target, 'none'),
      blocks: state.blocks.filter(item => item.blocked_id !== target),
    });
  },

  async getBlocked(): Promise<BlockedEntry[]> {
    await ready();
    return state.blocks.map(block => ({
      block,
      profile: profileOf(block.blocked_id),
    }));
  },

  async createInvite(): Promise<CreateInviteResult> {
    await ready();
    if (activeInviteCount(state.invites) >= MAX_ACTIVE_INVITES) {
      return { ok: false, error: 'limit' };
    }
    const now = Date.now();
    const token = `fxNew${now.toString(36)}AbCdEfGhIjKlMn`.slice(0, 22);
    const invite: FriendInviteRow = {
      id: `fx-invite-${now}`,
      inviter_id: state.me.id,
      token,
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + 7 * 86_400_000).toISOString(),
      used_at: null,
      used_by: null,
      revoked_at: null,
    };
    commit({ ...state, invites: [invite, ...state.invites] });
    return { ok: true, link: { invite, url: inviteUrl(token) } };
  },

  async getInvites() {
    await ready();
    return state.invites;
  },

  async revokeInvite(inviteId) {
    await ready();
    const invite = state.invites.find(item => item.id === inviteId);
    if (!invite || invite.used_at !== null || invite.revoked_at !== null) {
      return false;
    }
    commit({
      ...state,
      invites: state.invites.map(item =>
        item.id === inviteId
          ? { ...item, revoked_at: new Date().toISOString() }
          : item,
      ),
    });
    return true;
  },

  async getFeed(cursor, limit): Promise<FeedPage> {
    await feedReady(cursor !== null);
    const blocked = (post: FeedPost) => state.relations[post.author_id] === 'blocked';
    const all = state.posts
      .filter(post => isListed(post) && !blocked(post) && post.deleted_at === null)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const older = cursor ? all.filter(post => post.created_at < cursor) : all;
    const posts = older.slice(0, limit);
    return {
      posts,
      nextCursor: posts.length >= limit ? posts[posts.length - 1].created_at : null,
    };
  },

  async getFriendActivity(limit): Promise<ActivityItem[]> {
    await feedReady(false);
    return state.activityItems
      .filter(item => state.relations[item.user_id] !== 'blocked')
      .slice(0, limit);
  },

  async getPost(postId) {
    await ready();
    const post = state.posts.find(item => item.id === postId);
    return post && isListed(post) && post.deleted_at === null ? post : null;
  },

  async toggleLike(postId, like): Promise<ToggleLikeResult> {
    await ready();
    const post = state.posts.find(item => item.id === postId);
    if (!post) {
      throw new Error('post');
    }
    const count = Math.max(0, post.like_count + (like === post.liked_by_me ? 0 : like ? 1 : -1));
    commit(replacePost(postId, { liked_by_me: like, like_count: count }));
    return { liked: like, count };
  },

  async getComments(postId): Promise<FeedComment[]> {
    await ready();
    return state.comments
      .filter(item => item.post_id === postId && isListed(item) && item.deleted_at === null)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async addComment(postId, body): Promise<FeedComment> {
    await ready();
    const comment: FeedComment = {
      id: `fx-c-${Date.now()}`,
      post_id: postId,
      author_id: state.me.id,
      body,
      created_at: new Date().toISOString(),
      deleted_at: null,
      hidden_at: null,
      removed_at: null,
      author: state.meProfile,
      relationship: 'self',
    };
    const post = state.posts.find(item => item.id === postId);
    commit({
      ...state,
      comments: [...state.comments, comment],
      posts: state.posts.map(item =>
        item.id === postId
          ? { ...item, comment_count: (post?.comment_count ?? 0) + 1 }
          : item,
      ),
    });
    return comment;
  },

  async deleteComment(commentId) {
    await ready();
    const target = state.comments.find(item => item.id === commentId);
    commit({
      ...state,
      comments: state.comments.map(item =>
        item.id === commentId ? { ...item, deleted_at: new Date().toISOString() } : item,
      ),
      posts: state.posts.map(item =>
        item.id === target?.post_id
          ? { ...item, comment_count: Math.max(0, item.comment_count - 1) }
          : item,
      ),
    });
  },

  async editPost(postId, body) {
    await ready();
    const post = state.posts.find(item => item.id === postId && item.author_id === state.me.id);
    if (!post) {
      throw new Error('post');
    }
    commit(replacePost(postId, { body: body.trim() || null, edited_at: new Date().toISOString() }));
  },

  async deletePost(postId) {
    await ready();
    commit(replacePost(postId, { deleted_at: new Date().toISOString() }));
  },

  async getAttachmentSources(_focus?: AttachmentFocus) {
    await ready();
    const settings = state.settings;
    return state.sources.map(source => ({
      ...source,
      blockedByPrivacy:
        (source.kind === 'workout' && settings?.share_workouts === false) ||
        (source.kind === 'record' && settings?.share_records === false) ||
        (source.kind === 'achievement' && settings?.share_achievements === false) ||
        (source.kind === 'routine' && settings?.share_routines === false),
    }));
  },

  async createPost(input: CreatePostInput): Promise<CreatePostResult> {
    await ready();
    const source = state.sources.find(item => item.sourceId === input.sourceId);
    const check = validatePost({
      body: input.body,
      attachment: source?.kind ?? null,
      photo: input.photo ?? null,
      termsAccepted: state.termsAccepted,
    });
    if (!check.ok) {
      return { ok: false, error: 'validation' };
    }
    if (source?.blockedByPrivacy) {
      return { ok: false, error: 'category_not_shared' };
    }
    const id = `fx-new-${Date.now()}`;
    const post: FeedPost = {
      id,
      author_id: state.me.id,
      type: check.type,
      body: check.body || null,
      audience: state.settings?.audience ?? 'friends',
      photo_path: input.photo ? `fx://${input.photo.key}` : null,
      photo_width: input.photo?.width ?? null,
      photo_height: input.photo?.height ?? null,
      like_count: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      hidden_at: null,
      removed_at: null,
      attachment: source ? fixtureAttachment(source) : null,
      liked_by_me: false,
      author: state.meProfile,
      relationship: 'self',
    };
    commit({ ...state, posts: [post, ...state.posts] });
    return { ok: true, postId: id, created: true };
  },

  async getPostPhotoSource(path) {
    return PHOTO_ASSETS[path] ?? null;
  },

  async reportContent(_target: ReportTarget, targetId: string, _reason: ReportReason) {
    await ready();
    // The reporter stops seeing it right away (can_view_post).
    commit({ ...state, reportedIds: [...state.reportedIds, targetId] });
  },

  async saveSharedRoutine(postId) {
    await ready();
    const created = !state.savedRoutines.includes(postId);
    commit({
      ...state,
      savedRoutines: created ? [...state.savedRoutines, postId] : state.savedRoutines,
    });
    return { templateId: `fx-template-${postId}`, created };
  },

  async getTermsAccepted() {
    return state.termsAccepted;
  },

  async getMyChallenges(): Promise<MyChallenges> {
    await sectionReady('challengesFailure');
    const now = new Date();
    const result: MyChallenges = { active: [], invitations: [], recently_completed: [], official: null };
    state.challenges.forEach(item => {
      const summary = summaryOf(item);
      if (item.head.kind === 'official') {
        result.official = summary;
        return;
      }
      const view = challengeViewState(item.head, item.mine, now);
      if (view === 'invited') {
        result.invitations.push(summary);
      } else if (view === 'completed') {
        result.recently_completed.push(summary);
      } else if (view === 'active' || view === 'waiting' || view === 'expired') {
        result.active.push(summary);
      }
    });
    return result;
  },

  async getChallengeBoard(challengeId): Promise<ChallengeBoard | null> {
    await sectionReady('challengesFailure');
    const item = state.challenges.find(entry => entry.head.id === challengeId);
    if (!item) {
      return null;
    }
    const now = Date.now();
    const board: BoardEntry[] = item.participants
      .filter(entry => entry.who === 'me' || state.relations[state.people[entry.who]?.profile.id] === 'friends')
      .map(entry => ({
        user_id: personProfile(entry.who)?.id ?? entry.who,
        profile: personProfile(entry.who),
        progress: entry.progress,
        status: entry.status,
        completed_at: entry.completedAgo ? new Date(now - entry.completedAgo).toISOString() : null,
        isMe: entry.who === 'me',
        relationship: relationOfWho(entry.who),
      }));
    return {
      challenge: item.head,
      mine: summaryOf(item).mine,
      participants_total: item.participantsTotal,
      board,
      week: item.week,
      manualToday: item.manualToday,
      activity: item.activity.map((entry, index) => ({
        id: `${item.head.id}-act-${index}`,
        profile: personProfile(entry.who),
        isMe: entry.who === 'me',
        text: entry.text,
        created_at: new Date(now - entry.ago).toISOString(),
      })),
      inviter: item.inviter ? personProfile(item.inviter) : null,
    };
  },

  async respondChallengeInvite(challengeId, accept) {
    await sectionReady('challengesFailure');
    const startsAt = new Date();
    commit(
      patchChallenge(challengeId, item => ({
        ...item,
        head: accept
          ? {
              ...item.head,
              status: 'active',
              starts_at: startsAt.toISOString(),
              ends_at: new Date(startsAt.getTime() + item.head.duration_days * 86_400_000).toISOString(),
            }
          : item.head,
        mine: item.mine ? { ...item.mine, status: accept ? 'active' : 'declined' } : item.mine,
        participants: item.participants.map(entry =>
          entry.who === 'me' ? { ...entry, status: accept ? 'active' : 'declined' } : entry,
        ),
      })),
    );
  },

  async joinOfficialChallenge(challengeId) {
    await sectionReady('challengesFailure');
    commit(
      patchChallenge(challengeId, item => ({
        ...item,
        mine: { status: 'active', progress: 0, invited_by: null, final_rank_among_friends: null, celebrated_at: null },
        participants: item.participants.map(entry => (entry.who === 'me' ? { ...entry, progress: 0 } : entry)),
      })),
    );
  },

  async leaveChallenge(challengeId) {
    await sectionReady('challengesFailure');
    commit(
      patchChallenge(challengeId, item => ({
        ...item,
        mine: item.mine ? { ...item.mine, status: 'left' } : item.mine,
        participants: item.participants.filter(entry => entry.who !== 'me'),
      })),
    );
  },

  async cancelFriendChallenge(challengeId) {
    await sectionReady('challengesFailure');
    commit(patchChallenge(challengeId, item => ({ ...item, head: { ...item.head, status: 'cancelled' } })));
  },

  async addManualContribution(challengeId, amount): Promise<ManualContributionResult> {
    await sectionReady('challengesFailure');
    const item = state.challenges.find(entry => entry.head.id === challengeId);
    if (!item || !item.mine || !item.head.allow_manual) {
      return { ok: false, error: 'not_allowed' };
    }
    const check = validateManualAmount(amount, item.manualToday);
    if (!check.ok) {
      return check;
    }
    const progress = Math.min(item.head.goal, item.mine.progress + amount);
    const done = progress >= item.head.goal;
    commit(
      patchChallenge(challengeId, current => ({
        ...current,
        manualToday: current.manualToday + amount,
        mine: current.mine ? { ...current.mine, progress, status: done ? 'completed' : current.mine.status, final_rank_among_friends: done ? 1 : null } : current.mine,
        week: current.week ? current.week.map((value, index) => (index === 4 ? (value ?? 0) + amount : value)) : current.week,
        participants: current.participants.map(entry =>
          entry.who === 'me' ? { ...entry, progress, status: done ? 'completed' : entry.status } : entry,
        ),
      })),
    );
    return { ok: true, progress };
  },

  async createFriendChallenge(input: CreateChallengeInput): Promise<CreateChallengeResult> {
    await sectionReady('challengesFailure');
    const friends = Object.entries(state.relations)
      .filter(([, relation]) => relation === 'friends')
      .map(([id]) => id);
    if (input.inviteeIds.length === 0 || input.inviteeIds.some(id => !friends.includes(id))) {
      return { ok: false, error: 'not_friends' };
    }
    sequence += 1;
    const id = `fx-ch-new-${sequence}`;
    const title = challengeTitle(input.metric, input.goal, input.durationDays);
    const now = Date.now();
    const created: FixtureChallenge = {
      head: {
        id, kind: 'friends', metric: input.metric, status: 'pending', title,
        goal: input.goal, duration_days: input.durationDays, starts_at: null, ends_at: null,
        invite_expires_at: new Date(now + 7 * 86_400_000).toISOString(),
        points: 0, badge_id: null, allow_manual: false, creator_id: state.me.id,
      },
      mine: { status: 'active', progress: 0, invited_by: null, final_rank_among_friends: null, celebrated_at: null },
      participants: [
        { who: 'me', progress: 0, status: 'active' },
        ...input.inviteeIds.flatMap(inviteeId => {
          const key = Object.keys(state.people).find(person => state.people[person].profile.id === inviteeId);
          return key ? [{ who: key, progress: 0, status: 'invited' as const }] : [];
        }),
      ],
      activity: [],
      inviter: null, manualToday: 0, week: null, participantsTotal: null,
    };
    commit({ ...state, challenges: [...state.challenges, created] });
    return { ok: true, challengeId: id, title };
  },

  async markChallengeCelebrated(challengeId) {
    await ready();
    commit(
      patchChallenge(challengeId, item => ({
        ...item,
        mine: item.mine ? { ...item.mine, celebrated_at: new Date().toISOString() } : item.mine,
      })),
    );
  },

  async getNotifications(): Promise<SocialNotification[]> {
    await sectionReady('notificationsFailure');
    return [...state.notifications].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async markNotificationsRead(ids) {
    await ready();
    const when = new Date().toISOString();
    commit({
      ...state,
      notifications: state.notifications.map(item =>
        ids.includes(item.id) && item.read_at === null ? { ...item, read_at: when } : item,
      ),
    });
  },

  async getModeratorRole(): Promise<ModeratorRole | null> {
    await ready();
    return state.moderatorRole;
  },

  async getModerationQueue(): Promise<ModerationQueueRow[]> {
    await sectionReady('moderationFailure');
    // RLS: a non-moderator gets no rows.
    return state.moderatorRole ? state.moderationQueue : [];
  },

  async getModerationHistory(): Promise<ModerationActionRow[]> {
    await sectionReady('moderationFailure');
    return state.moderatorRole ? state.moderationHistory : [];
  },

  async moderateContent(target: ModerationTarget, targetId: string, action: ModerationAction, note: string | null) {
    await sectionReady('moderationFailure');
    const item = state.moderationQueue.find(row => row.target_id === targetId);
    // moderate_content checks is_moderator() and what the content allows.
    if (!item || !allowedActions(item, state.moderatorRole).includes(action)) {
      throw new Error('not_allowed');
    }
    const now = new Date().toISOString();
    const entry: ModerationActionRow = {
      id: `fx-h-${Date.now()}`,
      moderator_id: 'fx-mod',
      target_type: target,
      target_id: targetId,
      action,
      note,
      created_at: now,
    };
    commit({
      ...state,
      moderationQueue: state.moderationQueue.filter(row => row.target_id !== targetId),
      moderationHistory: [entry, ...state.moderationHistory],
    });
  },

  async acceptTerms() {
    commit({ ...state, termsAccepted: true });
  },
};

// Snapshot of what the composer attached (the server builds the real one).
function fixtureAttachment(source: {
  kind: string;
  title: string;
  stats: { value: string; label: string }[];
  record?: { exercise: string; value: number; unit: string } | null;
}): FeedPost['attachment'] {
  const num = (text: string) => Number(text.replace(/[^\d]/g, '')) || 0;
  switch (source.kind) {
    case 'workout':
      return {
        title: source.title,
        duration_min: num(source.stats[0].value),
        exercises_done: num(source.stats[1].value.split(' ')[0]),
        exercises_total: num(source.stats[1].value.split(' ').pop() ?? ''),
        volume_kg: num(source.stats[2].value) || null,
        prs_count: source.record ? 1 : 0,
        top_pr: source.record
          ? {
              exercise: source.record.exercise,
              exercise_id: 'fx',
              pr_type: 'weight',
              value_weight: source.record.value,
              value_reps: null,
              unit: source.record.unit,
            }
          : null,
      };
    case 'record':
      return {
        exercise_id: 'fx',
        exercise_name: source.title,
        pr_type: 'weight',
        value: num(source.stats[0].value),
        unit: 'kg',
        delta: null,
        previous_best: null,
      };
    case 'routine':
      return {
        title: source.title,
        difficulty: source.stats[2].value,
        duration_min: num(source.stats[0].value),
        type: 'strength',
        exercises: [],
      };
    case 'challenge':
      return {
        title: source.title,
        metric: 'workouts',
        goal: 4,
        final_value: 3,
        rank_among_friends: null,
        points: 0,
      };
    default:
      return { title: source.title };
  }
}

