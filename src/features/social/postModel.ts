import type {
  ActivityItem,
  AttachmentKind,
  FeedComment,
  FeedPost,
  PostAttachment,
  PostPhotoDraft,
  PostType,
  RecordAttachment,
  ReportReason,
  ToggleLikeResult,
  WorkoutAttachment,
} from '@app/features/social/postTypes';
import { firstName } from '@app/features/social/socialModel';

// Pure model of Comunidad · tanda A (contenido). Rules come from
// docs/social/SOCIAL_SCHEMA_PROPOSAL.md (§4.5, §4.7, §4.12) and the handoff §11.

export const POST_BODY_MAX = 280;
export const COMMENT_MAX = 500;
export const REPORT_DETAILS_MAX = 500;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
export const FEED_PAGE_SIZE = 10;

// ── Which body a post gets ─────────────────────────────────────────────────
export type PostBodyKind =
  | 'workoutPhoto' // photo + metric summary (dark, 400 pt)
  | 'workoutLight' // white card, no photo
  | 'record' // dark block with the figure
  | 'routine' // movement chips
  | 'achievement' // medal
  | 'challenge'
  | 'photo'; // photo only

export function postBodyKind(post: {
  type: PostType;
  photo_path: string | null;
}): PostBodyKind {
  switch (post.type) {
    case 'workout':
      return post.photo_path ? 'workoutPhoto' : 'workoutLight';
    case 'record':
      return 'record';
    case 'routine':
      return 'routine';
    case 'achievement':
      return 'achievement';
    case 'challenge':
      return 'challenge';
    case 'photo':
      return 'photo';
  }
}

// "Nuevo récord · hace 1 h": the first part of the author's second line.
export function postKindLabel(type: PostType): string {
  switch (type) {
    case 'workout':
      return 'Entrenamiento';
    case 'record':
      return 'Nuevo récord';
    case 'routine':
      return 'Rutina';
    case 'achievement':
      return 'Logro';
    case 'challenge':
      return 'Reto';
    case 'photo':
      return 'Foto';
  }
}

// ── Likes (optimistic) ─────────────────────────────────────────────────────
export type LikeState = { liked: boolean; count: number };

// The tap shows the result right away: add or remove the like; the counter
// never goes below zero.
export function toggleLikeState(state: LikeState): LikeState {
  return state.liked
    ? { liked: false, count: Math.max(0, state.count - 1) }
    : { liked: true, count: state.count + 1 };
}

// After the server answers: its figures win; if the call failed (`null`) the
// previous state comes back.
export function settleLike(
  previous: LikeState,
  server: ToggleLikeResult | null,
): LikeState {
  return server
    ? { liked: server.liked, count: Math.max(0, server.count) }
    : previous;
}

// ── Photo, post and comment validation ─────────────────────────────────────
export type PhotoIssue = 'photo_type' | 'photo_size';

export function validatePhoto(
  photo: Pick<PostPhotoDraft, 'mime' | 'sizeBytes'>,
): PhotoIssue | null {
  if (!PHOTO_MIME_TYPES.includes(photo.mime.toLowerCase())) {
    return 'photo_type';
  }
  if (photo.sizeBytes <= 0 || photo.sizeBytes > PHOTO_MAX_BYTES) {
    return 'photo_size';
  }
  return null;
}

export type PostIssue =
  | 'too_long'
  | 'no_content'
  | 'photo_not_allowed'
  | PhotoIssue
  | 'terms';

export const POST_ISSUES: Record<PostIssue, string> = {
  too_long: `Máximo ${POST_BODY_MAX} caracteres.`,
  no_content: 'Añade un adjunto de Athelete o una foto: no se publica solo texto.',
  photo_not_allowed: 'La foto solo se puede añadir a un entrenamiento o sola.',
  photo_type: 'Usa una foto JPG, PNG o WebP.',
  photo_size: 'La foto pesa más de 5 MB.',
  terms: 'Acepta los Términos de uso para publicar.',
};

const ATTACHMENT_TYPE: Record<AttachmentKind, PostType> = {
  workout: 'workout',
  routine: 'routine',
  record: 'record',
  achievement: 'achievement',
  challenge: 'challenge',
};

export type PostValidation =
  | { ok: true; type: PostType; body: string }
  | { ok: false; issues: PostIssue[] };

