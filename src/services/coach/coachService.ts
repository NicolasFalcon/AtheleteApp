import { getSupabaseClient } from '@app/services/supabase/client';

// ATHELETE Coach (contract coach-1, docs/backend/COACH_SHAPES.md; the section
// "Implementación real" wins). Every call goes through a SECURITY DEFINER RPC
// with the user's JWT; the app never reads the coach tables. Answers are
// `{ ok: true, ... }` or `{ ok: false, error: "<code>" }`. Optional fields
// the contract does not show with an example are read tolerantly.

export type CoachErrorCode =
  | 'not_coach'
  | 'not_found'
  | 'invalid_code'
  | 'own_code'
  | 'coach_full'
  | 'already_linked'
  | 'nutrition_not_shared'
  | 'link_not_active'
  // coach_assign_nutrition (stable codes, COACH_SHAPES §3 / §10).
  | 'kcal_out_of_range'
  | 'macros_mismatch'
  | 'below_safety_min'
  | 'invalid_targets'
  | 'invalid_input'
  | 'unauthorized'
  | 'offline'
  | 'unknown';

const KNOWN_CODES: readonly CoachErrorCode[] = [
  'not_coach',
  'not_found',
  'invalid_code',
  'own_code',
  'coach_full',
  'already_linked',
  'nutrition_not_shared',
  'link_not_active',
  'kcal_out_of_range',
  'macros_mismatch',
  'below_safety_min',
  'invalid_targets',
  'invalid_input',
  'unauthorized',
];

export class CoachError extends Error {
  code: CoachErrorCode;
  // The raw code of the server (also when the app does not know it).
  raw: string | null;
  field: string | null;
  constructor(code: CoachErrorCode, extra: { raw?: string | null; field?: string | null; message?: string } = {}) {
    super(extra.message ?? extra.raw ?? code);
    this.name = 'CoachError';
    this.code = code;
    this.raw = extra.raw ?? null;
    this.field = extra.field ?? null;
  }
}

// ── Shapes ──────────────────────────────────────────────────────────────────

export type CoachShares = { training: boolean; nutrition: boolean; body: boolean };

export type CoachPerson = { id: string | null; name: string; avatar: string | null; bio: string | null };

export type MacroTargets = { kcal: number; protein: number; carbs: number; fat: number };

export type NutritionTargetsInput =
  | { mode: 'same'; same: MacroTargets }
  | { mode: 'train_rest'; train: MacroTargets; rest: MacroTargets };

export type NutritionAssignmentStatus = 'pending' | 'accepted' | 'declined' | 'replaced' | 'ended';

export type CoachNutritionAssignment = {
  assignmentId: string;
  mode: 'same' | 'train_rest';
  // Always both: with mode 'same' train = rest.
  train: MacroTargets;
  rest: MacroTargets;
  note: string | null;
  status: NutritionAssignmentStatus;
  createdAt: string | null;
};

export type CoachRoutineAssignment = {
  assignmentId: string;
  studentTemplateId: string | null;
  title: string;
  days: number[];
  daySplit: Record<string, string> | null;
  startDate: string | null;
  weeks: number | null;
  note: string | null;
  routineFocus: string | null;
};

// nutrition_status of each student: not_shared wins when share_nutrition is
// off; else the latest assignment (pending / accepted / declined) or none.
export type CoachNutritionStatus = 'none' | 'pending' | 'accepted' | 'declined' | 'not_shared';

export type CoachStudentItem = {
  linkId: string;
  status: 'pending' | 'active' | 'ended';
  name: string;
  avatar: string | null;
  shares: CoachShares;
  nutritionStatus: CoachNutritionStatus;
  routine: { title: string; daysPerWeek: number } | null;
  week: { done: number; planned: number };
  lastSessionAt: string | null;
  daysInactive: number | null;
  flags: string[];
  // invite_created_at: only for pending links ("Código enviado hace…").
  inviteCreatedAt: string | null;
};

export type CoachStudentList = {
  stats: { students: number; max: number; withRoutine: number; withNutrition: number };
  students: CoachStudentItem[];
};

