import type {
  ActivityItem,
  AttachmentSource,
  FeedComment,
  FeedPost,
  PostAttachment,
  PostType,
} from '@app/features/social/postTypes';
import type {
  RelationshipState,
  SocialProfileRow,
} from '@app/features/social/socialTypes';
import type { FixturePerson } from '@app/dev/socialFixtures';

// Sample posts, comments, activity and attachment sources of Comunidad ·
// tanda A. Row types are the ones of `types/supabase.ts`; nothing is read from
// or written to the backend. Photos are app assets referenced as `fx://<key>`
// (the real ones are `social-photos` paths, signed on demand).

const HOUR = 3_600_000;
const DAY = 86_400_000;

function profileRow(person: FixturePerson): SocialProfileRow {
  return person.profile;
}

type PostSeed = {
  id: string;
  who: string; // key of `people`, or 'me'
  type: PostType;
  ago: number;
  body?: string;
  photo?: string;
  attachment: PostAttachment | null;
  likes: number;
  comments: number;
  likedByMe?: boolean;
};

export type PostFixtureSet = {
  posts: FeedPost[];
  comments: FeedComment[];
  activity: ActivityItem[];
  sources: AttachmentSource[];
};

const PHOTO_SIZE: Record<string, { w: number; h: number }> = {
  'fx://barra-mujer': { w: 1200, h: 1500 },
  'fx://hero-entreno': { w: 1200, h: 1500 },
  'fx://overhead': { w: 1200, h: 1500 },
};

