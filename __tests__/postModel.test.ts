import {
  COMMENT_MAX,
  FEED_PAGE_SIZE,
  PHOTO_MAX_BYTES,
  POST_BODY_MAX,
  buildFeedEntries,
  commentCountLabel,
  contentState,
  formatKg,
  groupActivity,
  listedContent,
  mergeFeedPages,
  nextFeedCursor,
  photoFileName,
  postBodyKind,
  recordDeltaLine,
  retiredCopy,
  settleLike,
  timeAgo,
  toggleLikeState,
  validateComment,
  validatePhoto,
  validatePost,
  validateReport,
  topPrLine,
  workoutStats,
} from '../src/features/social/postModel';
import type {
  ActivityItem,
  FeedPost,
  PostPhotoDraft,
  PostType,
} from '../src/features/social/postTypes';

const NOW = new Date('2026-10-07T12:00:00Z');
const at = (minutesAgo: number) =>
  new Date(NOW.getTime() - minutesAgo * 60_000).toISOString();

function post(id: string, minutesAgo: number, extra: Partial<FeedPost> = {}): FeedPost {
  return {
    id,
    author_id: 'u1',
    type: 'workout',
    body: null,
    audience: 'friends',
    photo_path: null,
    photo_width: null,
    photo_height: null,
    like_count: 0,
    comment_count: 0,
    created_at: at(minutesAgo),
    edited_at: null,
    deleted_at: null,
    hidden_at: null,
    removed_at: null,
    attachment: null,
    liked_by_me: false,
    author: null,
    relationship: 'friends',
    ...extra,
  };
}

const PHOTO: PostPhotoDraft = {
  key: 'p',
  mime: 'image/jpeg',
  sizeBytes: 800_000,
  width: 1200,
  height: 1600,
};

describe('which body each post gets', () => {
  it('maps every type to its composition', () => {
    const kind = (type: PostType, photo: string | null = null) =>
      postBodyKind({ type, photo_path: photo });
    expect(kind('record')).toBe('record');
    expect(kind('routine')).toBe('routine');
    expect(kind('achievement')).toBe('achievement');
    expect(kind('challenge')).toBe('challenge');
    expect(kind('photo', 'a/b/c.jpg')).toBe('photo');
  });

  it('a workout is the photo card with a photo and the light card without', () => {
    expect(postBodyKind({ type: 'workout', photo_path: 'a/b/c.jpg' })).toBe('workoutPhoto');
    expect(postBodyKind({ type: 'workout', photo_path: null })).toBe('workoutLight');
  });
});

describe('optimistic like', () => {
  it('adds a like and removes it again', () => {
    const liked = toggleLikeState({ liked: false, count: 26 });
    expect(liked).toEqual({ liked: true, count: 27 });
    expect(toggleLikeState(liked)).toEqual({ liked: false, count: 26 });
  });

  it('never goes below zero', () => {
    expect(toggleLikeState({ liked: true, count: 0 })).toEqual({ liked: false, count: 0 });
  });

  it('reverts to the previous state when the call fails', () => {
    const previous = { liked: false, count: 5 };
    toggleLikeState(previous);
    expect(settleLike(previous, null)).toEqual(previous);
  });

  it('takes the server figures when it answers', () => {
    const previous = { liked: false, count: 5 };
    expect(settleLike(previous, { liked: true, count: 9 })).toEqual({ liked: true, count: 9 });
    expect(settleLike(previous, { liked: true, count: -1 }).count).toBe(0);
  });
});

