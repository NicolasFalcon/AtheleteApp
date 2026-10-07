import type { ImageSourcePropType } from 'react-native';
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

// Data layer of Comunidad · tanda B. The screens only talk to this interface.
// Today it is backed by in-memory fixtures (`services/social/fixtureSocialService`);
// the wiring phase swaps it for Supabase calls, one method per RPC / table:
//
// TODO(social-wire): implement with Supabase (getSupabaseClient):
//   getSettings            → select social_settings (own row; null = no row)
//   setUsername            → ensure_social_settings(_username) the first time,
//                            set_username(_username) afterwards
//   updateSettings         → update social_settings (audience, share_*, allow_friend_requests)
//   getFriendsOverview     → friendships + friend_requests (+ get_social_profiles,
//                            get_friend_activity, get_my_challenges for the counts)
//   findByUsername         → find_user_by_username(_username)
//   getProfile             → get_social_profile(_user_id) + get_social_profiles([id])
//                            (the profile row may be absent: tolerate it)
//   sendFriendRequest      → send_friend_request(_target)
//   respondFriendRequest   → respond_friend_request(_request_id, _accept)
//   cancelFriendRequest    → cancel_friend_request(_request_id)
//   blockUser / unblockUser→ block_user(_target) / delete from user_blocks
//   getBlocked             → select user_blocks + get_social_profiles
//   createInvite           → create_friend_invite() (max 5 active)
//   getInvites             → select friend_invites (own)
//   getFeed                → get_feed(_limit, _before) (+ get_social_profiles for authors)
//   getFriendActivity      → get_friend_activity(_limit)
//   getPost                → get_feed / select social_posts via can_view_post; null if unavailable
//   toggleLike             → insert / delete social_post_likes (ON CONFLICT DO NOTHING)
//   getComments            → select social_post_comments (+ get_social_profiles)
//   addComment             → insert social_post_comments
//   deleteComment          → delete_comment(_comment_id)
//   deletePost             → update social_posts set deleted_at
//   getAttachmentSources   → latest session, routine, record, badge and challenge of the user
//   createPost             → upload to social-photos, then create_post(_type, _source_id, _body, _photo_*)
//   getPostPhotoSource     → createSignedUrl on social-photos (cache like profile-photo.ts)
//   reportContent          → insert content_reports (ON CONFLICT DO NOTHING)
//   saveSharedRoutine      → save_shared_routine(_post_id)
//   getTermsAccepted / acceptTerms → BT-43: server flag (profiles.terms_accepted_at) when it exists
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
  blockUser(target: string): Promise<void>;
  unblockUser(target: string): Promise<void>;
  getBlocked(): Promise<BlockedEntry[]>;
  createInvite(): Promise<CreateInviteResult>;
  getInvites(): Promise<FriendInviteRow[]>;

  // ── Contenido (tanda A) ──
  getFeed(cursor: string | null, limit: number): Promise<FeedPage>;
  getFriendActivity(limit: number): Promise<ActivityItem[]>;
  getPost(postId: string): Promise<FeedPost | null>;
  toggleLike(postId: string, like: boolean): Promise<ToggleLikeResult>;
  getComments(postId: string): Promise<FeedComment[]>;
  addComment(postId: string, body: string): Promise<FeedComment>;
  deleteComment(commentId: string): Promise<void>;
  deletePost(postId: string): Promise<void>;
  getAttachmentSources(): Promise<AttachmentSource[]>;
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
}
