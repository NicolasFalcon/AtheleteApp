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
  | 'photo'
  // TODO(ruta): the backend has no `route` type yet (Fase 5). It only exists
  // in the dev fixtures; in the real app a post of this type is not shown.
  | 'route';

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
  // Reps of a weight record (create_post writes `reps`).
  reps?: number | null;
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
  badge_id?: string | null;
};

// Route post (v2.12 · SOCIAL_16). Fixtures only until Ruta exists (Fase 5).
export type RouteAttachment = {
  sport: 'running' | 'cycling';
  distance_km: number;
  duration_sec: number;
  // "5:08 /km" or "27,3 km/h".
  pace_label: string;
  elevation_m: number | null;
  // Name of the planned route this activity followed ("Parque 5K").
  planned_name: string | null;
  // "Nueva mejor marca" line, when the activity beat one.
  new_best: string | null;
};

export type PostAttachment =
  | WorkoutAttachment
  | RecordAttachment
  | RoutineAttachment
  | AchievementAttachment
  | ChallengeAttachment
  | RouteAttachment;

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
  // `title` always; `duration_min` for workout_completed (SOCIAL_RPC_SHAPES).
  summary: { title: string; duration_min?: number };
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
  // Fixture key of the picked photo (dev screens only).
  key: string;
  // Local file the picker returned (already resized and re-encoded without
  // EXIF); absent for fixtures.
  uri?: string;
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
  // Where a publication with a photo is (the upload comes first).
  onStep?: (step: 'uploading' | 'publishing') => void;
};

// Errors of create_post ({ok: false, error}) plus the ones the app finds
// before or while uploading the photo.
export type CreatePostError =
  | 'invalid_type'
  | 'category_not_shared'
  | 'photo_not_allowed'
  | 'photos_not_shared'
  | 'photo_not_owned'
  | 'invalid_source'
  | 'source_not_found'
  | 'routine_not_shareable'
  | 'photo_required'
  // The app, before sending: type, size or an invalid post.
  | 'photo_type'
  | 'photo_size'
  | 'validation'
  // The upload failed (413 = too large) or the answer was not understood.
  | 'upload_failed'
  | 'unknown';

// `created: false` = the same source was already shared: the post is the same.
export type CreatePostResult =
  | { ok: true; postId: string; created: boolean }
  | { ok: false; error: CreatePostError };

// `count` is null when the server count could not be read back: the screen
// then keeps its own optimistic figure.
export type ToggleLikeResult = { liked: boolean; count: number | null };