export type CoachWeekDay = {
  date: string;
  planned: boolean;
  done: boolean;
  missed: boolean;
  routineId: string | null;
};

export type CoachLastSession = {
  id: string | null;
  title: string;
  date: string | null;
  duration: number | null;
  rating: number | null;
  ratingNote: string | null;
};

// sfb-1 discomfort: `body_zone` ('rodilla' or 'knee'…), the student's note
// and when it was logged.
export type CoachDiscomfort = { zone: string; note: string | null; date: string | null };

export type CoachBody =
  | { locked: true }
  | {
      locked: false;
      // nut_weight_trend: last weight and the change over the points (4 weeks).
      weight: { current: number | null; change: number | null; points: number[] } | null;
      // sleep.avg_7_min (minutes) → hours.
      sleep: { avgHours: number | null } | null;
    };

export type CoachStudentDetail = {
  linkId: string;
  status: 'pending' | 'active' | 'ended';
  endedAt: string | null;
  inviteCode: string | null;
  profile: { name: string; avatar: string | null; level: string | null; goal: string | null };
  shares: CoachShares;
  week: {
    weekStart: string | null;
    days: CoachWeekDay[];
    adherencePct: number | null;
    lastSession: CoachLastSession | null;
  };
  routine: CoachRoutineAssignment | null;
  nutrition: { locked: true } | { locked: false; assignment: CoachNutritionAssignment | null };
  body: CoachBody;
  // Recent discomforts (last 14 days): body.discomforts, so only with
  // share_body (null when Peso y sueño is locked).
  discomforts: CoachDiscomfort[] | null;
};

export type StudentCoach = {
  coach: CoachPerson | null;
  linkId: string | null;
  since: string | null;
  shares: CoachShares;
  routineAssignment: CoachRoutineAssignment | null;
  nutritionAssignment: CoachNutritionAssignment | null;
};

export type CoachInvite = { code: string; url: string };

// ── Parsing ─────────────────────────────────────────────────────────────────

type Raw = Record<string, unknown>;
const rec = (value: unknown): Raw | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : null;
const str = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null);
const num = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
};
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const bool = (value: unknown): boolean => value === true;

export function parseShares(value: unknown): CoachShares {
  const r = rec(value) ?? {};
  return { training: true, nutrition: bool(r.nutrition), body: bool(r.body) };
}

export function parseMacroTargets(value: unknown): MacroTargets {
  const r = rec(value) ?? {};
  return {
    kcal: num(r.kcal) ?? 0,
    protein: num(r.protein_g ?? r.protein ?? r.p) ?? 0,
    carbs: num(r.carbs_g ?? r.carbs ?? r.c) ?? 0,
    fat: num(r.fat_g ?? r.fat ?? r.g) ?? 0,
  };
}

const NUTRITION_STATUSES: readonly NutritionAssignmentStatus[] = [
  'pending',
  'accepted',
  'declined',
  'replaced',
  'ended',
];

export function parseNutritionAssignment(value: unknown): CoachNutritionAssignment | null {
  const r = rec(value);
  const id = str(r?.assignment_id) ?? str(r?.id);
  if (!r || !id) {
    return null;
  }
  const targets = rec(r.targets) ?? {};
  const mode = r.mode === 'train_rest' ? 'train_rest' : 'same';
  const train = mode === 'train_rest' ? parseMacroTargets(targets.train) : parseMacroTargets(targets);
  const rest = mode === 'train_rest' ? parseMacroTargets(targets.rest) : train;
  return {
    assignmentId: id,
    mode,
    train,
    rest,
    note: str(r.note),
    status: NUTRITION_STATUSES.find(item => item === r.status) ?? 'pending',
    createdAt: str(r.created_at),
  };
}

