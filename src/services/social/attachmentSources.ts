import { formatKg } from '@app/features/social/postModel';
import type {
  AttachmentKind,
  AttachmentSource,
} from '@app/features/social/postTypes';
import type { SocialSettingsRow } from '@app/features/social/socialTypes';
import { getSupabaseClient } from '@app/services/supabase/client';

// What the composer can attach: the latest session, routine, record, badge or
// completed challenge of the user, or the exact one a "Compartir" button points
// to (`focus`). It only builds the preview (title and three figures); the
// server builds the real snapshot from `sourceId` in create_post.

export type AttachmentFocus = { kind: AttachmentKind; sourceId: string };

const CORE33_PREFIX = 'core33:';

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }
  return supabase;
}

const isToday = (iso: string | null) =>
  Boolean(iso) && new Date(iso as string).toDateString() === new Date().toDateString();

const dayLabel = (iso: string | null) =>
  iso && isToday(iso) ? 'hoy' : iso ? iso.slice(0, 10) : '—';

async function workoutSource(me: string, id?: string): Promise<AttachmentSource | null> {
  let query = client()
    .from('workout_sessions')
    .select('id,workout_title,duration,total_exercises,completed_exercises,volume_kg,ended_at')
    .eq('user_id', me)
    .eq('status', 'completed');
  query = id
    ? query.eq('id', id)
    : query.order('ended_at', { ascending: false, nullsFirst: false });
  const { data } = await query.limit(1).maybeSingle();
  if (!data) {
    return null;
  }
  const done = Array.isArray(data.completed_exercises)
    ? data.completed_exercises.length
    : data.total_exercises;

  // Best record of that session, for the line under the figures.
  const record = await client()
    .from('personal_records')
    .select('exercise_id,value_weight,unit')
    .eq('user_id', me)
    .eq('workout_session_id', data.id)
    .order('value_weight', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  let topRecord: AttachmentSource['record'] = null;
  if (record.data?.value_weight) {
    const exercise = await client()
      .from('exercises')
      .select('name')
      .eq('id', record.data.exercise_id)
      .maybeSingle();
    if (exercise.data) {
      topRecord = {
        exercise: exercise.data.name,
        value: record.data.value_weight,
        unit: record.data.unit ?? 'kg',
      };
    }
  }

  return {
    kind: 'workout',
    sourceId: data.id,
    over: isToday(data.ended_at) ? 'Entrenamiento de hoy' : 'Tu último entreno',
    title: data.workout_title,
    stats: [
      { value: `${data.duration ?? 0} min`, label: 'duración' },
      {
        value:
          done < data.total_exercises ? `${done} de ${data.total_exercises}` : `${done}`,
        label: 'ejercicios',
      },
      { value: formatKg(data.volume_kg), label: 'volumen' },
    ],
    record: topRecord,
  };
}

async function recordSource(me: string, id?: string): Promise<AttachmentSource | null> {
  let query = client()
    .from('personal_records')
    .select('id,exercise_id,value_weight,value_reps,unit,recorded_at')
    .eq('user_id', me);
  query = id ? query.eq('id', id) : query.order('recorded_at', { ascending: false });
  const { data } = await query.limit(1).maybeSingle();
  if (!data) {
    return null;
  }
  const exercise = await client()
    .from('exercises')
    .select('name')
    .eq('id', data.exercise_id)
    .maybeSingle();
  const unit = data.unit ?? 'kg';
  return {
    kind: 'record',
    sourceId: data.id,
    over: 'Récord personal',
    title: exercise.data?.name ?? 'Récord',
    stats: [
      {
        value: data.value_weight !== null ? `${data.value_weight} ${unit}` : `${data.value_reps ?? 0} reps`,
        label: 'mejor marca',
      },
      { value: String(data.value_reps ?? 1), label: 'rep' },
      { value: dayLabel(data.recorded_at), label: 'fecha' },
    ],
  };
}

async function routineSource(me: string, id?: string): Promise<AttachmentSource | null> {
  // Shareable: created by the user, not a copy and not made by ELLIE.
  let query = client()
    .from('workout_templates')
    .select('id,title,duration,difficulty')
    .eq('created_by', me)
    .is('copied_from_post_id', null)
    .not('created_by_ai', 'is', true);
  query = id ? query.eq('id', id) : query.order('created_at', { ascending: false });
  const { data } = await query.limit(1).maybeSingle();
  if (!data) {
    return null;
  }
  return {
    kind: 'routine',
    sourceId: data.id,
    over: 'Tu rutina',
    title: data.title,
    stats: [
      { value: `${data.duration} min`, label: 'duración' },
      { value: data.difficulty, label: 'nivel' },
    ],
  };
}

async function achievementSource(me: string, id?: string): Promise<AttachmentSource | null> {
  const supabase = client();
  // Core 33 completed: `core33:<participation_id>`.
  if (id?.startsWith(CORE33_PREFIX)) {
    return {
      kind: 'achievement',
      sourceId: id,
      over: 'Logro',
      title: 'Core 33 completado',
      stats: [{ value: '33 días', label: 'completado' }],
    };
  }
  let query = supabase.from('user_badges').select('badge_id,earned_at').eq('user_id', me);
  query = id ? query.eq('badge_id', id) : query.order('earned_at', { ascending: false });
  const { data } = await query.limit(1).maybeSingle();
  if (!data) {
    return null;
  }
  const badge = await supabase
    .from('badges')
    .select('title')
    .eq('id', data.badge_id)
    .maybeSingle();
  return {
    kind: 'achievement',
    sourceId: data.badge_id,
    over: 'Logro',
    title: badge.data?.title ?? 'Logro',
    stats: [{ value: dayLabel(data.earned_at), label: 'conseguido' }],
  };
}

async function challengeSource(id?: string): Promise<AttachmentSource | null> {
  const { data } = await client().rpc('get_my_challenges');
  const body = data as { recently_completed?: unknown } | null;
  const list = Array.isArray(body?.recently_completed) ? body.recently_completed : [];
  const rows = list as {
    id?: string;
    title?: string;
    goal?: number;
    my_progress?: number;
    points?: number;
    final_rank_among_friends?: number | null;
  }[];
  const row = id ? rows.find(item => item.id === id) : rows[0];
  if (!row?.id || !row.title) {
    return null;
  }
  return {
    kind: 'challenge',
    sourceId: row.id,
    over: 'Reto',
    title: row.title,
    stats: [
      { value: `${row.my_progress ?? 0} / ${row.goal ?? 0}`, label: 'progreso' },
      {
        value: row.final_rank_among_friends ? `${row.final_rank_among_friends}.º` : '—',
        label: 'puesto',
      },
      { value: row.points ? String(row.points) : '—', label: 'puntos' },
    ],
  };
}

const BUILDERS: Record<
  AttachmentKind,
  (me: string, id?: string) => Promise<AttachmentSource | null>
> = {
  workout: workoutSource,
  routine: routineSource,
  record: recordSource,
  achievement: achievementSource,
  challenge: (_me, id) => challengeSource(id),
};

// The `share_*` switch that turns each kind off (the composer does not offer it).
function blockedBy(kind: AttachmentKind, settings: SocialSettingsRow | null): boolean {
  return (
    (kind === 'workout' && settings?.share_workouts === false) ||
    (kind === 'record' && settings?.share_records === false) ||
    (kind === 'achievement' && settings?.share_achievements === false) ||
    (kind === 'routine' && settings?.share_routines === false)
  );
}

export async function loadAttachmentSources(
  me: string,
  settings: SocialSettingsRow | null,
  focus?: AttachmentFocus,
): Promise<AttachmentSource[]> {
  const kinds = Object.keys(BUILDERS) as AttachmentKind[];
  const sources = await Promise.all(
    kinds.map(kind =>
      BUILDERS[kind](me, focus?.kind === kind ? focus.sourceId : undefined)
        // The latest one when the focused item cannot be read.
        .then(source => source ?? (focus?.kind === kind ? BUILDERS[kind](me) : null))
        .catch(() => null),
    ),
  );
  return sources
    .filter((source): source is AttachmentSource => source !== null)
    .map(source => ({ ...source, blockedByPrivacy: blockedBy(source.kind, settings) }));
}
