import {
  isDuplicate,
  isNotAuthenticated,
  isUnavailable,
  isValidationError,
  parseActivityItems,
  parseAttachment,
  parseFeedPage,
  parseFeedPost,
  toFeedComments,
  withActivityAuthors,
} from '../src/features/social/feedMappers';
import {
  mergeFeedPages,
  settleLike,
  toggleLikeState,
  topPrLine,
  workoutStats,
} from '../src/features/social/postModel';
import { activityLine } from '../src/features/social/socialModel';
import type {
  AchievementAttachment,
  RecordAttachment,
  RoutineAttachment,
  WorkoutAttachment,
} from '../src/features/social/postTypes';

const ME = 'me';

function row(id: string, createdAt: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    author_id: 'ana',
    type: 'photo',
    body: 'Hola',
    photo_path: 'ana/post/a.jpg',
    photo_width: 1080,
    photo_height: 1350,
    audience: 'friends',
    attachment: null,
    like_count: 3,
    comment_count: 1,
    created_at: createdAt,
    edited_at: null,
    liked_by_me: true,
    author: { username: 'ana', name: 'Ana', avatar_key: 'lion', profile_photo_url: 'ana/avatar' },
    ...extra,
  };
}

describe('feed pagination and deduplication', () => {
  it('maps a page newest first and ignores rows that are not posts', () => {
    const page = parseFeedPage(
      [
        row('a', '2026-10-05T10:00:00Z'),
        row('b', '2026-10-07T10:00:00Z'),
        { id: 'broken' },
        row('c', '2026-10-06T10:00:00Z', { type: 'unknown' }),
      ],
      ME,
      10,
    );
    expect(page.posts.map(post => post.id)).toEqual(['b', 'a']);
    expect(page.nextCursor).toBeNull();
  });

  it('removes duplicated ids inside a page, the last copy wins', () => {
    const page = parseFeedPage(
      [
        row('a', '2026-10-07T10:00:00Z', { like_count: 1 }),
        row('a', '2026-10-07T10:00:00Z', { like_count: 9 }),
      ],
      ME,
      10,
    );
    expect(page.posts).toHaveLength(1);
    expect(page.posts[0].like_count).toBe(9);
  });

  it('gives the created_at of the last row as the cursor of a full page', () => {
    const rows = [
      row('a', '2026-10-07T10:00:00Z'),
      row('b', '2026-10-06T10:00:00Z'),
      row('c', '2026-10-05T10:00:00Z'),
    ];
    expect(parseFeedPage(rows, ME, 3).nextCursor).toBe('2026-10-05T10:00:00Z');
    // A short page is the end of the list.
    expect(parseFeedPage(rows, ME, 10).nextCursor).toBeNull();
    // The cursor follows what the server sent even if the last row is unreadable.
    expect(
      parseFeedPage([...rows.slice(0, 2), { id: 'x', created_at: '2026-10-04T10:00:00Z' }], ME, 3)
        .nextCursor,
    ).toBe('2026-10-04T10:00:00Z');
    expect(parseFeedPage([], ME, 10)).toEqual({ posts: [], nextCursor: null });
    expect(parseFeedPage(null, ME, 10)).toEqual({ posts: [], nextCursor: null });
  });

  it('does not repeat a post that moved between two pages', () => {
    const first = parseFeedPage(
      [row('a', '2026-10-07T10:00:00Z'), row('b', '2026-10-06T10:00:00Z')],
      ME,
      2,
    );
    // Next call with _before = created_at of b: b comes again plus an older one.
    const second = parseFeedPage(
      [row('b', '2026-10-06T10:00:00Z', { like_count: 8 }), row('c', '2026-10-05T10:00:00Z')],
      ME,
      2,
    );
    const merged = mergeFeedPages(first.posts, second.posts);
    expect(merged.map(post => post.id)).toEqual(['a', 'b', 'c']);
    expect(merged[1].like_count).toBe(8);
  });

  it('keeps the author, the photo size and the relationship', () => {
    const own = parseFeedPost(row('a', '2026-10-07T10:00:00Z', { author_id: ME }), ME);
    expect(own?.relationship).toBe('self');
    const friend = parseFeedPost(row('b', '2026-10-07T10:00:00Z'), ME);
    expect(friend).toMatchObject({
      relationship: 'friends',
      photo_width: 1080,
      photo_height: 1350,
      liked_by_me: true,
      deleted_at: null,
    });
    expect(friend?.author).toMatchObject({ id: 'ana', name: 'Ana', profile_photo_url: 'ana/avatar' });
    // No author block and no photo: nothing breaks.
    expect(
      parseFeedPost(row('c', '2026-10-07T10:00:00Z', { author: undefined, photo_path: null }), ME),
    ).toMatchObject({ author: null, photo_path: null });
    expect(parseFeedPost(null, ME)).toBeNull();
  });
});

