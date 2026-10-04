import type { AttemptQuizQuestion } from '@app/features/quiz/randomizeQuizOptions';
import type {
  QuizAttemptAnswer,
  QuizAttemptSummary,
  QuizCategoryPreview,
  QuizQuestion,
} from '@app/types/quiz';

// Pure rules of the Quiz: scoring and streak, the round, best attempt per
// category, progress towards Quiz Master, the week and the lists of the
// portada. Nothing here reads or writes the backend.

export const ROUND_SIZE = 10;
// Bonus for a flawless round (already part of the points of the attempt).
export const PERFECT_BONUS = 25;

type RandomSource = () => number;

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

// ── Streak and points ──────────────────────────────────────────────────────

// Handoff · Streak (Quiz): from 3 hits in a row ×2, from 5 ×3.
export function streakMultiplier(streak: number): 1 | 2 | 3 {
  return streak >= 5 ? 3 : streak >= 3 ? 2 : 1;
}

export type RoundAnswer = QuizAttemptAnswer & {
  multiplier: number;
  // Text of the question, for "Repasemos esto".
  questionText: string;
};

export type RoundState = {
  index: number;
  // Position (in the shown order) of the chosen option; null until answered.
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

export function isAnswered(state: RoundState): boolean {
  return state.selected !== null;
}

// One touch answers (no confirm button). A second touch is ignored.
export function answerQuestion(
  state: RoundState,
  question: AttemptQuizQuestion,
  optionIndex: number,
): RoundState {
  if (isAnswered(state) || optionIndex < 0 || optionIndex >= question.options.length) {
    return state;
  }

  const isCorrect = optionIndex === question.correctAnswer;
  const streak = isCorrect ? state.streak + 1 : 0;
  const multiplier = isCorrect ? streakMultiplier(streak) : 1;
  const answer: RoundAnswer = {
    questionId: question.id,
    // The server stores the position in the original order of the options.
    selectedAnswer: question.originalOptionIndexes[optionIndex] ?? optionIndex,
    isCorrect,
    pointsEarned: isCorrect ? question.pointsReward * multiplier : 0,
    multiplier,
    questionText: question.question,
  };

  return {
    ...state,
    selected: optionIndex,
    answers: [
      ...state.answers.filter(item => item.questionId !== question.id),
      answer,
    ],
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
  };
}

export function nextQuestion(state: RoundState): RoundState {
  return { ...state, index: state.index + 1, selected: null };
}

export function lastAnswer(state: RoundState): RoundAnswer | null {
  return state.answers[state.answers.length - 1] ?? null;
}

export function roundPoints(answers: Array<{ pointsEarned: number }>): number {
  return answers.reduce((total, answer) => total + answer.pointsEarned, 0);
}

export type RoundSummary = {
  correctCount: number;
  totalQuestions: number;
  // Percentage stored in quiz_attempts.score.
  score: number;
  basePoints: number;
  perfectBonus: number;
  pointsEarned: number;
  isPerfect: boolean;
  bestStreak: number;
  tier: ResultTier;
  // Texts of the questions that were missed, in order.
  missed: string[];
};

export function summarizeRound(
  answers: RoundAnswer[],
  totalQuestions: number,
  bestStreak: number,
): RoundSummary {
  const correctCount = answers.filter(answer => answer.isCorrect).length;
  const isPerfect = totalQuestions > 0 && correctCount === totalQuestions;
  const basePoints = roundPoints(answers);
  const perfectBonus = isPerfect ? PERFECT_BONUS : 0;

  return {
    correctCount,
    totalQuestions,
    score:
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
    basePoints,
    perfectBonus,
    pointsEarned: basePoints + perfectBonus,
    isPerfect,
    bestStreak,
    tier: resultTier(correctCount, totalQuestions),
    missed: answers
      .filter(answer => !answer.isCorrect)
      .map(answer => answer.questionText),
  };
}

// Result · low (< 60 %), mid, perfect (handoff: "10 perfecto, ≥ 6 medio").
export type ResultTier = 'low' | 'mid' | 'perfect';

export function resultTier(correct: number, total: number): ResultTier {
  if (total > 0 && correct === total) {
    return 'perfect';
  }
  return total > 0 && correct / total >= 0.6 ? 'mid' : 'low';
}

export function resultCopy(
  tier: ResultTier,
  correct: number,
  total: number,
  categoryName: string,
): { head: string; message: string } {
  if (tier === 'perfect') {
    return {
      head: `Perfecto. ${total} de ${total}.`,
      message: `Ni un fallo en ${categoryName.toLowerCase()}. Así se juega.`,
    };
  }
  if (tier === 'mid') {
    return {
      head: correct / total >= 0.8 ? 'Muy buena ronda' : 'Bien jugado',
      message: `${total - correct} para el perfecto. La siguiente sale.`,
    };
  }
  return {
    head: 'Buen calentamiento',
    message: 'Cada ronda afina. Repasa estos puntos y vuelve a por ellos.',
  };
}

// Feedback sheet title under a question (OK / KO phrases of the prototype).
const OK_TITLES = ['Exacto', 'Bien', 'Eso es', 'Perfecto'];
const KO_TITLES = ['Casi', 'Repasemos esto'];

export function feedbackTitle(
  isCorrect: boolean,
  streak: number,
  questionIndex: number,
): string {
  if (!isCorrect) {
    return KO_TITLES[questionIndex % KO_TITLES.length];
  }
  if (streak >= 5) {
    return '¡Imparable!';
  }
  return streak >= 3 ? 'En racha' : OK_TITLES[questionIndex % OK_TITLES.length];
}

// Intensity (0–1) of the Ember glow behind the round: the streak lights it.
export function streakGlow(streak: number): number {
  return streak >= 5 ? 0.34 : streak >= 3 ? 0.22 : 0.06;
}

// ── The round: which questions, in which order ─────────────────────────────

function shuffle<T>(items: T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

const DIFFICULTY_ORDER: Record<string, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

// 3 easy + 4 medium + 3 hard at random; if a level falls short, the round is
// filled from the rest, and it always ends sorted easy → hard (stable inside
// each level).
export function selectQuizRound(
  rows: QuizQuestion[],
  random: RandomSource = Math.random,
): QuizQuestion[] {
  const byLevel = (level: string) => rows.filter(row => row.difficulty === level);
  const picks = [
    ...shuffle(byLevel('easy'), random).slice(0, 3),
    ...shuffle(byLevel('medium'), random).slice(0, 4),
    ...shuffle(byLevel('hard'), random).slice(0, 3),
  ];
  const remaining = shuffle(
    rows.filter(row => !picks.some(pick => pick.id === row.id)),
    random,
  );

  while (picks.length < ROUND_SIZE && remaining.length > 0) {
    picks.push(remaining.shift() as QuizQuestion);
  }

  return picks
    .map((question, position) => ({ question, position }))
    .sort(
      (left, right) =>
        (DIFFICULTY_ORDER[left.question.difficulty] ?? 1) -
          (DIFFICULTY_ORDER[right.question.difficulty] ?? 1) ||
        left.position - right.position,
    )
    .map(entry => entry.question);
}

// ── Best attempt per category ──────────────────────────────────────────────

export type BestAttempt = {
  score: number;
  correctCount: number;
  totalQuestions: number;
  attemptsCount: number;
};

// The best one is the highest percentage; a tie keeps the one with more hits.
export function bestAttempt(
  attempts: Array<
    Pick<QuizAttemptSummary, 'score' | 'correctCount' | 'totalQuestions'>
  >,
): BestAttempt | null {
  if (attempts.length === 0) {
    return null;
  }
  const best = attempts.reduce((current, item) =>
    item.score > current.score ||
    (item.score === current.score && item.correctCount > current.correctCount)
      ? item
      : current,
  );

  return {
    score: best.score,
    correctCount: best.correctCount,
    totalQuestions: best.totalQuestions,
    attemptsCount: attempts.length,
  };
}

// New record: the round beats the best percentage so far (the first round of
// a category always sets one, unless it scored zero).
export function isNewRecord(
  correctCount: number,
  totalQuestions: number,
  previous: { score: number } | null,
): boolean {
  if (totalQuestions <= 0 || correctCount <= 0) {
    return false;
  }
  const score = Math.round((correctCount / totalQuestions) * 100);
  return previous === null || score > previous.score;
}

// ── Quiz Master ────────────────────────────────────────────────────────────

export type QuizMasterProgress = {
  mastered: number;
  total: number;
  progress: number;
  remaining: number;
  unlocked: boolean;
  line: string;
};

// Quiz Master = every active category with a best score of 100 %.
export function quizMasterProgress(
  categories: Array<{ bestScore?: number }>,
): QuizMasterProgress {
  const total = categories.length;
  const mastered = categories.filter(item => item.bestScore === 100).length;
  const unlocked = total > 0 && mastered >= total;

  return {
    mastered,
    total,
    progress: total > 0 ? mastered / total : 0,
    remaining: Math.max(total - mastered, 0),
    unlocked,
    line:
      total === 0
        ? 'Aún no hay categorías disponibles'
        : unlocked
        ? 'Quiz Master desbloqueado'
        : `${mastered} de ${total} categorías al 100 %`,
  };
}

// Whether this round completes the set: every active category has a perfect
// attempt counting the one that was just played. The server still decides
// whether the badge is granted (`quiz_master_unlocked`, once per user).
export function completesQuizMaster(
  activeCategoryIds: string[],
  attempts: Array<{ categoryId: string; score: number }>,
  current: { categoryId: string; score: number },
): boolean {
  if (current.score !== 100 || activeCategoryIds.length === 0) {
    return false;
  }
  const perfect = new Set(
    attempts.filter(item => item.score === 100).map(item => item.categoryId),
  );
  perfect.add(current.categoryId);

  return activeCategoryIds.every(id => perfect.has(id));
}

// ── Portada ────────────────────────────────────────────────────────────────

export type WeekDay = { label: string; played: boolean; today: boolean };

const WEEK_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Monday → Sunday of the week of `now` (local time) with the days played.
export function weekPlay(
  attempts: Array<{ completedAt: string }>,
  now: Date = new Date(),
): { days: WeekDay[]; count: number } {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const played = attempts
    .map(item => new Date(item.completedAt))
    .filter(date => !Number.isNaN(date.getTime()));
  const days = WEEK_LABELS.map((label, offset): WeekDay => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + offset);
    return {
      label,
      played: played.some(date => isSameLocalDay(date, day)),
      today: isSameLocalDay(day, now),
    };
  });

  return { days, count: days.filter(day => day.played).length };
}