describe('photo, post and comment validation', () => {
  it('accepts JPG, PNG and WebP up to 5 MB', () => {
    expect(validatePhoto(PHOTO)).toBeNull();
    expect(validatePhoto({ mime: 'image/png', sizeBytes: PHOTO_MAX_BYTES })).toBeNull();
    expect(validatePhoto({ mime: 'IMAGE/WEBP', sizeBytes: 10 })).toBeNull();
    expect(validatePhoto({ mime: 'image/heic', sizeBytes: 10 })).toBe('photo_type');
    expect(validatePhoto({ mime: 'image/gif', sizeBytes: 10 })).toBe('photo_type');
    expect(validatePhoto({ mime: 'image/jpeg', sizeBytes: PHOTO_MAX_BYTES + 1 })).toBe('photo_size');
    expect(validatePhoto({ mime: 'image/jpeg', sizeBytes: 0 })).toBe('photo_size');
  });

  it('never publishes only text', () => {
    expect(
      validatePost({ body: 'Hola', attachment: null, photo: null, termsAccepted: true }),
    ).toEqual({ ok: false, issues: ['no_content'] });
  });

  it('an attachment alone is enough; the text is optional and trimmed', () => {
    expect(
      validatePost({ body: '  ', attachment: 'workout', photo: null, termsAccepted: true }),
    ).toEqual({ ok: true, type: 'workout', body: '' });
    expect(
      validatePost({ body: ' Genial ', attachment: 'record', photo: null, termsAccepted: true }),
    ).toEqual({ ok: true, type: 'record', body: 'Genial' });
  });

  it('a photo alone is a photo post; with a workout it stays a workout', () => {
    expect(
      validatePost({ body: '', attachment: null, photo: PHOTO, termsAccepted: true }),
    ).toEqual({ ok: true, type: 'photo', body: '' });
    expect(
      validatePost({ body: '', attachment: 'workout', photo: PHOTO, termsAccepted: true }),
    ).toMatchObject({ ok: true, type: 'workout' });
  });

  it('a photo is not allowed with a record, routine, achievement or challenge', () => {
    for (const attachment of ['record', 'routine', 'achievement', 'challenge'] as const) {
      expect(
        validatePost({ body: '', attachment, photo: PHOTO, termsAccepted: true }),
      ).toEqual({ ok: false, issues: ['photo_not_allowed'] });
    }
  });

  it('limits the text to 280 characters', () => {
    const ok = validatePost({ body: 'a'.repeat(POST_BODY_MAX), attachment: 'workout', photo: null, termsAccepted: true });
    expect(ok.ok).toBe(true);
    expect(
      validatePost({ body: 'a'.repeat(POST_BODY_MAX + 1), attachment: 'workout', photo: null, termsAccepted: true }),
    ).toEqual({ ok: false, issues: ['too_long'] });
  });

  it('reports a bad photo and the missing terms together', () => {
    expect(
      validatePost({
        body: '',
        attachment: null,
        photo: { ...PHOTO, mime: 'image/gif', sizeBytes: PHOTO_MAX_BYTES + 1 },
        termsAccepted: false,
      }),
    ).toEqual({ ok: false, issues: ['photo_type', 'terms'] });
  });

  it('validates comments: not empty, at most 500 characters, trimmed', () => {
    expect(validateComment('   ')).toEqual({ ok: false, error: 'empty' });
    expect(validateComment(' ¡Bestia! ')).toEqual({ ok: true, body: '¡Bestia!' });
    expect(validateComment('a'.repeat(COMMENT_MAX)).ok).toBe(true);
    expect(validateComment('a'.repeat(COMMENT_MAX + 1))).toEqual({ ok: false, error: 'too_long' });
  });

  it('validates reports: a reason is required, details at most 500', () => {
    expect(validateReport({ reason: null, details: '' })).toEqual({ ok: false, error: 'no_reason' });
    expect(validateReport({ reason: 'spam', details: ' ' })).toEqual({ ok: true, reason: 'spam', details: null });
    expect(validateReport({ reason: 'other', details: 'x'.repeat(501) })).toEqual({ ok: false, error: 'details_too_long' });
  });
});