export function buildPostFixtures(
  now: Date,
  people: Record<string, FixturePerson>,
  me: SocialProfileRow,
  options: { short?: boolean; retired?: boolean; empty?: boolean } = {},
): PostFixtureSet {
  const t = now.getTime();
  const iso = (ago: number) => new Date(t - ago).toISOString();
  const authorOf = (who: string): SocialProfileRow =>
    who === 'me' ? me : profileRow(people[who]);
  const relationOf = (who: string): RelationshipState =>
    who === 'me' ? 'self' : who === 'irene' ? 'none' : 'friends';

  const seeds: PostSeed[] = [
    {
      id: 'fx-p1', who: 'carlos', type: 'record', ago: 1 * HOUR,
      body: 'Por fin. Llevaba tres semanas atascado en 135.',
      attachment: {
        exercise_id: 'fx-ex-bench', exercise_name: 'Press banca', pr_type: 'weight',
        value: 140, unit: 'kg', delta: 5, previous_best: 135,
      },
      likes: 26, comments: 3,
    },
    {
      id: 'fx-p2', who: 'andrea', type: 'workout', ago: 2 * HOUR,
      body: 'Hoy tocaba pierna y no hubo excusas.', photo: 'fx://barra-mujer',
      attachment: {
        title: 'Pierna completa', duration_min: 58, exercises_done: 7,
        exercises_total: 7, workout_type: 'strength', calories: 480, volume_kg: 9120,
        prs_count: 1,
        top_pr: {
          exercise: 'Sentadilla', exercise_id: 'fx-ex-squat', pr_type: 'weight',
          value_weight: 165, value_reps: 3, unit: 'kg',
        },
      },
      likes: 18, comments: 4, likedByMe: true,
    },
    {
      id: 'fx-p3', who: 'mateo', type: 'routine', ago: 5 * HOUR,
      body: 'Mi push de los martes. Probadla y me contáis.',
      attachment: {
        title: 'Push Day', difficulty: 'Intermedio', duration_min: 52, type: 'strength',
        exercises: [
          { exercise_id: 'e1', name: 'Press de banca con barra', sets: 4, reps: '8', sort_order: 1 },
          { exercise_id: 'e2', name: 'Press inclinado con mancuernas', sets: 3, reps: '10', sort_order: 2 },
          { exercise_id: 'e3', name: 'Fondos en paralelas', sets: 3, reps: '12', sort_order: 3 },
          { exercise_id: 'e4', name: 'Press militar', sets: 3, reps: '10', sort_order: 4 },
          { exercise_id: 'e5', name: 'Elevaciones laterales', sets: 3, reps: '15', sort_order: 5 },
          { exercise_id: 'e6', name: 'Extensión de tríceps en polea', sets: 3, reps: '12', sort_order: 6 },
        ],
      },
      likes: 31, comments: 6,
    },
    {
      id: 'fx-p4', who: 'lucia', type: 'achievement', ago: 26 * HOUR,
      attachment: { title: 'Core 33', kind: 'core33', days_completed: 33 },
      likes: 44, comments: 12,
    },
    {
      id: 'fx-p5', who: 'sofia', type: 'workout', ago: 28 * HOUR,
      body: 'Corto pero intenso.',
      // A session without sets: volume_kg is null (the card shows "—") and no record (BT-44).
      attachment: {
        title: 'HIIT de 20', duration_min: 22, exercises_done: 5,
        exercises_total: 5, workout_type: 'hiit', calories: 210, volume_kg: null,
        prs_count: 0, top_pr: null,
      },
      likes: 12, comments: 2,
    },
    {
      id: 'fx-p6', who: 'mateo', type: 'challenge', ago: 3 * DAY,
      body: 'Esta semana tocaba apretar.',
      attachment: {
        title: '4 entrenamientos esta semana', metric: 'workouts', goal: 4,
        final_value: 4, rank_among_friends: 1, points: 0,
      },
      likes: 15, comments: 1,
    },
    {
      id: 'fx-p7', who: 'me', type: 'workout', ago: 2 * DAY + 3 * HOUR,
      body: 'Total Body Dumbbell. Buen ritmo.',
      attachment: {
        title: 'Total Body Dumbbell', duration_min: 42, exercises_done: 6,
        exercises_total: 6, workout_type: 'strength', calories: 330, volume_kg: 6480,
        // Published before BT-44: no prs_count / top_pr keys.
      },
      likes: 9, comments: 2,
    },
  ];

  // Older posts, so the feed has several pages.
  const older: PostSeed[] = options.short
    ? []
    : Array.from({ length: 26 }, (_, index) => {
        const who = ['carlos', 'andrea', 'mateo', 'lucia', 'sofia'][index % 5];
        const type: PostType = (['workout', 'record', 'workout', 'achievement'] as const)[index % 4];
        const attachment: PostAttachment =
          type === 'record'
            ? { exercise_id: 'x', exercise_name: 'Sentadilla', pr_type: 'weight', value: 100 + index, unit: 'kg', delta: 2, previous_best: 98 + index }
            : type === 'achievement'
            ? { title: `Racha de ${7 + index} días`, days_completed: undefined }
            : {
                title: ['Fuerza · tren superior', 'Movilidad esencial', 'HIIT de 30'][index % 3],
                duration_min: 30 + index, exercises_done: 5, exercises_total: 5,
                workout_type: 'strength', calories: 250, volume_kg: 3000 + index * 40,
              };
        return {
          id: `fx-old-${index + 1}`, who, type,
          ago: (4 + index) * DAY, attachment, likes: index % 9, comments: index % 4,
          body: index % 3 === 0 ? 'Otro día, otro paso.' : undefined,
        } as PostSeed;
      });

  const toPost = (seed: PostSeed): FeedPost => {
    const size = seed.photo ? PHOTO_SIZE[seed.photo] : null;
    return {
      id: seed.id,
      author_id: authorOf(seed.who).id,
      type: seed.type,
      body: seed.body ?? null,
      audience: 'friends',
      photo_path: seed.photo ?? null,
      photo_width: size?.w ?? null,
      photo_height: size?.h ?? null,
      like_count: seed.likes,
      comment_count: seed.comments,
      created_at: iso(seed.ago),
      edited_at: null,
      deleted_at: null,
      hidden_at: null,
      removed_at: null,
      attachment: seed.attachment,
      liked_by_me: Boolean(seed.likedByMe),
      author: authorOf(seed.who),
      relationship: relationOf(seed.who),
    };
  };

  let posts = options.empty ? [] : [...seeds, ...older].map(toPost);

  if (options.retired && !options.empty) {
    const removed = toPost({
      id: 'fx-removed', who: 'carlos', type: 'workout', ago: 30 * 60_000,
      body: 'Texto del contenido retirado.',
      attachment: { title: 'x', duration_min: 1, exercises_done: 1, exercises_total: 1 },
      likes: 0, comments: 0,
    });
    removed.removed_at = iso(10 * 60_000);
    const hidden = toPost({
      id: 'fx-hidden', who: 'andrea', type: 'workout', ago: 45 * 60_000,
      body: 'Texto del contenido oculto.',
      attachment: { title: 'x', duration_min: 1, exercises_done: 1, exercises_total: 1 },
      likes: 0, comments: 0,
    });
    hidden.hidden_at = iso(20 * 60_000);
    posts = [removed, hidden, ...posts];
  }

  const comment = (
    id: string, postId: string, who: string, ago: number, body: string,
  ): FeedComment => ({
    id, post_id: postId, author_id: authorOf(who).id, body,
    created_at: iso(ago), deleted_at: null, hidden_at: null, removed_at: null,
    author: authorOf(who), relationship: relationOf(who),
  });
  const comments: FeedComment[] = [
    comment('fx-c1', 'fx-p1', 'andrea', 50 * 60_000, '¡Qué bestia! Ahora a por los 145.'),
    comment('fx-c2', 'fx-p1', 'mateo', 40 * 60_000, 'Esa pausa abajo se nota. Enhorabuena.'),
    comment('fx-c3', 'fx-p1', 'sofia', 20 * 60_000, 'Tres semanas bien invertidas.'),
    comment('fx-c4', 'fx-p2', 'carlos', 90 * 60_000, 'Pierna es pierna. Respeto.'),
    comment('fx-c5', 'fx-p2', 'irene', 60 * 60_000, '¿Qué rutina sigues? Me interesa.'),
    comment('fx-c6', 'fx-p2', 'andrea', 50 * 60_000, 'La de Mateo, ajustada. Te la paso.'),
    comment('fx-c7', 'fx-p2', 'lucia', 30 * 60_000, 'Esa foto lo dice todo.'),
    comment('fx-c8', 'fx-p7', 'carlos', 40 * 3_600_000, 'Buen ritmo, sí.'),
  ];

  const act = (
    id: string, who: string, kind: string, title: string, ago: number,
  ): ActivityItem => ({
    id, user_id: authorOf(who).id, kind, summary: { title },
    created_at: iso(ago), author: authorOf(who),
  });
  const activity: ActivityItem[] = [
    act('fx-a1', 'carlos', 'workout_completed', 'Press banca', 2.5 * HOUR),
    act('fx-a2', 'sofia', 'workout_completed', 'HIIT', 2.7 * HOUR),
    act('fx-a3', 'mateo', 'streak', 'Racha de 9 días', 20 * HOUR),
    act('fx-a4', 'lucia', 'core33_completed', 'Core 33', 30 * HOUR),
  ];

  const sources: AttachmentSource[] = [
    {
      kind: 'workout', sourceId: 'fx-session-1', over: 'Entrenamiento de hoy',
      title: 'Total Body Dumbbell',
      stats: [
        { value: '42 min', label: 'duración' },
        { value: '6 de 6', label: 'ejercicios' },
        { value: '6.480 kg', label: 'volumen' },
      ],
      record: { exercise: 'Peso muerto rumano', value: 100, unit: 'kg' },
    },
    {
      kind: 'routine', sourceId: 'fx-routine-1', over: 'Tu rutina',
      title: 'Full body del viernes',
      stats: [
        { value: '45 min', label: 'duración' },
        { value: '6', label: 'ejercicios' },
        { value: 'Intermedio', label: 'nivel' },
      ],
    },
    {
      kind: 'record', sourceId: 'fx-pr-1', over: 'Récord personal',
      title: 'Peso muerto rumano',
      stats: [
        { value: '100 kg', label: 'mejor marca' },
        { value: '1', label: 'rep' },
        { value: 'hoy', label: 'fecha' },
      ],
    },
    {
      kind: 'achievement', sourceId: 'fx-badge-1', over: 'Logro',
      title: 'Racha de 7 días',
      stats: [
        { value: '7 días', label: 'racha' },
        { value: '4.860', label: 'puntos' },
        { value: '9', label: 'logros' },
      ],
    },
    {
      kind: 'challenge', sourceId: 'fx-challenge-1', over: 'Reto',
      title: '4 entrenamientos esta semana',
      stats: [
        { value: '3 / 4', label: 'progreso' },
        { value: '2 días', label: 'restantes' },
        { value: '—', label: 'puntos' },
      ],
    },
  ];

  return { posts, comments, activity, sources };
}
