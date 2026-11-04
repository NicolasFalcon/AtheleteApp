import type {
  PlayAnswerPayload,
  PlayGoalKey,
  PlayHome,
  PlayLevel,
  PlayMedal,
  PlayQuestion,
  PlayResult,
  PlayRoute,
  PlayRouteView,
} from '@app/services/supabase/play';
import { DEFAULT_SECONDS_PER_QUESTION } from '@app/services/supabase/play';

// Pure rules of Athelete Play v2 on the app side (§28.6.1). Everything that
// counts (points, streak, unlocks, levels, goals) comes from the server; the
// only local logic is the immediate feedback of the round (right / wrong,
// the streak chip and its multiplier) and the texts built from the server's
// figures.

export const ROUND_SIZE = 10;
// A round of 8/10 or more opens the next level (server rule, used for texts).
export const UNLOCK_SCORE = 8;
// Time per question when the server sends none; each round uses the
// seconds_per_question of start_play_round.
export const QUESTION_MS = DEFAULT_SECONDS_PER_QUESTION * 1000;
// elapsed_ms is never sent above this (submit_play_round).
export const MAX_ELAPSED_MS = 30_000;
// The last 5 s: tick and Ember glow, whatever the duration.
export const URGENT_SECONDS = 5;
// In the background for longer than this, the round is dropped (no call).
export const BACKGROUND_LIMIT_MS = 120_000;

// Fallbacks when the server sends no title (it normally does).
export const ROUTE_TITLES: Record<PlayRoute, string> = {
  nutricion: 'Nutrición',
  entrenamiento: 'Entrenamiento',
  recuperacion: 'Recuperación',
};

// Player titles by level (handoff 28.6.1), to name the level before a round:
// the result only sends the title after.
const PLAYER_TITLES = ['Novato', 'Aficionado', 'Constante', 'Competidor', 'Atleta', 'Élite', 'Leyenda'];