// Every post carries an Athelete attachment or a photo, never only text (Q4);
// a photo goes with a workout or alone (DA-S4); the text is optional (≤ 280).
export function validatePost(input: {
  body: string;
  attachment: AttachmentKind | null;
  photo: PostPhotoDraft | null;
  termsAccepted: boolean;
}): PostValidation {
  const issues: PostIssue[] = [];
  const body = input.body.trim();

  if (body.length > POST_BODY_MAX) {
    issues.push('too_long');
  }
  if (!input.attachment && !input.photo) {
    issues.push('no_content');
  }
  if (input.photo) {
    if (input.attachment && input.attachment !== 'workout') {
      issues.push('photo_not_allowed');
    }
    const photoIssue = validatePhoto(input.photo);
    if (photoIssue) {
      issues.push(photoIssue);
    }
  }
  if (!input.termsAccepted) {
    issues.push('terms');
  }
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return {
    ok: true,
    type: input.attachment ? ATTACHMENT_TYPE[input.attachment] : 'photo',
    body,
  };
}

export type CommentValidation =
  | { ok: true; body: string }
  | { ok: false; error: 'empty' | 'too_long' };

export function validateComment(text: string): CommentValidation {
  const body = text.trim();

  if (body.length === 0) {
    return { ok: false, error: 'empty' };
  }
  if (body.length > COMMENT_MAX) {
    return { ok: false, error: 'too_long' };
  }
  return { ok: true, body };
}

export const REPORT_REASONS: ReadonlyArray<{
  key: ReportReason;
  label: string;
}> = [
  { key: 'spam', label: 'Spam o publicidad' },
  { key: 'harassment', label: 'Acoso o insultos' },
  { key: 'nudity', label: 'Desnudos o contenido sexual' },
  { key: 'violence', label: 'Violencia' },
  { key: 'self_harm', label: 'Autolesiones' },
  { key: 'other', label: 'Otro motivo' },
];

export function validateReport(input: {
  reason: ReportReason | null;
  details: string;
}):
  | { ok: true; reason: ReportReason; details: string | null }
  | { ok: false; error: 'no_reason' | 'details_too_long' } {
  if (!input.reason) {
    return { ok: false, error: 'no_reason' };
  }
  const details = input.details.trim();
  if (details.length > REPORT_DETAILS_MAX) {
    return { ok: false, error: 'details_too_long' };
  }
  return { ok: true, reason: input.reason, details: details || null };
}

// ── Removed, hidden and deleted content ────────────────────────────────────
export type ContentState = 'visible' | 'deleted' | 'hidden' | 'removed';

// deleted_at: the author deleted it (it disappears, no trace). removed_at:
// moderation took it down. hidden_at: reports hid it while it is reviewed.
export function contentState(item: {
  deleted_at: string | null;
  hidden_at: string | null;
  removed_at: string | null;
}): ContentState {
  if (item.deleted_at) {
    return 'deleted';
  }
  if (item.removed_at) {
    return 'removed';
  }
  if (item.hidden_at) {
    return 'hidden';
  }
  return 'visible';
}

export function retiredCopy(
  state: Exclude<ContentState, 'visible' | 'deleted'>,
  mine: boolean,
): { title: string; body: string } {
  if (state === 'removed') {
    return {
      title: 'Contenido retirado',
      body: mine
        ? 'Lo retiramos por incumplir las normas de la comunidad.'
        : 'Se retiró por incumplir las normas de la comunidad.',
    };
  }
  return {
    title: 'Contenido en revisión',
    body: 'Está oculto mientras lo revisamos.',
  };
}

// What the lists show: deleted content and what you reported never appear;
// removed and hidden content shows its "retirado" placeholder.
export function listedContent<
  T extends {
    id: string;
    deleted_at: string | null;
    hidden_at: string | null;
    removed_at: string | null;
  },
>(items: T[], reportedIds: ReadonlySet<string> = new Set()): T[] {
  return items.filter(
    item => contentState(item) !== 'deleted' && !reportedIds.has(item.id),
  );
}

// ── Feed pagination (cursor = created_at of the last post) ─────────────────
function byNewest<T extends { created_at: string }>(a: T, b: T): number {
  return b.created_at.localeCompare(a.created_at);
}

// Adds a page without duplicates (a refetch or a post that moved between
// pages): the newest copy of each id wins; newest first.
export function mergeFeedPages(
  current: FeedPost[],
  page: FeedPost[],
): FeedPost[] {
  const byId = new Map<string, FeedPost>();
  current.forEach(post => byId.set(post.id, post));
  page.forEach(post => byId.set(post.id, post));
  return Array.from(byId.values()).sort(byNewest);
}

// `_before` of the next call; null when the page came back short (the end).
export function nextFeedCursor(
  page: FeedPost[],
  limit: number = FEED_PAGE_SIZE,
): string | null {
  if (page.length < limit || page.length === 0) {
    return null;
  }
  return page[page.length - 1].created_at;
}

// ── Time ───────────────────────────────────────────────────────────────────
export function timeAgo(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();

  if (Number.isNaN(diff) || diff < 60_000) {
    return 'ahora';
  }
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) {
    return `hace ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `hace ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return 'ayer';
  }
  return days < 7 ? `hace ${days} días` : `hace ${Math.floor(days / 7)} sem`;
}