describe('optimistic like', () => {
  const state = { liked: false, count: 4 };

  it('shows the like at once and removes it on the second tap', () => {
    expect(toggleLikeState(state)).toEqual({ liked: true, count: 5 });
    expect(toggleLikeState({ liked: true, count: 5 })).toEqual({ liked: false, count: 4 });
    expect(toggleLikeState({ liked: true, count: 0 }).count).toBe(0);
  });

  it('keeps the server figures when they come back', () => {
    expect(settleLike(state, { liked: true, count: 7 })).toEqual({ liked: true, count: 7 });
  });

  it('keeps its own count when the server count could not be read', () => {
    expect(settleLike(state, { liked: true, count: null })).toEqual({ liked: true, count: 5 });
    expect(settleLike({ liked: true, count: 5 }, { liked: false, count: null })).toEqual({
      liked: false,
      count: 4,
    });
  });

  it('goes back to the previous state when the request fails', () => {
    expect(settleLike(state, null)).toBe(state);
  });
});

describe('attachments by post type', () => {
  it('workout: BT-44 keys are optional (old posts) and null is kept', () => {
    const old = parseAttachment('workout', {
      title: 'Pierna',
      duration_min: 58,
      exercises_done: 7,
      exercises_total: 7,
      calories: 480,
    }) as WorkoutAttachment;
    expect(old).not.toHaveProperty('volume_kg');
    expect(old).not.toHaveProperty('prs_count');
    expect(old).not.toHaveProperty('top_pr');
    expect(workoutStats(old)[2].value).toBe('—');
    expect(topPrLine(old)).toBeNull();

    const fresh = parseAttachment('workout', {
      title: 'Push Day',
      duration_min: 45,
      exercises_done: 5,
      exercises_total: 6,
      workout_type: 'strength',
      calories: 320,
      volume_kg: 6000,
      prs_count: 2,
      top_pr: {
        exercise: 'Press banca',
        exercise_id: 'e1',
        pr_type: 'max_weight',
        value_weight: 80,
        value_reps: null,
        unit: 'kg',
      },
    }) as WorkoutAttachment;
    expect(fresh.volume_kg).toBe(6000);
    expect(fresh.prs_count).toBe(2);
    expect(topPrLine(fresh)).toBe('Press banca · 80 kg');

    const noSets = parseAttachment('workout', {
      title: 'HIIT',
      duration_min: 20,
      exercises_done: 4,
      exercises_total: 4,
      volume_kg: null,
      prs_count: 0,
      top_pr: null,
    }) as WorkoutAttachment;
    expect(noSets.volume_kg).toBeNull();
    expect(noSets.top_pr).toBeNull();
    expect(workoutStats(noSets)[2].value).toBe('—');
  });

  it('record: weight and reps, previous best and delta', () => {
    expect(
      parseAttachment('record', {
        exercise_id: 'e1',
        exercise_name: 'Sentadilla',
        pr_type: 'max_weight',
        value: 165,
        reps: 3,
        unit: 'kg',
        previous_best: 160,
        delta: 5,
      }),
    ).toEqual({
      exercise_id: 'e1',
      exercise_name: 'Sentadilla',
      pr_type: 'max_weight',
      value: 165,
      unit: 'kg',
      delta: 5,
      previous_best: 160,
      reps: 3,
    } satisfies RecordAttachment);
    expect(parseAttachment('record', { exercise_name: 'Sentadilla' })).toBeNull();
  });

  it('routine: exercises with numeric or text reps, in order', () => {
    const routine = parseAttachment('routine', {
      title: 'Push Day',
      difficulty: 'Intermedio',
      duration_min: 52,
      type: 'strength',
      exercises: [
        { exercise_id: 'e1', name: 'Press banca', sets: 4, reps: '8-10', sort_order: 1 },
        { exercise_id: 'e2', name: 'Fondos', sets: 3, reps: 12 },
        { sets: 3 },
      ],
    }) as RoutineAttachment;
    expect(routine.exercises).toHaveLength(2);
    expect(routine.exercises[0].reps).toBe('8-10');
    expect(routine.exercises[1]).toMatchObject({ reps: '12', sort_order: 2 });
    expect(parseAttachment('routine', { title: 'Sin lista' })).toBeNull();
  });

  it('achievement: a badge and Core 33 completed', () => {
    expect(
      parseAttachment('achievement', { badge_id: 'first_workout', title: 'Primer entreno', icon: 'medal' }),
    ).toEqual({ badge_id: 'first_workout', title: 'Primer entreno', icon: 'medal' });
    expect(
      parseAttachment('achievement', { kind: 'core33', days_completed: 33 }) as AchievementAttachment,
    ).toMatchObject({ kind: 'core33', days_completed: 33 });
    expect(parseAttachment('achievement', {})).toBeNull();
  });

  it('challenge: rank, final value and points', () => {
    expect(
      parseAttachment('challenge', {
        title: '100 dominadas',
        metric: 'exercise_reps',
        goal: 100,
        final_value: 104,
        rank_among_friends: 1,
        badge_id: 'b1',
        points: 50,
      }),
    ).toEqual({
      title: '100 dominadas',
      metric: 'exercise_reps',
      goal: 100,
      final_value: 104,
      rank_among_friends: 1,
      points: 50,
      badge_id: 'b1',
    });
    expect(parseAttachment('challenge', { title: 'x', rank_among_friends: null })).toMatchObject({
      rank_among_friends: null,
    });
  });

  it('photo posts and unreadable attachments are null', () => {
    expect(parseAttachment('photo', null)).toBeNull();
    expect(parseAttachment('photo', { title: 'ignored' })).toBeNull();
    expect(parseAttachment('workout', 'texto')).toBeNull();
    expect(parseAttachment('workout', {})).toBeNull();
  });
});