export function playerTitle(level: number): string {
  return PLAYER_TITLES[Math.min(Math.max(1, level), PLAYER_TITLES.length) - 1];
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// ── Round (local feedback only) ────────────────────────────────────────────

// Same multiplier the server applies: from 3 hits in a row ×2, from 5 ×3.
export function streakMultiplier(streak: number): 1 | 2 | 3 {
  return streak >= 5 ? 3 : streak >= 3 ? 2 : 1;
}

export function secondsLeft(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

// The question time of a round (ms): the server's seconds, never below 5 s.
export function questionDurationMs(secondsPerQuestion: number): number {
  return Math.max(5, secondsPerQuestion) * 1000;
}

// 0 … the question time, and never above MAX_ELAPSED_MS.
export function clampElapsedMs(elapsedMs: number, durationMs: number): number {
  return Math.min(durationMs, MAX_ELAPSED_MS, Math.max(0, Math.round(elapsedMs)));
}

export function isUrgent(remainingMs: number): boolean {
  return remainingMs <= URGENT_SECONDS * 1000;
}

export type RoundAnswer = {
  questionId: string;
  // Index as shown (null: time ran out).
  choice: number | null;
  elapsedMs: number;
  correct: boolean;
  // Shown in the feedback; the result uses the server's points.
  points: number;
  multiplier: number;
};

export type RoundState = {
  index: number;
  // Chosen option as shown; -1 when the time ran out; null until answered.
  selected: number | null;
  answers: RoundAnswer[];
  streak: number;
  bestStreak: number;
};

export const INITIAL_ROUND: RoundState = {
  index: 0,
  selected: null,
  answers: [],
  streak: 0,
  bestStreak: 0,
};

export const TIMED_OUT = -1;

export function isAnswered(state: RoundState): boolean {
  return state.selected !== null;
}

function record(state: RoundState, answer: RoundAnswer, selected: number, streak: number): RoundState {
  return {
    ...state,
    selected,
    answers: [...state.answers.filter(item => item.questionId !== answer.questionId), answer],
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
  };
}

// One touch answers (no confirm). A second touch is ignored.
export function answerQuestion(
  state: RoundState,
  question: PlayQuestion,
  choice: number,
  elapsedMs: number,
  durationMs: number,
): RoundState {
  if (isAnswered(state) || choice < 0 || choice >= question.options.length) {
    return state;
  }
  const correct = choice === question.correctIndex;
  const streak = correct ? state.streak + 1 : 0;
  const multiplier = correct ? streakMultiplier(streak) : 1;
  return record(
    state,
    {
      questionId: question.id,
      choice,
      elapsedMs: clampElapsedMs(elapsedMs, durationMs),
      correct,
      points: correct ? 10 * multiplier : 0,
      multiplier,
    },
    choice,
    streak,
  );
}

// The question time ran out: a miss with no choice; the streak breaks.
export function timeOutQuestion(
  state: RoundState,
  question: PlayQuestion,
  durationMs: number,
): RoundState {
  if (isAnswered(state)) {
    return state;
  }
  return record(
    state,
    {
      questionId: question.id,
      choice: null,
      elapsedMs: clampElapsedMs(durationMs, durationMs),
      correct: false,
      points: 0,
      multiplier: 1,
    },
    TIMED_OUT,
    0,
  );
}

export function nextQuestion(state: RoundState): RoundState {
  return { ...state, index: state.index + 1, selected: null };
}

export function lastAnswer(state: RoundState): RoundAnswer | null {
  return state.answers[state.answers.length - 1] ?? null;
}

export function correctCount(answers: RoundAnswer[]): number {
  return answers.filter(answer => answer.correct).length;
}

export function roundPoints(answers: RoundAnswer[]): number {
  return answers.reduce((total, answer) => total + answer.points, 0);
}

// What submit_play_round receives: the 10 answers in the order served.
export function answersPayload(
  questions: PlayQuestion[],
  answers: RoundAnswer[],
  durationMs: number,
): PlayAnswerPayload[] {
  return questions.map(question => {
    const answer = answers.find(item => item.questionId === question.id);
    return {
      question_id: question.id,
      choice_index: answer ? answer.choice : null,
      elapsed_ms: clampElapsedMs(answer ? answer.elapsedMs : durationMs, durationMs),
    };
  });
}

// "N para desbloquear" while it can still happen this round. Only when the
// server says the level can open the next one (`hits_to_unlock` present).
export function unlockHint(
  hitsToUnlock: number | null,
  answers: RoundAnswer[],
  total: number,
): string | null {
  if (hitsToUnlock === null) {
    return null;
  }
  const need = UNLOCK_SCORE - correctCount(answers);
  const left = total - answers.length;
  return need > 0 && need <= left ? `${need} para desbloquear` : null;
}

const OK_TITLES = ['¡Bien!', '¡Eso es!', '¡Exacto!'];

export function feedbackTitle(correct: boolean, streak: number, index: number, timedOut: boolean): string {
  if (timedOut) {
    return 'Se acabó el tiempo';
  }
  if (!correct) {
    return 'Incorrecto';
  }
  if (streak >= 5) {
    return '¡Imparable!';
  }
  return streak >= 3 ? '¡En racha!' : OK_TITLES[index % OK_TITLES.length];
}

// Ember glow behind the round: the streak lights it (prototype .06 / .2 / .3).
export function streakGlow(streak: number): number {
  return streak >= 5 ? 0.3 : streak >= 3 ? 0.2 : 0.06;
}

// ── Portada and level start ───────────────────────────────────────────────

export function findRoute(home: PlayHome | undefined | null, route: PlayRoute): PlayRouteView | null {
  return home?.routes.find(item => item.route === route) ?? null;
}

export function findLevel(view: PlayRouteView | null, level: number): PlayLevel | null {
  return view?.levels.find(item => item.level === level) ?? null;
}

// The level the route card shows: the current one; a completed route, its last.
export function routeFocusLevel(view: PlayRouteView): PlayLevel | null {
  return (
    view.levels.find(item => item.state === 'current') ??
    view.levels[view.levels.length - 1] ??
    null
  );
}

// 10 segments: the best score lit, up to 8 (the goal) soft, the rest track.
export type TrackSegment = 'hit' | 'goal' | 'idle';

export function trackSegments(best: number | null): TrackSegment[] {
  const score = best ?? 0;
  return Array.from({ length: ROUND_SIZE }, (_, i) =>
    i < score ? 'hit' : i < UNLOCK_SCORE ? 'goal' : 'idle',
  );
}

export function bestLabel(best: number | null): string {
  return best === null ? 'Sin jugar' : `${best}/10`;
}

// "1 acierto más" + " para desbloquear Hidratación" (strong part first).
export function levelNeedLine(
  view: PlayRouteView,
  level: PlayLevel,
): { strong: string; rest: string } | null {
  if (level.state === 'passed') {
    return view.completed && level.level === view.levels.length
      ? { strong: 'Ruta completada.', rest: ' Repite para mejorar tu récord.' }
      : { strong: 'Nivel superado.', rest: ' Repite para mejorar tu récord.' };
  }
  if (level.state !== 'current') {
    return null;
  }
  const need = level.hitsToUnlock ?? UNLOCK_SCORE - (level.bestScore ?? 0);
  const next = findLevel(view, level.level + 1);
  return {
    strong: `${need} ${plural(need, 'acierto más', 'aciertos más')}`,
    rest: next ? ` para desbloquear ${next.name}` : ' para completar la ruta',
  };
}

export function renewsLabel(minutes: number | null): string | null {
  if (minutes === null || minutes < 0) {
    return null;
  }
  return minutes >= 60 ? `Se renueva en ${Math.round(minutes / 60)} h` : `Se renueva en ${Math.max(1, Math.round(minutes))} min`;
}

export const GOAL_LABELS: Record<PlayGoalKey, string> = {
  play_5_days: 'Juega 5 días',
  streak_5: 'Encadena 5 aciertos',
  perfect_10: 'Haz un 10 de 10',
};

// Level bar of the player card: progress within the current 1000.
export function levelProgress(pointsInLevel: number, pointsToNext: number): number {
  const span = pointsInLevel + pointsToNext;
  return span > 0 ? Math.min(1, Math.max(0, pointsInLevel / span)) : 0;
}

// "Siguiente desafío" from the result: today's challenge while it is still
// open; else the current level of the next route.
// `playedDaily`: the round just played was today's challenge (the cached
// portada may not know it yet).
export function nextChallengeTarget(
  home: PlayHome | undefined | null,
  after: PlayRoute,
  playedDaily: boolean,
): { route: PlayRoute; level: number; isDaily: boolean } | null {
  if (!home) {
    return null;
  }
  const daily = home.dailyChallenge;
  if (daily && !daily.doneToday && !playedDaily) {
    return { route: daily.route, level: daily.level, isDaily: true };
  }
  const order = home.routes.map(item => item.route);
  const start = order.indexOf(after);
  for (let step = 1; step <= order.length; step += 1) {
    const view = home.routes[(start + step + order.length) % order.length];
    const focus = view ? routeFocusLevel(view) : null;
    if (focus && focus.state !== 'locked') {
      return { route: view.route, level: focus.level, isDaily: false };
    }
  }
  return null;
}

// ── Result ────────────────────────────────────────────────────────────────

export function resultHead(score: number): string {
  if (score >= 10) {
    return '¡Perfecto!';
  }
  if (score >= 8) {
    return '¡Muy bien!';
  }
  return score >= 6 ? 'Bien jugado' : 'Buen calentamiento';
}

// Glow and ripples behind the ring (prototype · resultado).
export function resultFx(score: number): { glow: number; bursts: number[] } {
  if (score >= 10) {
    return { glow: 0.34, bursts: [600, 900, 1200] };
  }
  return score >= 6 ? { glow: 0.18, bursts: [900] } : { glow: 0.06, bursts: [] };
}

export const MEDAL_LABELS: Record<PlayMedal, string> = {
  oro: 'Medalla de oro',
  plata: 'Medalla de plata',
  bronce: 'Medalla de bronce',
};

export type RewardIcon = 'star' | 'flame' | 'lock' | 'award' | 'target' | 'route';

export type RewardRow = { icon: RewardIcon; label: string; value: string; highlight: boolean };

// The rewards list, only from what the server answered.
export function resultRewards(result: PlayResult, routeTitle: (route: PlayRoute) => string): RewardRow[] {
  const rows: RewardRow[] = [];
  if (result.dailyBonus > 0) {
    rows.push({ icon: 'star', label: 'Desafío del día', value: `+${result.dailyBonus}`, highlight: false });
  }
  if (result.streak.incremented) {
    rows.push({
      icon: 'flame',
      label: 'Racha de Play',
      value: `${result.streak.before} → ${result.streak.after}`,
      highlight: false,
    });
  }
  if (result.unlocked) {
    rows.push({
      icon: 'lock',
      label: `Nivel ${result.unlocked.level} desbloqueado`,
      value: result.unlocked.levelName,
      highlight: true,
    });
  }
  if (result.routeCompleted) {
    rows.push({ icon: 'route', label: 'Ruta completada', value: routeTitle(result.routeCompleted), highlight: true });
  }
  result.weeklyGoalsCompleted.forEach(goal =>
    rows.push({ icon: 'target', label: GOAL_LABELS[goal.goal], value: `+${goal.points}`, highlight: false }),
  );
  result.achievementsUnlocked.forEach(achievement =>
    rows.push({ icon: 'award', label: 'Logro de Play · Vitrina', value: achievement.name, highlight: true }),
  );
  return rows;
}

// Player bar of the result: from the share before the round to the share
// after (full when the level went up).
export function resultLevelBar(result: PlayResult): {
  from: string;
  right: string;
  startPct: number;
  endPct: number;
  up: { label: string } | null;
} {
  const { player } = result;
  const up = player.levelAfter > player.levelBefore;
  const share = (total: number) => (total % 1000) / 1000;
  return {
    from: `Nivel ${player.levelBefore} · ${playerTitle(player.levelBefore)}`,
    right: up
      ? `+${player.totalAfter - player.totalBefore} pts`
      : `${player.pointsToNext} para ${player.nextTitle ?? playerTitle(player.levelAfter + 1)}`,
    startPct: share(player.totalBefore),
    endPct: up ? 1 : share(player.totalAfter),
    up: up ? { label: `Subes a nivel ${player.levelAfter} · ${player.titleAfter || playerTitle(player.levelAfter)}` } : null,
  };
}

export function celebrationCopy(
  result: PlayResult,
  levelName: string,
): { eyebrow: string; title: string } | null {
  switch (result.celebration) {
    case 'level_up':
      return {
        eyebrow: 'Subes de nivel',
        title: `Nivel ${result.player.levelAfter} · ${result.player.titleAfter || playerTitle(result.player.levelAfter)}`,
      };
    case 'unlock':
      return result.unlocked
        ? { eyebrow: 'Nivel desbloqueado', title: result.unlocked.levelName }
        : { eyebrow: 'Ruta completada', title: levelName };
    case 'record':
      return { eyebrow: 'Nuevo récord', title: `${result.score}/10 en ${levelName}` };
    default:
      return null;
  }
}
