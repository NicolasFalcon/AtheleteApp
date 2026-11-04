import { isNetworkError } from '@app/features/session/sessionOutbox';
import { getSupabaseClient } from '@app/services/supabase/client';

// Question time when start_play_round sends no seconds_per_question.
export const DEFAULT_SECONDS_PER_QUESTION = 30;

// Athelete Play v2 (contract play-1, docs/backend/PLAY_SHAPES.md): the three
// RPCs and their parsing. The server computes and validates everything
// (points, streak, unlocks, levels, goals); the app only shows what comes
// back. Options arrive already in display order and `correct_index` refers
// to that order, so `choice_index` is sent as shown.

export type PlayRoute = 'nutricion' | 'entrenamiento' | 'recuperacion';
export const PLAY_ROUTES: readonly PlayRoute[] = ['nutricion', 'entrenamiento', 'recuperacion'];

export type PlayLevelState = 'locked' | 'current' | 'passed';

export type PlayLevel = {
  level: number;
  name: string;
  state: PlayLevelState;
  bestScore: number | null;
  isNew: boolean;
  hitsToUnlock: number | null;
};

export type PlayRouteView = {
  route: PlayRoute;
  title: string;
  subtitle: string;
  completed: boolean;
  levelsPassed: number;
  currentLevel: number | null;
  levels: PlayLevel[];
};

export type PlayPlayer = {
  totalPoints: number;
  level: number;
  title: string;
  nextTitle: string | null;
  pointsInLevel: number;
  pointsToNext: number;
};

export type PlayGoalKey = 'play_5_days' | 'streak_5' | 'perfect_10';

export type PlayGoal = {
  goal: PlayGoalKey;
  progress: number;
  target: number;
  points: number;
  done: boolean;
};

export type PlayDailyChallenge = {
  route: PlayRoute;
  level: number;
  levelName: string;
  bonusPoints: number;
  doneToday: boolean;
  renewsInMinutes: number | null;
};

export type PlayHome = {
  player: PlayPlayer;
  streak: { days: number; playedToday: boolean };
  dailyChallenge: PlayDailyChallenge | null;
  routes: PlayRouteView[];
  weeklyGoals: { weekStart: string | null; resetsInMinutes: number | null; goals: PlayGoal[] };
  firstTime: boolean;
};

export type PlayQuestion = {
  id: string;
  topic: string | null;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
};

export type PlayRound = {
  roundId: string;
  route: PlayRoute;
  level: number;
  levelName: string;
  isDailyChallenge: boolean;
  dailyBonusAvailable: boolean;
  bestScore: number | null;
  hitsToUnlock: number | null;
  secondsPerQuestion: number;
  questions: PlayQuestion[];
};

export type PlayAnswerPayload = {
  question_id: string;
  choice_index: number | null;
  elapsed_ms: number;
};

export type PlayMedal = 'oro' | 'plata' | 'bronce';
export type PlayCelebration = 'level_up' | 'unlock' | 'record';

export type PlayResult = {
  score: number;
  medal: PlayMedal | null;
  maxStreak: number;
  roundPoints: number;
  dailyBonus: number;
  bestScore: { before: number | null; after: number; newRecord: boolean };
  unlocked: { route: PlayRoute; level: number; levelName: string } | null;
  routeCompleted: PlayRoute | null;
  streak: { before: number; after: number; incremented: boolean };
  weeklyGoalsCompleted: { goal: PlayGoalKey; points: number }[];
  achievementsUnlocked: { code: string; name: string }[];
  player: {
    totalBefore: number;
    totalAfter: number;
    levelBefore: number;
    levelAfter: number;
    titleAfter: string;
    pointsToNext: number;
    nextTitle: string | null;
  };
  nextObjective: string | null;
  reviewTopics: string[];
  celebration: PlayCelebration | null;
};

export type PlayErrorCode =
  | 'level_locked'
  | 'not_daily_challenge'
  | 'not_enough_questions'
  | 'unauthorized'
  | 'offline'
  | 'invalid'
  | 'unknown';

export class PlayError extends Error {
  code: PlayErrorCode;
  constructor(code: PlayErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'PlayError';
    this.code = code;
  }
}

// ── Parsing ────────────────────────────────────────────────────────────────

type Raw = Record<string, unknown>;

const rec = (value: unknown): Raw =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const int = (value: unknown, fallback = 0): number => Math.round(num(value) ?? fallback);
const bool = (value: unknown): boolean => value === true;

