import type { Database, Tables } from '@app/types/supabase';

// Social types. Row types come from `types/supabase.ts` (applied backend);
// RPC results are typed from their documented shape (BACKEND_SUMMARY §2) so
// wiring the screens later only swaps the data source.

type Functions = Database['public']['Functions'];

export type SocialSettingsRow = Tables<'social_settings'>;
export type FriendRequestRow = Tables<'friend_requests'>;
export type FriendInviteRow = Tables<'friend_invites'>;
export type UserBlockRow = Tables<'user_blocks'>;

// get_social_profiles(_user_ids) row. A requested id the viewer cannot see
// may be absent from the result (SOCIAL_PLAN §8.1 #1).
export type SocialProfileRow = Functions['get_social_profiles']['Returns'][number];

export type SocialAudience = 'friends' | 'public';

// get_social_profile.relationship (plus 'self').
export type Relationship =
  | 'self'
  | 'none'
  | 'request_sent'
  | 'request_received'
  | 'friends';

// The viewer blocked the person (user_blocks). The RPC hides a blocker from
// the blocked one, so 'blocked' only ever exists for the blocker.
export type RelationshipState = Relationship | 'blocked';

// send_friend_request.status.
export type SendFriendRequestStatus =
  | 'sent'
  | 'pending'
  | 'accepted'
  | 'already_friends'
  | 'not_accepting'
  | 'unavailable'
  | 'invalid';

// find_user_by_username result (null when it does not exist or is blocked).
export type FindUserResult = {
  user_id: string;
  username: string;
  name: string;
  avatar_key: string | null;
  accepts_requests: boolean;
  relationship: Relationship;
};

// get_social_profile.hidden_categories. VERIFY the exact strings with backend
// (BT-46); 'nutrition' is always hidden (Q14).
export type HiddenCategory =
  | 'workouts'
  | 'records'
  | 'achievements'
  | 'photos'
  | 'routines'
  | 'body_weight'
  | 'nutrition';

// get_social_profile.records[]: shape to verify (BT-46).
export type SocialRecord = {
  exercise_name: string;
  value: number;
  unit: string;
  reps: number | null;
  is_new: boolean;
};

// get_social_profile.recent_posts[]: shape to verify (tanda A).
export type SocialRecentPost = {
  id: string;
  type: 'workout' | 'record' | 'routine' | 'achievement' | 'challenge' | 'photo';
  title: string;
};

// get_social_profile result. Fields the viewer may not see are absent.
export type SocialProfileDetail = {
  relationship: Relationship;
  streak_days: number;
  hidden_categories: HiddenCategory[];
  friends_since?: string;
  sessions_total?: number;
  badges_total?: number;
  records?: SocialRecord[];
  weight?: number;
  recent_posts?: SocialRecentPost[];
};

// get_friend_activity row (last activity line of a friend).
export type FriendActivity = {
  user_id: string;
  kind: string;
  summary: { title: string };
  created_at: string;
};

export type FriendEntry = {
  profile: SocialProfileRow;
  friendsSince: string;
  lastActivity: FriendActivity | null;
};

export type ReceivedRequest = {
  request: FriendRequestRow;
  profile: SocialProfileRow;
};

export type SentRequest = {
  request: FriendRequestRow;
  profile: SocialProfileRow;
};

export type FriendsOverview = {
  friends: FriendEntry[];
  received: ReceivedRequest[];
  sent: SentRequest[];
  // Active challenges (tanda C); only shown in the hub header line.
  activeChallenges: number;
  pendingInvitations: number;
};

export type BlockedEntry = {
  block: UserBlockRow;
  profile: SocialProfileRow | null;
};

// Sharing switches of social_settings (the 7 rows of SOCIAL_14).
export type SharingKey =
  | 'share_workouts'
  | 'share_records'
  | 'share_achievements'
  | 'share_photos'
  | 'share_routines'
  | 'share_body_weight'
  | 'allow_friend_requests';

export type SocialSettingsPatch = Partial<
  Pick<SocialSettingsRow, 'audience' | SharingKey>
>;

export type InviteLink = {
  invite: FriendInviteRow;
  url: string;
};

export type SetUsernameResult =
  | { ok: true; username: string }
  | { ok: false; error: 'invalid_username' | 'username_taken' };

export type SocialLoadState = 'loading' | 'error' | 'ready';