describe('friend activity', () => {
  const data = [
    {
      id: 'x1',
      user_id: 'ana',
      kind: 'workout_completed',
      summary: { title: 'Push Day', duration_min: 45 },
      created_at: '2026-10-07T17:00:00Z',
      user: { username: 'ana', name: 'Ana', avatar_key: 'lion' },
    },
    {
      id: 'x2',
      user_id: 'bruno',
      kind: 'core33_completed',
      summary: {},
      created_at: '2026-10-06T17:00:00Z',
      user: { username: 'bruno', name: 'Bruno', avatar_key: 'bear' },
    },
    { kind: 'record' },
  ];

  it('keeps the summary fields of each kind', () => {
    const items = parseActivityItems(data);
    expect(items).toHaveLength(2);
    expect(items[0].summary).toEqual({ title: 'Push Day', duration_min: 45 });
    expect(items[1].summary).toEqual({ title: '' });
    expect(activityLine(items[0], new Date('2026-10-07T20:00:00Z'))).toBe(
      'Entrenó hoy · Push Day · 45 min',
    );
    expect(activityLine(items[1])).toBe('Terminó Core 33');
  });

  it('completes the author with the profile (photo) or the activity user block', () => {
    const items = parseActivityItems(data);
    const profiles = new Map([
      [
        'ana',
        {
          id: 'ana',
          username: 'ana',
          name: 'Ana',
          avatar_key: 'lion',
          profile_photo_url: 'ana/avatar',
          goal: '',
          weight: 0,
        },
      ],
    ]);
    const withAuthors = withActivityAuthors(items, profiles, data);
    expect(withAuthors[0].author?.profile_photo_url).toBe('ana/avatar');
    // No profile row: the `user` block of the activity (no photo).
    expect(withAuthors[1].author).toMatchObject({ id: 'bruno', name: 'Bruno', profile_photo_url: '' });
  });
});

describe('comments and error codes', () => {
  it('maps comment rows with the relationship of each author', () => {
    const base = { post_id: 'p', deleted_at: null, hidden_at: null, removed_at: null };
    const comments = toFeedComments(
      [
        { ...base, id: 'c1', author_id: ME, body: 'Mío', created_at: '1' },
        { ...base, id: 'c2', author_id: 'ana', body: 'Amiga', created_at: '2' },
        { ...base, id: 'c3', author_id: 'zoe', body: 'Desconocida', created_at: '3' },
      ],
      new Map(
        ['ana', 'zoe'].map(id => [
          id,
          { id, username: id, name: id, avatar_key: '', profile_photo_url: `${id}/avatar`, goal: '', weight: 0 },
        ]),
      ),
      ME,
      new Set(['ana']),
    );
    expect(comments.map(comment => comment.relationship)).toEqual(['self', 'friends', 'none']);
    // DA-119: the photo path is only kept for friends.
    expect(comments[1].author?.profile_photo_url).toBe('ana/avatar');
    expect(comments[2].author?.profile_photo_url).toBe('');
    expect(comments[0].author).toBeNull();
  });

  it('classifies the codes of the W3 writes', () => {
    expect(isUnavailable({ code: '42501' })).toBe(true);
    expect(isUnavailable({ code: '23514' })).toBe(false);
    expect(isValidationError({ code: '23514' })).toBe(true);
    expect(isDuplicate({ code: '23505' })).toBe(true);
    expect(isNotAuthenticated({ message: 'not_authenticated' })).toBe(true);
    expect(isNotAuthenticated(null)).toBe(false);
  });
});