export function weekLine(count: number): string {
  return count === 0
    ? 'Aún no has jugado esta semana'
    : `${count} ${count === 1 ? 'día jugando' : 'días jugando'} esta semana`;
}

// "Desafío del día": no server data, so it rotates by calendar day among the
// categories that are not perfect yet (all of them once everything is).
export function pickDailyChallenge<T extends { bestScore?: number }>(
  categories: T[],
  now: Date = new Date(),
): T | null {
  if (categories.length === 0) {
    return null;
  }
  const open = categories.filter(item => item.bestScore !== 100);
  const pool = open.length > 0 ? open : categories;
  const dayNumber = Math.floor(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000,
  );

  return pool[dayNumber % pool.length];
}

export type ChallengeStatus = {
  kind: 'new' | 'played' | 'perfect';
  // Eyebrow of the card (replaces "NIVEL N", which has no data).
  eyebrow: string;
  // Ring: 0–1 of the best hits.
  ratio: number;
  // Figure inside the ring.
  figure: string;
  // Line below the card.
  goal: string;
  // "8/10" or null when never played.
  best: string | null;
};

export function challengeStatus(category: QuizCategoryPreview): ChallengeStatus {
  const total = category.bestTotal ?? category.questionCount ?? ROUND_SIZE;
  const correct = category.bestCorrect ?? 0;

  if (category.attemptsCount === 0 || category.bestScore === undefined) {
    return {
      kind: 'new',
      eyebrow: 'SIN JUGAR',
      ratio: 0,
      figure: '–',
      goal: 'Aún sin jugar',
      best: null,
    };
  }

  const perfect = category.bestScore === 100;

  return {
    kind: perfect ? 'perfect' : 'played',
    eyebrow: perfect
      ? 'COMPLETADA'
      : `${category.attemptsCount} ${category.attemptsCount === 1 ? 'RONDA' : 'RONDAS'}`,
    ratio: total > 0 ? Math.min(correct / total, 1) : 0,
    figure: String(correct),
    goal: perfect
      ? 'Récord perfecto'
      : `Récord ${correct}/${total} · a por el ${Math.min(total, correct + 1)}`,
    best: `${correct}/${total}`,
  };
}

const MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

// "hoy" · "ayer" · "hace 3 días" · "14 jun" (after a week).
export function relativeDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const days = Math.round(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) /
      86400000,
  );

  if (days <= 0) {
    return 'hoy';
  }
  if (days === 1) {
    return 'ayer';
  }
  return days < 7
    ? `hace ${days} días`
    : `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export type HistoryRow = {
  id: string;
  title: string;
  when: string;
  points: number;
  score: string;
};

export function historyRows(
  attempts: QuizAttemptSummary[],
  categories: Array<{ id: string; name: string }>,
  now: Date = new Date(),
  limit = 5,
): HistoryRow[] {
  return [...attempts]
    .sort(
      (left, right) =>
        new Date(right.completedAt).getTime() -
        new Date(left.completedAt).getTime(),
    )
    .slice(0, limit)
    .map(attempt => ({
      id: attempt.id,
      title:
        categories.find(item => item.id === attempt.categoryId)?.name ??
        'Quiz',
      when: relativeDay(attempt.completedAt, now),
      points: attempt.pointsEarned,
      score: `${attempt.correctCount}/${attempt.totalQuestions}`,
    }));
}

// Next category after `categoryId` in the list (wraps around), or null when
// it is the only one.
export function nextChallenge<T extends { id: string }>(
  categories: T[],
  categoryId: string,
): T | null {
  const index = categories.findIndex(item => item.id === categoryId);
  if (index === -1 || categories.length < 2) {
    return null;
  }
  return categories[(index + 1) % categories.length];
}

// Photo of a category: by keyword of its slug / name; unknown ones rotate by
// position. The photos are PLACEHOLDERS of the handoff package.
export type QuizPhotoKey = 'nutrition' | 'training' | 'recovery';

const PHOTO_ROTATION: QuizPhotoKey[] = ['nutrition', 'training', 'recovery'];

export function categoryPhotoKey(
  category: { slug?: string; name?: string },
  index: number,
): QuizPhotoKey {
  const text = `${category.slug ?? ''} ${category.name ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  if (/nutri|aliment|dieta|comida/.test(text)) {
    return 'nutrition';
  }
  if (/entren|train|fuerza|strength|ejerc|workout/.test(text)) {
    return 'training';
  }
  if (/recup|recov|descans|sueno|sleep|movilidad/.test(text)) {
    return 'recovery';
  }
  return PHOTO_ROTATION[index % PHOTO_ROTATION.length];
}