function route(value: unknown): PlayRoute | null {
  return PLAY_ROUTES.includes(value as PlayRoute) ? (value as PlayRoute) : null;
}

function levelState(value: unknown): PlayLevelState {
  return value === 'current' || value === 'passed' ? value : 'locked';
}

function goalKey(value: unknown): PlayGoalKey | null {
  return value === 'play_5_days' || value === 'streak_5' || value === 'perfect_10' ? value : null;
}

export function parsePlayHome(body: unknown): PlayHome {
  const data = rec(body);
  const player = rec(data.player);
  const streak = rec(data.streak);
  const daily = rec(data.daily_challenge);
  const weekly = rec(data.weekly_goals);
  const dailyRoute = route(daily.route);

  return {
    player: {
      totalPoints: int(player.total_points),
      level: int(player.level, 1),
      title: str(player.title) ?? '',
      nextTitle: str(player.next_title),
      pointsInLevel: int(player.points_in_level),
      pointsToNext: int(player.points_to_next),
    },
    streak: { days: int(streak.days), playedToday: bool(streak.played_today) },
    dailyChallenge: dailyRoute
      ? {
          route: dailyRoute,
          level: int(daily.level, 1),
          levelName: str(daily.level_name) ?? '',
          bonusPoints: int(daily.bonus_points),
          doneToday: bool(daily.done_today),
          renewsInMinutes: num(daily.renews_in_minutes),
        }
      : null,
    routes: list(data.routes).flatMap(item => {
      const row = rec(item);
      const key = route(row.route);
      if (!key) {
        return [];
      }
      return [
        {
          route: key,
          title: str(row.title) ?? key,
          subtitle: str(row.subtitle) ?? '',
          completed: bool(row.completed),
          levelsPassed: int(row.levels_passed),
          currentLevel: num(row.current_level),
          levels: list(row.levels)
            .map(levelItem => {
              const level = rec(levelItem);
              return {
                level: int(level.level, 1),
                name: str(level.name) ?? '',
                state: levelState(level.state),
                bestScore: num(level.best_score),
                isNew: bool(level.is_new),
                hitsToUnlock: num(level.hits_to_unlock),
              };
            })
            .sort((a, b) => a.level - b.level),
        },
      ];
    }),
    weeklyGoals: {
      weekStart: str(weekly.week_start),
      resetsInMinutes: num(weekly.resets_in_minutes),
      goals: list(weekly.goals).flatMap(item => {
        const goal = rec(item);
        const key = goalKey(goal.goal);
        return key
          ? [
              {
                goal: key,
                progress: int(goal.progress),
                target: Math.max(1, int(goal.target, 1)),
                points: int(goal.points),
                done: bool(goal.done),
              },
            ]
          : [];
      }),
    },
    firstTime: bool(data.first_time),
  };
}

export function parsePlayRound(body: unknown): PlayRound {
  const data = rec(body);
  const key = route(data.route);
  const roundId = str(data.round_id);
  const questions = list(data.questions).flatMap(item => {
    const q = rec(item);
    const id = str(q.id);
    const options = list(q.options).filter((o): o is string => typeof o === 'string');
    const correct = num(q.correct_index);
    if (!id || options.length < 2 || correct === null || correct < 0 || correct >= options.length) {
      return [];
    }
    return [
      {
        id,
        topic: str(q.topic),
        prompt: str(q.prompt) ?? '',
        options,
        correctIndex: correct,
        explanation: str(q.explanation),
      },
    ];
  });
  if (!roundId || !key || questions.length === 0) {
    throw new PlayError('invalid', 'La ronda llegó incompleta.');
  }
  return {
    roundId,
    route: key,
    level: int(data.level, 1),
    levelName: str(data.level_name) ?? '',
    isDailyChallenge: bool(data.is_daily_challenge),
    dailyBonusAvailable: bool(data.daily_bonus_available),
    bestScore: num(data.best_score),
    hitsToUnlock: num(data.hits_to_unlock),
    secondsPerQuestion: int(data.seconds_per_question, DEFAULT_SECONDS_PER_QUESTION),
    questions,
  };
}

function medal(value: unknown): PlayMedal | null {
  return value === 'oro' || value === 'plata' || value === 'bronce' ? value : null;
}

function celebration(value: unknown): PlayCelebration | null {
  return value === 'level_up' || value === 'unlock' || value === 'record' ? value : null;
}