describe('removed, hidden and deleted content', () => {
  const live = { deleted_at: null, hidden_at: null, removed_at: null };

  it('tells the state; deleted wins over removed, removed over hidden', () => {
    expect(contentState(live)).toBe('visible');
    expect(contentState({ ...live, hidden_at: at(5) })).toBe('hidden');
    expect(contentState({ ...live, hidden_at: at(5), removed_at: at(4) })).toBe('removed');
    expect(contentState({ ...live, removed_at: at(4), deleted_at: at(3) })).toBe('deleted');
  });

  it('lists removed and hidden as placeholders, never deleted or reported ones', () => {
    const items = [
      post('a', 1),
      post('b', 2, { removed_at: at(1) }),
      post('c', 3, { hidden_at: at(1) }),
      post('d', 4, { deleted_at: at(1) }),
      post('e', 5),
    ];
    expect(listedContent(items, new Set(['e'])).map(item => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('writes the placeholder copy', () => {
    expect(retiredCopy('removed', false).title).toBe('Contenido retirado');
    expect(retiredCopy('removed', true).body).toMatch(/Lo retiramos/);
    expect(retiredCopy('hidden', false).title).toBe('Contenido en revisión');
  });
});

describe('feed pagination', () => {
  const page = (from: number, count: number) =>
    Array.from({ length: count }, (_, index) => post(`p${from + index}`, (from + index) * 10));

  it('the cursor is the date of the last post while pages come back full', () => {
    const full = page(1, FEED_PAGE_SIZE);
    expect(nextFeedCursor(full)).toBe(full[FEED_PAGE_SIZE - 1].created_at);
  });

  it('a short or empty page is the end of the list', () => {
    expect(nextFeedCursor(page(1, FEED_PAGE_SIZE - 1))).toBeNull();
    expect(nextFeedCursor([])).toBeNull();
  });

  it('merges pages newest first without duplicates', () => {
    const first = page(1, 10);
    const second = [...page(9, 5)]; // p9 and p10 repeat
    const merged = mergeFeedPages(first, second);
    expect(merged.map(item => item.id)).toEqual(
      ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13'],
    );
    expect(new Set(merged.map(item => item.id)).size).toBe(merged.length);
  });

  it('the newest copy of a post replaces the old one', () => {
    const merged = mergeFeedPages([post('a', 5, { like_count: 1 })], [post('a', 5, { like_count: 7 })]);
    expect(merged).toHaveLength(1);
    expect(merged[0].like_count).toBe(7);
  });

  it('interleaves activity lines and keeps older ones for older pages', () => {
    const posts = [post('a', 10), post('b', 60)];
    const activity = [
      { key: 'x', createdAt: at(30), people: [], text: 'x' },
      { key: 'y', createdAt: at(300), people: [], text: 'y' },
    ];
    expect(buildFeedEntries(posts, activity, true).map(entry => entry.key)).toEqual(['a', 'x', 'b']);
    expect(buildFeedEntries(posts, activity, false).map(entry => entry.key)).toEqual(['a', 'x', 'b', 'y']);
  });
});

describe('text of the cards', () => {
  it('shows the volume of a workout, or a dash without it (BT-44)', () => {
    const base = { title: 'Pierna', duration_min: 58, exercises_done: 7, exercises_total: 7 };
    expect(workoutStats({ ...base, volume_kg: 9120 }).map(item => item.value)).toEqual(['58 min', '7', '9.120 kg']);
    expect(workoutStats(base)[2].value).toBe('—');
    expect(workoutStats({ ...base, volume_kg: null })[2].value).toBe('—');
    expect(formatKg(0)).toBe('—');
  });

  it('reads the BT-44 keys of the workout attachment as optional', () => {
    const base = { title: 'Pierna', duration_min: 58, exercises_done: 7, exercises_total: 7 };
    // Post published before BT-44: no volume, no prs_count, no top_pr.
    expect(topPrLine(base)).toBeNull();
    // Session without records.
    expect(topPrLine({ ...base, volume_kg: 9120, prs_count: 0, top_pr: null })).toBeNull();
    const pr = {
      exercise: 'Sentadilla',
      exercise_id: 'e1',
      pr_type: 'weight',
      value_weight: 165,
      value_reps: 3,
      unit: 'kg',
    };
    expect(topPrLine({ ...base, prs_count: 2, top_pr: pr })).toBe('Sentadilla · 165 kg');
    expect(
      topPrLine({ ...base, top_pr: { ...pr, value_weight: null, value_reps: 12 } }),
    ).toBe('Sentadilla · 12 reps');
    expect(
      topPrLine({ ...base, top_pr: { ...pr, value_weight: null, value_reps: null } }),
    ).toBe('Sentadilla');
  });

  it('writes the record delta only when it improved', () => {
    const record = { exercise_id: 'e', exercise_name: 'Press banca', pr_type: 'weight', value: 140, unit: 'kg', delta: 5, previous_best: 135 };
    expect(recordDeltaLine(record)).toBe('+5 kg sobre su mejor marca');
    expect(recordDeltaLine({ ...record, delta: null })).toBeNull();
  });

  it('labels the time and the comment count', () => {
    expect(timeAgo(at(0), NOW)).toBe('ahora');
    expect(timeAgo(at(50), NOW)).toBe('hace 50 min');
    expect(timeAgo(at(60 * 5), NOW)).toBe('hace 5 h');
    expect(timeAgo(at(60 * 30), NOW)).toBe('ayer');
    expect(timeAgo(at(60 * 24 * 3), NOW)).toBe('hace 3 días');
    expect(commentCountLabel(0)).toBe('Sin comentarios');
    expect(commentCountLabel(1)).toBe('1 comentario');
    expect(commentCountLabel(3)).toBe('3 comentarios');
  });

  it('groups activity: friends who trained the same day share a line', () => {
    const author = (id: string, name: string) => ({
      id, name, username: id, avatar_key: '', profile_photo_url: '', goal: '', weight: 0,
    });
    const items: ActivityItem[] = [
      { id: '1', user_id: 'c', kind: 'workout_completed', summary: { title: 'Press' }, created_at: at(30), author: author('c', 'Carlos Ruiz') },
      { id: '2', user_id: 's', kind: 'workout_completed', summary: { title: 'HIIT' }, created_at: at(40), author: author('s', 'Sofía Pérez') },
      { id: '3', user_id: 'c', kind: 'record', summary: { title: 'Press banca' }, created_at: at(20), author: author('c', 'Carlos Ruiz') },
      { id: '4', user_id: 'x', kind: 'badge', summary: { title: 'x' }, created_at: at(10), author: null },
    ];
    const lines = groupActivity(items).map(group => group.text);
    expect(lines).toContain('Carlos y Sofía entrenaron hoy');
    expect(lines).toContain('Carlos · nuevo récord');
    expect(lines).toHaveLength(2);
  });
});

describe('photoFileName', () => {
  it('names the upload by its real type', () => {
    expect(photoFileName('image/jpeg')).toBe('photo.jpg');
    expect(photoFileName('image/jpg')).toBe('photo.jpg');
    expect(photoFileName('image/png')).toBe('photo.png');
    expect(photoFileName('IMAGE/WEBP')).toBe('photo.webp');
    expect(photoFileName(null)).toBe('photo.jpg');
  });
});