export function parseRoutineAssignment(value: unknown): CoachRoutineAssignment | null {
  const r = rec(value);
  const id = str(r?.assignment_id) ?? str(r?.id);
  if (!r || !id) {
    return null;
  }
  const split = rec(r.day_split);
  const daySplit: Record<string, string> | null = split
    ? Object.fromEntries(
        Object.entries(split)
          .map(([key, letter]) => [key, str(letter)] as const)
          .filter((entry): entry is readonly [string, string] => entry[1] !== null),
      )
    : null;
  return {
    assignmentId: id,
    studentTemplateId: str(r.student_template_id),
    title: str(r.title) ?? '',
    days: arr(r.days)
      .map(num)
      .filter((day): day is number => day !== null && day >= 1 && day <= 7)
      .sort((a, b) => a - b),
    daySplit: daySplit && Object.keys(daySplit).length > 0 ? daySplit : null,
    startDate: str(r.start_date),
    weeks: num(r.weeks),
    note: str(r.note),
    routineFocus: str(r.routine_focus),
  };
}

function parsePerson(value: unknown): CoachPerson | null {
  const r = rec(value);
  const name = str(r?.name);
  if (!r || !name) {
    return null;
  }
  return {
    id: str(r.id),
    name,
    avatar: str(r.avatar),
    bio: str(r.bio) ?? str(r.specialty) ?? str(r.headline),
  };
}

const NUTRITION_LIST_STATUSES: readonly CoachNutritionStatus[] = [
  'none',
  'pending',
  'accepted',
  'declined',
  'not_shared',
];

const LINK_STATUSES = ['pending', 'active', 'ended'] as const;
const linkStatus = (value: unknown): 'pending' | 'active' | 'ended' =>
  LINK_STATUSES.find(item => item === value) ?? 'active';

export function parseStudentList(body: Raw): CoachStudentList {
  const stats = rec(body.stats) ?? {};
  const students = arr(body.students)
    .map((raw): CoachStudentItem | null => {
      const r = rec(raw);
      const linkId = str(r?.link_id);
      if (!r || !linkId) {
        return null;
      }
      const routine = rec(r.routine);
      const week = rec(r.week) ?? {};
      return {
        linkId,
        status: linkStatus(r.status),
        name: str(r.name) ?? '',
        avatar: str(r.avatar),
        shares: parseShares(r.shares),
        nutritionStatus: NUTRITION_LIST_STATUSES.find(item => item === r.nutrition_status) ?? 'none',
        routine: routine
          ? { title: str(routine.title) ?? '', daysPerWeek: num(routine.days_per_week) ?? 0 }
          : null,
        week: { done: num(week.done) ?? 0, planned: num(week.planned) ?? 0 },
        lastSessionAt: str(r.last_session_at),
        daysInactive: num(r.days_inactive),
        // Only 'invite_pending' (pending) or 'inactive_7d' (active), never both.
        flags: arr(r.flags).map(str).filter((flag): flag is string => flag !== null),
        inviteCreatedAt: str(r.invite_created_at),
      };
    })
    .filter((item): item is CoachStudentItem => item !== null);
  return {
    stats: {
      students: num(stats.students) ?? students.length,
      max: num(stats.max) ?? 30,
      withRoutine: num(stats.with_routine) ?? 0,
      withNutrition: num(stats.with_nutrition) ?? 0,
    },
    students,
  };
}

function parseDiscomforts(value: unknown): CoachDiscomfort[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  return value
    .map((raw): CoachDiscomfort | null => {
      const r = rec(raw);
      const zone = str(r?.body_zone);
      if (!r || !zone) {
        return null;
      }
      return { zone, note: str(r.note), date: str(r.created_at) };
    })
    .filter((item): item is CoachDiscomfort => item !== null);
}

// body.weight is nut_weight_trend: points [{ kg, trend_kg, date }],
// last_weight. The change is trend (else kg) of the last point minus the
// first one, over the weeks the RPC covers (4).
function parseWeight(weight: Raw): { current: number | null; change: number | null; points: number[] } {
  const rows = arr(weight.points).map(rec).filter((row): row is Raw => row !== null);
  const value = (row: Raw | undefined) => (row ? num(row.trend_kg) ?? num(row.kg) : null);
  const first = value(rows[0]);
  const last = value(rows[rows.length - 1]);
  const lastRaw = rows.length > 0 ? num(rows[rows.length - 1].kg) : null;
  return {
    current: num(weight.last_weight) ?? lastRaw,
    change: rows.length >= 2 && first !== null && last !== null ? Math.round((last - first) * 10) / 10 : null,
    points: rows.map(row => num(row.kg)).filter((kg): kg is number => kg !== null),
  };
}

