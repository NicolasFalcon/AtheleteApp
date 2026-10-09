import type { ImageSourcePropType } from 'react-native';
import type {
  ChallengeBoard,
  CreateChallengeInput,
  CreateChallengeResult,
  JoinOfficialResult,
  ManualContributionResult,
  MyChallenges,
  RespondInviteResult,
} from '@app/features/social/challengeTypes';
import type {
  ModerationAction,
  ModerationActionRow,
  ModerationQueueRow,
  ModerationTarget,
  ModeratorRole,
} from '@app/features/social/moderationModel';
import type { NotificationPage } from '@app/features/social/notificationModel';
import type { AttachmentFocus } from '@app/services/social/attachmentSources';
import type {
  ActivityItem,
  AttachmentSource,
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
  FriendInviteRow,
  FriendsOverview,
  InviteLink,
  SendFriendRequestStatus,
  SetUsernameResult,
  SocialProfileDetail,
  SocialProfileRow,
  SocialSettingsPatch,
  SocialSettingsRow,
} from '@app/features/social/socialTypes';

// Data layer of Comunidad. The screens only talk to this interface.
// The real app uses `supabaseSocialService` (W1 to W7 connected: privacy and
// people, feed and posts, publishing, challenges, notifications and
// moderation); in `__DEV__` the dev screens use `fixtureSocialService` (see
// `socialSource.ts`). Each method is one RPC or table; see
// docs/backend/SOCIAL_RPC_SHAPES.md.
// TODO(social-wire): delete `fixtureSocialService` and the dev scenarios once
// the QA checklist (W1 to W7) is signed off with two real accounts.
export type ProfileLookup = {
  // null when get_social_profiles returned no row for that id.
  profile: SocialProfileRow | null;
  detail: SocialProfileDetail | null;
  acceptsRequests: boolean;
  blocked: boolean;
  // Pending request id (to accept / ignore / cancel from the profile).
  requestId: string | null;
};

export type CreateInviteResult =
  | { ok: true; link: InviteLink }
  | { ok: false; error: 'limit' };

export interface SocialService {
  getSettings(): Promise<SocialSettingsRow | null>;
  setUsername(username: string): Promise<SetUsernameResult>;
  updateSettings(patch: SocialSettingsPatch): Promise<SocialSettingsRow>;
  getFriendsOverview(): Promise<FriendsOverview>;
  findByUsername(username: string): Promise<FindUserResult | null>;
  getProfile(userId: string): Promise<ProfileLookup>;
  sendFriendRequest(target: string): Promise<SendFriendRequestStatus>;
  respondFriendRequest(
    requestId: string,
    accept: boolean,
  ): Promise<'accepted' | 'declined' | 'not_found'>;
  cancelFriendRequest(requestId: string): Promise<void>;
  // remove_friend: false when there was no friendship to remove.
  removeFriend(friendId: string): Promise<boolean>;
  blockUser(target: string): Promise<void>;
  unblockUser(target: string): Promise<void>;
  getBlocked(): Promise<BlockedEntry[]>;
  createInvite(): Promise<CreateInviteResult>;
  getInvites(): Promise<FriendInviteRow[]>;
  // Sets revoked_at on a link that was not used yet; false if it was already
  // used or revoked.
  revokeInvite(inviteId: string): Promise<boolean>;

  // ── Contenido (tanda A) ──
  getFeed(cursor: string | null, limit: number): Promise<FeedPage>;
  getFriendActivity(limit: number): Promise<ActivityItem[]>;
  getPost(postId: string): Promise<FeedPost | null>;
  toggleLike(postId: string, like: boolean): Promise<ToggleLikeResult>;
  getComments(postId: string): Promise<FeedComment[]>;
  addComment(postId: string, body: string): Promise<FeedComment>;
  deleteComment(commentId: string): Promise<void>;
  deletePost(postId: string): Promise<void>;
  // Edits the text of my post (update body); 0 rows updated is a failure.
  editPost(postId: string, body: string): Promise<void>;
  // `focus`: the exact item a "Compartir" button points to (else the latest of each kind).
  getAttachmentSources(focus?: AttachmentFocus): Promise<AttachmentSource[]>;
  createPost(input: CreatePostInput): Promise<CreatePostResult>;
  getPostPhotoSource(path: string): Promise<ImageSourcePropType | null>;
  reportContent(
    target: ReportTarget,
    targetId: string,
    reason: ReportReason,
    details: string | null,
  ): Promise<void>;
  saveSharedRoutine(
    postId: string,
  ): Promise<{ templateId: string; created: boolean }>;
  getTermsAccepted(): Promise<boolean>;
  acceptTerms(): Promise<void>;

  // ── Retos, notificaciones y moderación (tanda C) ──
  getMyChallenges(): Promise<MyChallenges>;
  getChallengeBoard(challengeId: string): Promise<ChallengeBoard | null>;
  // Errors of the server come back as a result (no_invite, invite_expired,
  // not_available…), not as an exception.
  respondChallengeInvite(
    challengeId: string,
    accept: boolean,
  ): Promise<RespondInviteResult>;
  joinOfficialChallenge(challengeId: string): Promise<JoinOfficialResult>;
  // false: there was nothing to leave / cancel (ok:false).
  leaveChallenge(challengeId: string): Promise<boolean>;
  cancelFriendChallenge(challengeId: string): Promise<boolean>;
  addManualContribution(
    challengeId: string,
    amount: number,
  ): Promise<ManualContributionResult>;
  createFriendChallenge(
    input: CreateChallengeInput,
  ): Promise<CreateChallengeResult>;
  markChallengeCelebrated(challengeId: string): Promise<void>;
  // Newest first; `cursor` is the created_at of the last row already loaded.
  getNotifications(cursor: string | null, limit: number): Promise<NotificationPage>;
  // Notifications with read_at null (the bell).
  getUnreadNotifications(): Promise<number>;
  markNotificationsRead(ids: string[]): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  deleteNotifications(ids: string[]): Promise<void>;
  getModeratorRole(): Promise<ModeratorRole | null>;
  getModerationQueue(): Promise<ModerationQueueRow[]>;
  getModerationHistory(): Promise<ModerationActionRow[]>;
  moderateContent(
    target: ModerationTarget,
    targetId: string,
    action: ModerationAction,
    note: string | null,
  ): Promise<void>;
}