// ── Attachment text ────────────────────────────────────────────────────────
export function formatThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatKg(value: number | null | undefined): string {
  return value === null || value === undefined || value <= 0
    ? '—'
    : `${formatThousands(value)} kg`;
}

// Duración · ejercicios · volumen (as the design). Without a volume in the
// snapshot (BT-44) the third figure is "—".
export function workoutStats(
  attachment: WorkoutAttachment,
): { value: string; label: string }[] {
  return [
    { value: `${attachment.duration_min} min`, label: 'duración' },
    {
      value: `${attachment.exercises_done}`,
      label: attachment.exercises_total > attachment.exercises_done
        ? `de ${attachment.exercises_total} ejercicios`
        : 'ejercicios',
    },
    { value: formatKg(attachment.volume_kg), label: 'volumen' },
  ];
}

export function recordDeltaLine(attachment: RecordAttachment): string | null {
  return attachment.delta && attachment.delta > 0
    ? `+${attachment.delta} ${attachment.unit} sobre su mejor marca`
    : null;
}

export function isWorkoutAttachment(
  attachment: PostAttachment | null,
): attachment is WorkoutAttachment {
  return Boolean(attachment && 'duration_min' in attachment && 'exercises_done' in attachment);
}

// ── Activity lines ("Carlos · nuevo récord") ───────────────────────────────
export type ActivityGroup = {
  key: string;
  createdAt: string;
  people: NonNullable<ActivityItem['author']>[];
  text: string;
};

function joinNames(names: string[]): string {
  return names.length <= 1
    ? names.join('')
    : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

// Activity is a line, never a post. Several friends who trained the same day
// share one line; the rest are one line each.
export function groupActivity(items: ActivityItem[]): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  const workouts = new Map<string, ActivityItem[]>();

  items.forEach(item => {
    if (!item.author) {
      return;
    }
    if (item.kind === 'workout_completed') {
      const day = item.created_at.slice(0, 10);
      workouts.set(day, [...(workouts.get(day) ?? []), item]);
      return;
    }
    const who = firstName(item.author.name);
    const text =
      item.kind === 'record'
        ? `${who} · nuevo récord`
        : item.kind === 'badge'
        ? `${who} · nuevo logro`
        : item.kind === 'core33_completed'
        ? `${who} terminó Core 33`
        : item.kind === 'challenge_completed'
        ? `${who} completó un reto`
        : item.kind === 'streak'
        ? `${who} · ${item.summary.title}`
        : `${who} · ${item.summary.title}`;
    groups.push({
      key: item.id,
      createdAt: item.created_at,
      people: [item.author],
      text,
    });
  });

  workouts.forEach((day, date) => {
    const people = day
      .map(item => item.author)
      .filter((author): author is NonNullable<typeof author> => Boolean(author))
      .filter((author, index, all) => all.findIndex(a => a.id === author.id) === index);
    if (people.length === 0) {
      return;
    }
    const names = joinNames(people.map(person => firstName(person.name)));
    groups.push({
      key: `workouts-${date}`,
      createdAt: day.map(item => item.created_at).sort().reverse()[0],
      people,
      text:
        people.length === 1
          ? `${names} entrenó · ${day[0].summary.title}`
          : `${names} entrenaron hoy`,
    });
  });

  return groups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type FeedEntry =
  | { kind: 'post'; key: string; post: FeedPost }
  | { kind: 'activity'; key: string; group: ActivityGroup };

// Posts and activity lines, newest first. While there are older pages, only
// the activity newer than the last loaded post is shown (older lines appear
// with their older posts).
export function buildFeedEntries(
  posts: FeedPost[],
  activity: ActivityGroup[],
  hasMore: boolean,
): FeedEntry[] {
  const last = posts.length > 0 ? posts[posts.length - 1].created_at : null;
  const lines = hasMore && last
    ? activity.filter(group => group.createdAt >= last)
    : activity;
  const entries: FeedEntry[] = [
    ...posts.map(post => ({ kind: 'post' as const, key: post.id, post })),
    ...lines.map(group => ({
      kind: 'activity' as const,
      key: group.key,
      group,
    })),
  ];

  return entries.sort((a, b) => {
    const at = a.kind === 'post' ? a.post.created_at : a.group.createdAt;
    const bt = b.kind === 'post' ? b.post.created_at : b.group.createdAt;
    return bt.localeCompare(at);
  });
}

// Comments of the detail, oldest first (the new one enters at the end).
export function sortComments(comments: FeedComment[]): FeedComment[] {
  return [...comments].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function commentCountLabel(count: number): string {
  return count === 0
    ? 'Sin comentarios'
    : count === 1
    ? '1 comentario'
    : `${count} comentarios`;
}