export function parsePlayResult(body: unknown): PlayResult {
  const data = rec(body);
  const best = rec(data.best_score);
  const unlocked = rec(data.unlocked);
  const unlockedRoute = route(unlocked.route);
  const streak = rec(data.streak);
  const player = rec(data.player);

  return {
    score: int(data.score),
    medal: medal(data.medal),
    maxStreak: int(data.max_streak),
    roundPoints: int(data.round_points),
    dailyBonus: int(data.daily_bonus),
    bestScore: {
      before: num(best.before),
      after: int(best.after, int(data.score)),
      newRecord: bool(best.new_record),
    },
    unlocked: unlockedRoute
      ? { route: unlockedRoute, level: int(unlocked.level), levelName: str(unlocked.level_name) ?? '' }
      : null,
    routeCompleted: route(data.route_completed),
    streak: {
      before: int(streak.before),
      after: int(streak.after),
      incremented: bool(streak.incremented),
    },
    weeklyGoalsCompleted: list(data.weekly_goals_completed).flatMap(item => {
      const goal = rec(item);
      const key = goalKey(goal.goal);
      return key ? [{ goal: key, points: int(goal.points) }] : [];
    }),
    achievementsUnlocked: list(data.achievements_unlocked).flatMap(item => {
      const achievement = rec(item);
      const code = str(achievement.code);
      return code ? [{ code, name: str(achievement.name) ?? code }] : [];
    }),
    player: {
      totalBefore: int(player.total_before),
      totalAfter: int(player.total_after),
      levelBefore: int(player.level_before, 1),
      levelAfter: int(player.level_after, 1),
      titleAfter: str(player.title_after) ?? '',
      pointsToNext: int(player.points_to_next),
      nextTitle: str(player.next_title),
    },
    nextObjective: str(data.next_objective),
    reviewTopics: list(data.review_topics)
      .filter((t): t is string => typeof t === 'string' && Boolean(t.trim()))
      .slice(0, 4),
    celebration: celebration(data.celebration),
  };
}

// ── Calls ──────────────────────────────────────────────────────────────────

const ERROR_CODES: readonly PlayErrorCode[] = [
  'level_locked',
  'not_daily_challenge',
  'not_enough_questions',
  'unauthorized',
];

// The device's IANA zone: the server computes "today" and the week with it.
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

async function callPlay(name: string, args: Record<string, unknown>): Promise<Raw> {
  const client = getSupabaseClient() as unknown as {
    rpc: (
      rpc: string,
      params: object,
    ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  } | null;
  if (!client) {
    throw new PlayError('unknown', 'Supabase no está configurado.');
  }
  let response: Awaited<ReturnType<typeof client.rpc>>;
  try {
    response = await client.rpc(name, args);
  } catch (thrown) {
    throw new PlayError(isNetworkError(thrown) ? 'offline' : 'unknown', String(thrown));
  }
  const { data, error } = response;
  if (error) {
    // No connection (or a timeout) is `offline`: the caller decides whether
    // to queue. Without a session the key is refused with 42501.
    const code: PlayErrorCode =
      error.code === '42501' ? 'unauthorized' : isNetworkError(error) ? 'offline' : 'unknown';
    throw new PlayError(code, error.message);
  }
  const body = rec(data);
  if (body.ok !== true) {
    const err = rec(body.error);
    const code = ERROR_CODES.find(item => item === err.code) ?? 'unknown';
    throw new PlayError(code, str(err.message) ?? code);
  }
  return body;
}

export async function fetchPlayHome(): Promise<PlayHome> {
  return parsePlayHome(await callPlay('get_play_home', { p_tz: deviceTimeZone() }));
}

export async function startPlayRound(params: {
  route: PlayRoute;
  level: number;
  isDaily: boolean;
  clientRoundId: string;
}): Promise<PlayRound> {
  return parsePlayRound(
    await callPlay('start_play_round', {
      p_route: params.route,
      p_level: params.level,
      p_is_daily: params.isDaily,
      p_client_round_id: params.clientRoundId,
      p_tz: deviceTimeZone(),
    }),
  );
}

export async function submitPlayRound(params: {
  roundId: string;
  answers: PlayAnswerPayload[];
  finishedAt: string;
  tz: string;
}): Promise<PlayResult> {
  return parsePlayResult(
    await callPlay('submit_play_round', {
      p_round_id: params.roundId,
      p_answers: params.answers,
      p_finished_at: params.finishedAt,
      p_tz: params.tz,
    }),
  );
}

// Client round id (idempotency key of start_play_round).
export function createClientRoundId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, token => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : 8 + (random % 4);
    return value.toString(16);
  });
}