export function parseStudentDetail(body: Raw): CoachStudentDetail {
  const profile = rec(body.profile) ?? {};
  const week = rec(body.week) ?? {};
  const last = rec(week.last_session);
  const nutrition = rec(body.nutrition);
  const body_ = rec(body.body);
  const weight = rec(body_?.weight);
  const sleep = rec(body_?.sleep);
  const nutritionLocked = !nutrition || nutrition.locked === true;
  const bodyLocked = !body_ || body_.locked === true;
  return {
    linkId: str(body.link_id) ?? '',
    status: linkStatus(body.status),
    endedAt: str(body.ended_at),
    inviteCode: str(body.invite_code) ?? str(body.code),
    profile: {
      name: str(profile.name) ?? '',
      avatar: str(profile.avatar),
      level: str(profile.level),
      goal: str(profile.goal),
    },
    shares: parseShares(body.shares),
    week: {
      weekStart: str(week.week_start),
      days: arr(week.days).map(raw => {
        const r = rec(raw) ?? {};
        return {
          date: str(r.date) ?? '',
          planned: bool(r.planned),
          done: bool(r.done),
          missed: bool(r.missed),
          routineId: str(r.routine_id),
        };
      }),
      adherencePct: num(week.adherence_pct),
      lastSession: last
        ? {
            id: str(last.id),
            title: str(last.title) ?? '',
            date: str(last.date),
            duration: num(last.duration),
            rating: num(last.rating),
            ratingNote: str(last.rating_note),
          }
        : null,
    },
    routine: parseRoutineAssignment(body.routine),
    nutrition: nutritionLocked
      ? { locked: true }
      : {
          locked: false,
          // Flattened in `nutrition` ({ locked: false, assignment_id, mode,
          // targets, note, status }) or `{ locked: false, assignment: null }`.
          assignment: parseNutritionAssignment(nutrition),
        },
    body: bodyLocked
      ? { locked: true }
      : {
          locked: false,
          weight: weight ? parseWeight(weight) : null,
          sleep: sleep
            ? { avgHours: num(sleep.avg_7_min) !== null ? (num(sleep.avg_7_min) as number) / 60 : null }
            : null,
        },
    discomforts: bodyLocked ? null : parseDiscomforts(body_?.discomforts) ?? [],
  };
}

export function parseStudentCoach(body: Raw): StudentCoach {
  return {
    coach: parsePerson(body.coach),
    linkId: str(body.link_id),
    // linked_since = coach_links.accepted_at.
    since: str(body.linked_since),
    shares: parseShares(body.shares),
    routineAssignment: parseRoutineAssignment(body.routine_assignment),
    nutritionAssignment: parseNutritionAssignment(body.nutrition_assignment),
  };
}

export function targetsPayload(input: NutritionTargetsInput): Raw {
  const one = (t: MacroTargets) => ({
    kcal: Math.round(t.kcal),
    protein_g: Math.round(t.protein),
    carbs_g: Math.round(t.carbs),
    fat_g: Math.round(t.fat),
  });
  return input.mode === 'same' ? one(input.same) : { train: one(input.train), rest: one(input.rest) };
}

// ── Calls ───────────────────────────────────────────────────────────────────

export type CoachRpc = (name: string, args: Record<string, unknown>) => Promise<unknown>;

export async function coachSupabaseRpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const client = getSupabaseClient() as unknown as {
    rpc: (
      rpc: string,
      params: object,
    ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  } | null;
  if (!client) {
    throw new CoachError('unknown', { message: 'Supabase no está configurado.' });
  }
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new CoachError(error.code === '42501' ? 'unauthorized' : 'offline', { message: error.message });
  }
  return data;
}

