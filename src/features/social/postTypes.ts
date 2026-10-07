import type { Tables } from '@app/types/supabase';
import type {
  RelationshipState,
  SocialProfileRow,
} from '@app/features/social/socialTypes';

// Types of Comunidad · tanda A (contenido). Rows come from `types/supabase.ts`
// (`social_posts`, `social_post_comments`, `social_post_likes`); the RPC
// results (`get_feed`, `get_friend_activity`) are typed from their documented
// shape (BACKEND_SUMMARY §2, SOCIAL_SCHEMA_PROPOSAL §4.5).

export type SocialPostRow = Tables<'social_posts'>;
export type SocialCommentRow = Tables<'social_post_comments'>;
export type ContentReportRow = Tables<'content_reports'>;

export type PostType =
  | 'workout'
  | 'record'
  | 'routine'
  | 'achievement'
  | 'challenge'
  | 'photo';

// `attachment` is a snapshot the server writes (never editable by the app).
export type WorkoutAttachment = {
  title: string;
  duration_min: number;
  exercises_done: number;
  exercises_total: number;
  workout_type?: string;
  calories?: number | null;
  // BT-44: create_post writes these for new posts; posts published before
  // that have none of the three keys, so they are all optional.
  // `volume_kg`: null when the session has no sets (shown as "—").
  volume_kg?: number | null;
  prs_count?: number;
  // Best record of the session; null when there was none.
  top_pr?: WorkoutTopPr | null;
};

export type WorkoutTopPr = {
  exercise: string;
  exercise_id: string;
  pr_type: string;
  value_weight: number | null;
  value_reps: number | null;
  unit: string;
};

export type RecordAttachment = {
  exercise_id: string;
  exercise_name: string;
  pr_type: string;
  value: number;
  unit: string;
  delta: number | null;
  previous_best: number | null;
};

export type RoutineAttachment = {
  title: string;
  difficulty: string;
  duration_min: number;
  type: string;
  exercises: {
    exercise_id: string;
    name: string;
    sets: number;
    reps: string;
    sort_order: number;
  }[];
};

export type AchievementAttachment = {
  badge_id?: string;
  title: string;
  icon?: string;
  kind?: 'core33';
  days_completed?: number;
};

export type ChallengeAttachment = {
  title: string;
  metric: string;
  goal: number;
  final_value: number;
  rank_among_friends: number | null;
  points: number;
};

export type PostAttachment =
  | WorkoutAttachment
  | RecordAttachment
  | RoutineAttachment
  | AchievementAttachment
  | ChallengeAttachment;

// One post of `get_feed`: the row, its author and `liked_by_me`. The author
// profile may be absent from `get_social_profiles` (SOCIAL_PLAN §8.1).
export type FeedPost = Pick<
  SocialPostRow,
  | 'id'
  | 'author_id'
  | 'body'
  | 'audience'
  | 'photo_path'
  | 'photo_width'
  | 'photo_height'
  | 'like_count'
  | 'comment_count'
  | 'created_at'
  | 'edited_at'
  | 'deleted_at'
  | 'hidden_at'
  | 'removed_at'
> & {
  type: PostType;
  attachment: PostAttachment | null;
  liked_by_me: boolean;
  author: SocialProfileRow | null;
  // Relationship with the author (photos and avatars depend on it, DA-119).
  relationship: RelationshipState;
};

export type FeedPage = {
  posts: FeedPost[];
  // Pass it as `_before` to get the next page; null at the end of the list.
  nextCursor: string | null;
};

export type FeedComment = Pick<
  SocialCommentRow,
  | 'id'
  | 'post_id'
  | 'author_id'
  | 'body'
  | 'created_at'
  | 'deleted_at'
  | 'hidden_at'
  | 'removed_at'
> & {
  author: SocialProfileRow | null;
  relationship: RelationshipState;
};

// get_friend_activity row.
export type ActivityItem = {
  id: string;
  user_id: string;
  kind: string;
  summary: { title: string };
  created_at: string;
  author: SocialProfileRow | null;
};

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'nudity'
  | 'violence'
  | 'self_harm'
  | 'other';

export type ReportTarget = 'post' | 'comment' | 'user';

export type PostPhotoDraft = {
  // Fixture key of the picked photo (the real picker returns a local file).
  key: string;
  mime: string;
  sizeBytes: number;
  width: number;
  height: number;
};

export type AttachmentKind =
  | 'workout'
  | 'routine'
  | 'record'
  | 'achievement'
  | 'challenge';

// What the composer can attach: the latest items of the user. The server
// builds the real snapshot from `source_id` (create_post).
export type AttachmentSource = {
  kind: AttachmentKind;
  sourceId: string;
  // Dark label of the preview ("Entrenamiento de hoy", "Tu rutina"…).
  over: string;
  title: string;
  stats: { value: string; label: string }[];
  record?: { exercise: string; value: number; unit: string } | null;
  // The matching `share_*` switch is off: the composer does not offer it.
  blockedByPrivacy?: boolean;
};

export type CreatePostInput = {
  type: PostType;
  sourceId?: string;
  body: string;
  photo?: PostPhotoDraft | null;
};

export type CreatePostResult =
  | { ok: true; postId: string }
  | { ok: false; error: 'validation' | 'privacy' | 'duplicate' };

export type ToggleLikeResult = { liked: boolean; count: number };
