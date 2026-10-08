import { mergeFeedPages, nextFeedCursor } from '@app/features/social/postModel';
import type {
  AchievementAttachment,
  CreatePostError,
  CreatePostResult,
  ActivityItem,
  ChallengeAttachment,
  FeedComment,
  FeedPage,
  FeedPost,
  PostAttachment,
  PostType,
  RecordAttachment,
  RoutineAttachment,
  SocialCommentRow,
  WorkoutAttachment,
  WorkoutTopPr,
} from '@app/features/social/postTypes';
import type {
  RelationshipState,
  SocialProfileRow,
} from '@app/features/social/socialTypes';

// Pure mapping of the W3 responses (get_feed, get_post, get_friend_activity and
// the comment rows) to the models of the screens. Shapes: SOCIAL_RPC_SHAPES.md.
// Anything unexpected drops that post or field instead of the whole page, and
// text from users is only ever kept as plain text.

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Json)
    : null;
}
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const orNull = <T>(value: T | undefined): T | null => (value === undefined ? null : value);

const POST_TYPES: readonly PostType[] = [
  'workout',
  'record',
  'routine',
  'achievement',
  'challenge',
  'photo',
];

// ── Attachments, by post type ─────────────────────────────────────────────
function parseTopPr(value: unknown): WorkoutTopPr | null {
  const row = asRecord(value);
  const exercise = asString(row?.exercise);
  if (!row || !exercise) {
    return null;
  }
  return {
    exercise,
    exercise_id: asString(row.exercise_id) ?? '',
    pr_type: asString(row.pr_type) ?? '',
    value_weight: orNull(asNumber(row.value_weight)),
    value_reps: orNull(asNumber(row.value_reps)),
    unit: asString(row.unit) ?? 'kg',
  };
}

function parseWorkout(row: Json): WorkoutAttachment | null {
  const title = asString(row.title);
  if (!title) {
    return null;
  }
  const attachment: WorkoutAttachment = {
    title,
    duration_min: asNumber(row.duration_min) ?? 0,
    exercises_done: asNumber(row.exercises_done) ?? 0,
    exercises_total: asNumber(row.exercises_total) ?? asNumber(row.exercises_done) ?? 0,
  };
  const workoutType = asString(row.workout_type);
  if (workoutType) {
    attachment.workout_type = workoutType;
  }
  if ('calories' in row) {
    attachment.calories = orNull(asNumber(row.calories));
  }
  // BT-44: absent in posts published before it, null without sets.
  if ('volume_kg' in row) {
    attachment.volume_kg = orNull(asNumber(row.volume_kg));
  }
  const prs = asNumber(row.prs_count);
  if (prs !== undefined) {
    attachment.prs_count = prs;
  }
  if ('top_pr' in row) {
    attachment.top_pr = parseTopPr(row.top_pr);
  }
  return attachment;
}

function parseRecord(row: Json): RecordAttachment | null {
  const name = asString(row.exercise_name);
  const value = asNumber(row.value);
  if (!name || value === undefined) {
    return null;
  }
  return {
    exercise_id: asString(row.exercise_id) ?? '',
    exercise_name: name,
    pr_type: asString(row.pr_type) ?? '',
    value,
    unit: asString(row.unit) ?? 'kg',
    delta: orNull(asNumber(row.delta)),
    previous_best: orNull(asNumber(row.previous_best)),
    reps: orNull(asNumber(row.reps)),
  };
}

function parseRoutine(row: Json): RoutineAttachment | null {
  const title = asString(row.title);
  if (!title || !Array.isArray(row.exercises)) {
    return null;
  }
  const exercises: RoutineAttachment['exercises'] = [];
  row.exercises.forEach((item, index) => {
    const exercise = asRecord(item);
    const name = asString(exercise?.name);
    if (!exercise || !name) {
      return;
    }
    exercises.push({
      exercise_id: asString(exercise.exercise_id) ?? '',
      name,
      sets: asNumber(exercise.sets) ?? 0,
      // reps can be "8" or "8-12" (text) or a number.
      reps:
        asString(exercise.reps) ??
        (asNumber(exercise.reps) !== undefined ? String(exercise.reps) : ''),
      sort_order: asNumber(exercise.sort_order) ?? index + 1,
    });
  });
  return {
    title,
    difficulty: asString(row.difficulty) ?? '',
    duration_min: asNumber(row.duration_min) ?? 0,
    type: asString(row.type) ?? '',
    exercises,
  };
}