export function expectCoachOk(body: unknown): Raw {
  const record = rec(body);
  if (record?.ok === true) {
    return record;
  }
  const errorValue = record?.error;
  const raw = str(errorValue) ?? str(rec(errorValue)?.code);
  const code = KNOWN_CODES.find(item => item === raw);
  throw new CoachError(code ?? 'unknown', {
    raw,
    field: str(record?.field) ?? str(rec(errorValue)?.field),
    message: str(record?.message) ?? str(rec(errorValue)?.message) ?? undefined,
  });
}

export function createCoachService(rpc: CoachRpc = coachSupabaseRpc) {
  const call = async (name: string, args: Record<string, unknown> = {}) => expectCoachOk(await rpc(name, args));
  const invite = (record: Raw): CoachInvite => ({
    code: str(record.code) ?? '',
    url: str(record.url) ?? `athelete://coach/join?code=${encodeURIComponent(str(record.code) ?? '')}`,
  });
  return {
    // ── Coach ──
    async getInvite(): Promise<CoachInvite> {
      return invite(await call('coach_get_invite'));
    },
    async regenerateInvite(): Promise<CoachInvite> {
      return invite(await call('coach_regenerate_invite'));
    },
    async listStudents(): Promise<CoachStudentList> {
      return parseStudentList(await call('coach_list_students'));
    },
    async getStudent(linkId: string): Promise<CoachStudentDetail> {
      const detail = parseStudentDetail(await call('coach_get_student', { p_link_id: linkId }));
      return { ...detail, linkId: detail.linkId || linkId };
    },
    async assignRoutine(input: {
      linkId: string;
      sourceTemplateId: string;
      days: number[];
      startDate: string;
      weeks: number | null;
      note: string | null;
      daySplit?: Record<string, string> | null;
      clientId: string;
    }): Promise<{ assignmentId: string | null; studentTemplateId: string | null }> {
      const record = await call('coach_assign_routine', {
        p_link_id: input.linkId,
        p_source_template_id: input.sourceTemplateId,
        p_days: [...input.days].sort((a, b) => a - b),
        p_start_date: input.startDate,
        p_weeks: input.weeks,
        p_note: input.note,
        p_day_split: input.daySplit ?? null,
        p_client_id: input.clientId,
      });
      return { assignmentId: str(record.assignment_id), studentTemplateId: str(record.student_template_id) };
    },
    async endRoutine(assignmentId: string): Promise<void> {
      await call('coach_end_routine', { p_assignment_id: assignmentId });
    },
    async assignNutrition(input: {
      linkId: string;
      targets: NutritionTargetsInput;
      note: string | null;
      clientId: string;
    }): Promise<void> {
      await call('coach_assign_nutrition', {
        p_link_id: input.linkId,
        p_mode: input.targets.mode,
        p_targets: targetsPayload(input.targets),
        p_note: input.note,
        p_client_id: input.clientId,
      });
    },
    async endLink(linkId: string): Promise<void> {
      await call('coach_end_link', { p_link_id: linkId });
    },

    // ── Student ──
    async previewInvite(code: string): Promise<CoachPerson> {
      const record = await call('coach_preview_invite', { p_code: code });
      const coach = parsePerson(record.coach);
      if (!coach) {
        throw new CoachError('invalid_code', { raw: 'invalid_code' });
      }
      return coach;
    },
    async acceptInvite(input: { code: string; shareNutrition: boolean; shareBody: boolean }): Promise<void> {
      await call('coach_accept_invite', {
        p_code: input.code,
        p_share_nutrition: input.shareNutrition,
        p_share_body: input.shareBody,
      });
    },
    async getMyCoach(): Promise<StudentCoach> {
      return parseStudentCoach(await call('student_get_coach'));
    },
    async updateShares(input: { shareNutrition: boolean; shareBody: boolean }): Promise<void> {
      await call('student_update_shares', {
        p_share_nutrition: input.shareNutrition,
        p_share_body: input.shareBody,
      });
    },
    async respondNutrition(assignmentId: string, accept: boolean): Promise<void> {
      await call('student_respond_nutrition', { p_assignment_id: assignmentId, p_accept: accept });
    },
    async endMyLink(): Promise<void> {
      await call('student_end_link');
    },
  };
}

export const coachService = createCoachService();