// Core 33 completed is {kind: 'core33', days_completed: 33}.
function parseAchievement(row: Json): AchievementAttachment | null {
  if (row.kind === 'core33') {
    return {
      kind: 'core33',
      title: asString(row.title) ?? 'Core 33',
      days_completed: asNumber(row.days_completed) ?? 33,
    };
  }
  const title = asString(row.title);
  if (!title) {
    return null;
  }
  return {
    badge_id: asString(row.badge_id),
    title,
    icon: asString(row.icon),
  };
}

function parseChallenge(row: Json): ChallengeAttachment | null {
  const title = asString(row.title);
  if (!title) {
    return null;
  }
  return {
    title,
    metric: asString(row.metric) ?? '',
    goal: asNumber(row.goal) ?? 0,
    final_value: asNumber(row.final_value) ?? 0,
    rank_among_friends: orNull(asNumber(row.rank_among_friends)),
    points: asNumber(row.points) ?? 0,
    badge_id: asString(row.badge_id) ?? null,
  };
}

// `photo` posts carry no attachment (null); an unreadable one is null too and
// the card then shows only its text and photo.
export function parseAttachment(type: PostType, value: unknown): PostAttachment | null {
  const row = asRecord(value);
  if (!row) {
    return null;
  }
  switch (type) {
    case 'workout':
      return parseWorkout(row);
    case 'record':
      return parseRecord(row);
    case 'routine':
      return parseRoutine(row);
    case 'achievement':
      return parseAchievement(row);
    case 'challenge':
      return parseChallenge(row);
    default:
      return null;
  }
}

// ── get_feed / get_post rows ──────────────────────────────────────────────
// Feed and detail only show the viewer's posts and their friends', so the
// relationship with the author is `self` or `friends` (DA-119: real photos).
export function authorRelationship(authorId: string, me: string): RelationshipState {
  return authorId === me ? 'self' : 'friends';
}

function parseAuthor(row: Json, authorId: string): SocialProfileRow | null {
  const author = asRecord(row.author);
  if (!author) {
    return null;
  }
  return {
    id: authorId,
    username: asString(author.username) ?? '',
    name: asString(author.name) ?? 'Usuario',
    avatar_key: asString(author.avatar_key) ?? '',
    // A storage path (null when the identity is not visible).
    profile_photo_url: asString(author.profile_photo_url) ?? '',
    goal: '',
    weight: 0,
  };
}

export function parseFeedPost(value: unknown, me: string): FeedPost | null {
  const row = asRecord(value);
  const id = asString(row?.id);
  const authorId = asString(row?.author_id);
  const type = row?.type as PostType | undefined;
  const createdAt = asString(row?.created_at);
  if (!row || !id || !authorId || !createdAt || !type || !POST_TYPES.includes(type)) {
    return null;
  }
  return {
    id,
    author_id: authorId,
    type,
    body: asString(row.body) ?? null,
    audience: asString(row.audience) ?? 'friends',
    photo_path: asString(row.photo_path) ?? null,
    photo_width: orNull(asNumber(row.photo_width)),
    photo_height: orNull(asNumber(row.photo_height)),
    attachment: parseAttachment(type, row.attachment),
    like_count: asNumber(row.like_count) ?? 0,
    comment_count: asNumber(row.comment_count) ?? 0,
    created_at: createdAt,
    edited_at: asString(row.edited_at) ?? null,
    // The server already leaves out deleted, hidden, removed and reported ones.
    deleted_at: null,
    hidden_at: null,
    removed_at: null,
    liked_by_me: row.liked_by_me === true,
    author: parseAuthor(row, authorId),
    relationship: authorRelationship(authorId, me),
  };
}

// A page without duplicated ids (the newest copy wins), newest first, and the
// cursor of the next call (`_before` = created_at of the last one; null when
// the page came back short).
export function parseFeedPage(data: unknown, me: string, limit: number): FeedPage {
  const rows = Array.isArray(data) ? data : [];
  const posts = mergeFeedPages(
    [],
    rows
      .map(row => parseFeedPost(row, me))
      .filter((post): post is FeedPost => post !== null),
  );
  // The cursor depends on what the server returned, not on what was readable.
  const lastRow = asRecord(rows[rows.length - 1]);
  const lastCreatedAt = asString(lastRow?.created_at);
  return {
    posts,
    nextCursor:
      rows.length >= limit && lastCreatedAt
        ? lastCreatedAt
        : nextFeedCursor(posts, limit),
  };
}

// ── get_friend_activity ───────────────────────────────────────────────────
// {id, user_id, kind, summary: {title, duration_min?}, created_at, user: {…}}.
// `user` has no photo: the screen completes the author with get_social_profiles.
export function parseActivityItems(data: unknown): ActivityItem[] {
  const items: ActivityItem[] = [];
  (Array.isArray(data) ? data : []).forEach(value => {
    const row = asRecord(value);
    const id = asString(row?.id);
    const userId = asString(row?.user_id);
    const createdAt = asString(row?.created_at);
    if (!row || !id || !userId || !createdAt) {
      return;
    }
    const summary = asRecord(row.summary);
    const duration = asNumber(summary?.duration_min);
    items.push({
      id,
      user_id: userId,
      kind: asString(row.kind) ?? '',
      summary: {
        title: asString(summary?.title) ?? '',
        ...(duration !== undefined ? { duration_min: duration } : {}),
      },
      created_at: createdAt,
      author: null,
    });
  });
  return items;
}

// Gives each activity its author: the profile of get_social_profiles (with a
// photo path) or, when absent, the `user` block of the activity row.
export function withActivityAuthors(
  items: ActivityItem[],
  profiles: Map<string, SocialProfileRow>,
  data: unknown,
): ActivityItem[] {
  const users = new Map<string, Json>();
  (Array.isArray(data) ? data : []).forEach(value => {
    const row = asRecord(value);
    const userId = asString(row?.user_id);
    const user = asRecord(row?.user);
    if (userId && user) {
      users.set(userId, user);
    }
  });
  return items.map(item => {
    const known = profiles.get(item.user_id);
    const user = users.get(item.user_id);
    const author: SocialProfileRow | null =
      known ??
      (user
        ? {
            id: item.user_id,
            username: asString(user.username) ?? '',
            name: asString(user.name) ?? 'Usuario',
            avatar_key: asString(user.avatar_key) ?? '',
            profile_photo_url: '',
            goal: '',
            weight: 0,
          }
        : null);
    return { ...item, author };
  });
}

// ── Comments (table rows) ─────────────────────────────────────────────────
export function toFeedComments(
  rows: SocialCommentRow[],
  profiles: Map<string, SocialProfileRow>,
  me: string,
  friendIds: ReadonlySet<string>,
): FeedComment[] {
  return rows.map(row => {
    const relationship: RelationshipState =
      row.author_id === me ? 'self' : friendIds.has(row.author_id) ? 'friends' : 'none';
    const author = profiles.get(row.author_id) ?? null;
    return {
      id: row.id,
      post_id: row.post_id,
      author_id: row.author_id,
      body: row.body,
      created_at: row.created_at,
      deleted_at: row.deleted_at,
      hidden_at: row.hidden_at,
      removed_at: row.removed_at,
      // DA-119: only the viewer and friends keep a photo path.
      author:
        author && relationship === 'none' ? { ...author, profile_photo_url: '' } : author,
      relationship,
    };
  });
}

// ── Errors of the W3 writes ───────────────────────────────────────────────
// 42501: no permission = "no disponible". 23514: check violation (body of 1 to
// 500 characters). not_authenticated: the session is gone.
export type PostgrestLike = { code?: string | null; message?: string | null } | null;

export function isUnavailable(error: PostgrestLike): boolean {
  return error?.code === '42501';
}

export function isValidationError(error: PostgrestLike): boolean {
  return error?.code === '23514';
}

export function isNotAuthenticated(error: PostgrestLike): boolean {
  return Boolean(error?.message?.includes('not_authenticated'));
}

// A duplicate report or like is not an error (ON CONFLICT DO NOTHING).
export function isDuplicate(error: PostgrestLike): boolean {
  return error?.code === '23505';
}

// ── create_post ───────────────────────────────────────────────────────────
// {ok: true, created, post_id} or {ok: false, error}. Repeating the same
// source answers `created: false` with the same post_id: it is a success
// ("ya lo compartiste").
const SERVER_ERRORS: readonly CreatePostError[] = [
  'invalid_type',
  'category_not_shared',
  'photo_not_allowed',
  'photos_not_shared',
  'photo_not_owned',
  'invalid_source',
  'source_not_found',
  'routine_not_shareable',
  'photo_required',
];

export function parseCreatePost(data: unknown): CreatePostResult {
  const body = asRecord(data);
  const postId = asString(body?.post_id);
  if (body?.ok === true && postId) {
    return { ok: true, postId, created: body.created !== false };
  }
  const error = asString(body?.error);
  return {
    ok: false,
    error: SERVER_ERRORS.includes(error as CreatePostError)
      ? (error as CreatePostError)
      : 'unknown',
  };
}
