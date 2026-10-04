import {
  answerQuestion,
  bestAttempt,
  categoryPhotoKey,
  challengeStatus,
  completesQuizMaster,
  feedbackTitle,
  historyRows,
  INITIAL_ROUND,
  isNewRecord,
  nextChallenge,
  nextQuestion,
  pickDailyChallenge,
  PERFECT_BONUS,
  quizMasterProgress,
  relativeDay,
  resultCopy,
  resultTier,
  selectQuizRound,
  streakMultiplier,
  summarizeRound,
  weekPlay,
  type RoundState,
} from '../src/features/quiz/quizModel';
import type { AttemptQuizQuestion } from '../src/features/quiz/randomizeQuizOptions';
import type { QuizCategoryPreview, QuizQuestion } from '../src/types/quiz';

function question(
  index: number,
  patch: Partial<AttemptQuizQuestion> = {},
): AttemptQuizQuestion {
  return {
    id: `q${index}`,
    categoryId: 'c1',
    question: `Pregunta ${index}`,
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 1,
    explanation: null,
    difficulty: 'medium',
    pointsReward: 10,
    sortOrder: index,
    originalOptionIndexes: [0, 1, 2, 3],
    ...patch,
  };
}

// Plays the options in order: `true` = the right one, `false` = a wrong one.
function play(results: boolean[], total = results.length): RoundState {
  let state = INITIAL_ROUND;
  results.forEach((ok, index) => {
    const q = question(index);
    state = answerQuestion(state, q, ok ? q.correctAnswer : 0);
    if (index < total - 1) {
      state = nextQuestion(state);
    }
  });
  return state;
}

describe('streak and points', () => {
  it('multiplies from 3 in a row ×2 and from 5 ×3', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(streakMultiplier)).toEqual([
      1, 1, 1, 2, 2, 3, 3,
    ]);
  });

  it('scores the answers with the streak and resets it on a miss', () => {
    // hit, hit, hit(×2), hit(×2), hit(×3), miss, hit
    const state = play([true, true, true, true, true, false, true]);

    expect(state.answers.map(item => item.pointsEarned)).toEqual([
      10, 10, 20, 20, 30, 0, 10,
    ]);
    expect(state.streak).toBe(1);
    expect(state.bestStreak).toBe(5);
  });

  it('uses the points of each question as the base', () => {
    const q = question(0, { pointsReward: 15 });
    const state = answerQuestion(INITIAL_ROUND, q, q.correctAnswer);

    expect(state.answers[0].pointsEarned).toBe(15);
  });

  it('answers with one touch: a second touch changes nothing', () => {
    const q = question(0);
    const first = answerQuestion(INITIAL_ROUND, q, 0);
    const second = answerQuestion(first, q, 1);

    expect(second).toBe(first);
    expect(first.answers[0].isCorrect).toBe(false);
  });

  it('stores the option in the original order, not the shown one', () => {
    // Shown order D,C,B,A: the first shown option was originally the 4th.
    const q = question(0, { originalOptionIndexes: [3, 2, 1, 0], correctAnswer: 2 });
    const state = answerQuestion(INITIAL_ROUND, q, 0);

    expect(state.answers[0].selectedAnswer).toBe(3);
  });

  it('ignores an option that does not exist', () => {
    const q = question(0);

    expect(answerQuestion(INITIAL_ROUND, q, 7)).toBe(INITIAL_ROUND);
  });
});

describe('round summary', () => {
  it('adds the perfect bonus only to a flawless round', () => {
    const perfect = play(Array(10).fill(true));
    const summary = summarizeRound(perfect.answers, 10, perfect.bestStreak);

    // 10 + 10 + 20 + 20 + 30×6
    expect(summary.basePoints).toBe(240);
    expect(summary.perfectBonus).toBe(PERFECT_BONUS);
    expect(summary.pointsEarned).toBe(240 + PERFECT_BONUS);
    expect(summary).toMatchObject({
      correctCount: 10,
      score: 100,
      isPerfect: true,
      tier: 'perfect',
      missed: [],
    });
  });

  it('keeps the percentage, the missed texts and no bonus otherwise', () => {
    const state = play([true, false, true, false, true, true, true, true, true, true]);
    const summary = summarizeRound(state.answers, 10, state.bestStreak);

    expect(summary).toMatchObject({
      correctCount: 8,
      score: 80,
      perfectBonus: 0,
      isPerfect: false,
      tier: 'mid',
      missed: ['Pregunta 1', 'Pregunta 3'],
    });
  });

  it('is not perfect with no questions', () => {
    expect(summarizeRound([], 0, 0)).toMatchObject({ isPerfect: false, score: 0 });
  });

  it('grades low / mid / perfect', () => {
    expect(resultTier(3, 10)).toBe('low');
    expect(resultTier(5, 10)).toBe('low');
    expect(resultTier(6, 10)).toBe('mid');
    expect(resultTier(9, 10)).toBe('mid');
    expect(resultTier(10, 10)).toBe('perfect');
    expect(resultTier(0, 0)).toBe('low');
    // A short category counts by share, not by 10.
    expect(resultTier(3, 5)).toBe('mid');
  });

  it('writes the message of each result', () => {
    expect(resultCopy('perfect', 10, 10, 'Nutrición')).toEqual({
      head: 'Perfecto. 10 de 10.',
      message: 'Ni un fallo en nutrición. Así se juega.',
    });
    expect(resultCopy('mid', 8, 10, 'X').head).toBe('Muy buena ronda');
    expect(resultCopy('mid', 7, 10, 'X')).toEqual({
      head: 'Bien jugado',
      message: '3 para el perfecto. La siguiente sale.',
    });
    expect(resultCopy('low', 3, 10, 'X').head).toBe('Buen calentamiento');
  });

  it('titles the feedback by streak', () => {
    expect(feedbackTitle(true, 1, 0)).toBe('Exacto');
    expect(feedbackTitle(true, 3, 0)).toBe('En racha');
    expect(feedbackTitle(true, 5, 0)).toBe('¡Imparable!');
    expect(feedbackTitle(false, 0, 0)).toBe('Casi');
    expect(feedbackTitle(false, 0, 1)).toBe('Repasemos esto');
  });
});

describe('best attempt and records', () => {
  const attempts = [
    { score: 70, correctCount: 7, totalQuestions: 10 },
    { score: 90, correctCount: 9, totalQuestions: 10 },
    { score: 80, correctCount: 8, totalQuestions: 10 },
  ];

  it('picks the highest score of a category and counts the rounds', () => {
    expect(bestAttempt(attempts)).toEqual({
      score: 90,
      correctCount: 9,
      totalQuestions: 10,
      attemptsCount: 3,
    });
    expect(bestAttempt([])).toBeNull();
  });

  it('breaks a tie of percentage with the attempt with more hits', () => {
    expect(
      bestAttempt([
        { score: 80, correctCount: 4, totalQuestions: 5 },
        { score: 80, correctCount: 8, totalQuestions: 10 },
      ])?.correctCount,
    ).toBe(8);
  });

  it('flags a new record only when the best is beaten', () => {
    const previous = { score: 80 };

    expect(isNewRecord(9, 10, previous)).toBe(true);
    expect(isNewRecord(8, 10, previous)).toBe(false);
    expect(isNewRecord(5, 10, previous)).toBe(false);
    // First round of a category sets a record, unless it scored nothing.
    expect(isNewRecord(3, 10, null)).toBe(true);
    expect(isNewRecord(0, 10, null)).toBe(false);
  });
});

describe('progress towards Quiz Master', () => {
  it('counts the active categories at 100 %', () => {
    expect(
      quizMasterProgress([{ bestScore: 100 }, { bestScore: 90 }, {}]),
    ).toMatchObject({
      mastered: 1,
      total: 3,
      remaining: 2,
      unlocked: false,
      line: '1 de 3 categorías al 100 %',
    });
    expect(quizMasterProgress([{ bestScore: 100 }, { bestScore: 100 }])).toMatchObject({
      unlocked: true,
      progress: 1,
      line: 'Quiz Master desbloqueado',
    });
    expect(quizMasterProgress([])).toMatchObject({ unlocked: false, progress: 0 });
  });

  it('completes the set only with the round that makes the last perfect score', () => {
    const ids = ['a', 'b', 'c'];
    const history = [
      { categoryId: 'a', score: 100 },
      { categoryId: 'b', score: 90 },
    ];

    expect(completesQuizMaster(ids, history, { categoryId: 'b', score: 100 })).toBe(false);
    expect(completesQuizMaster(ids, history, { categoryId: 'c', score: 100 })).toBe(false);
    expect(
      completesQuizMaster(
        ids,
        [...history, { categoryId: 'b', score: 100 }],
        { categoryId: 'c', score: 100 },
      ),
    ).toBe(true);
    // The round that was just played counts, but it has to be perfect itself.
    expect(
      completesQuizMaster(ids, [{ categoryId: 'a', score: 100 }, { categoryId: 'b', score: 100 }], { categoryId: 'c', score: 90 }),
    ).toBe(false);
    expect(completesQuizMaster([], [], { categoryId: 'a', score: 100 })).toBe(false);
  });
});

describe('the round: which questions and in which order', () => {
  function pool(): QuizQuestion[] {
    const levels = [
      ['easy', 5],
      ['medium', 6],
      ['hard', 5],
    ] as const;
    return levels.flatMap(([difficulty, count]) =>
      Array.from({ length: count }, (_, index) => ({
        id: `${difficulty}-${index}`,
        categoryId: 'c1',
        question: `${difficulty} ${index}`,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        explanation: null,
        difficulty,
        pointsReward: 10,
        sortOrder: 0,
      })),
    );
  }

  it('takes 3 easy, 4 medium and 3 hard, sorted from easy to hard', () => {
    const round = selectQuizRound(pool(), () => 0.3);

    expect(round).toHaveLength(10);
    expect(round.map(item => item.difficulty)).toEqual([
      ...Array(3).fill('easy'),
      ...Array(4).fill('medium'),
      ...Array(3).fill('hard'),
    ]);
    expect(new Set(round.map(item => item.id)).size).toBe(10);
  });

  it('fills the round from other levels when one falls short', () => {
    const onlyMedium = pool().filter(item => item.difficulty === 'medium');
    const round = selectQuizRound(onlyMedium, () => 0.5);

    expect(round).toHaveLength(6);
  });

  it('plays all the questions of a short category', () => {
    expect(selectQuizRound(pool().slice(0, 4), Math.random)).toHaveLength(4);
    expect(selectQuizRound([], Math.random)).toEqual([]);
  });

  it('shuffles: different random sources give different rounds', () => {
    const first = selectQuizRound(pool(), () => 0.01).map(item => item.id);
    const second = selectQuizRound(pool(), () => 0.99).map(item => item.id);

    expect(first).not.toEqual(second);
  });

  it('is repeatable with the same random source', () => {
    const seeded = () => {
      let seed = 7;
      return () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
    };

    expect(selectQuizRound(pool(), seeded()).map(item => item.id)).toEqual(
      selectQuizRound(pool(), seeded()).map(item => item.id),
    );
  });
});

describe('portada', () => {
  // Thursday 1 Oct 2026, noon.
  const now = new Date(2026, 9, 1, 12, 0);

  it('marks the days played this week, Monday to Sunday', () => {
    const week = weekPlay(
      [
        { completedAt: new Date(2026, 8, 28, 9).toISOString() }, // Monday
        { completedAt: new Date(2026, 9, 1, 8).toISOString() }, // today
        { completedAt: new Date(2026, 9, 1, 20).toISOString() }, // today again
        { completedAt: new Date(2026, 8, 27, 9).toISOString() }, // last Sunday
      ],
      now,
    );

    expect(week.days.map(day => day.label).join('')).toBe('LMXJVSD');
    expect(week.days.map(day => day.played)).toEqual([
      true, false, false, true, false, false, false,
    ]);
    expect(week.days.findIndex(day => day.today)).toBe(3);
    expect(week.count).toBe(2);
  });

  it('starts a Sunday at the previous Monday', () => {
    const week = weekPlay([], new Date(2026, 9, 4, 10));

    expect(week.days[6].today).toBe(true);
    expect(week.count).toBe(0);
  });

  const categories: QuizCategoryPreview[] = ['a', 'b', 'c'].map(id => ({
    id,
    name: id.toUpperCase(),
    slug: id,
    description: null,
    icon: 'x',
    questionCount: 10,
    attemptsCount: 0,
  }));

  it('rotates the challenge of the day among the categories that are open', () => {
    const open = categories.map((item, index) => ({
      ...item,
      bestScore: index === 1 ? 100 : undefined,
    }));
    const days = [1, 2, 3, 4].map(day =>
      pickDailyChallenge(open, new Date(2026, 9, day, 9))?.id,
    );

    expect(days).not.toContain('b');
    expect(days[0]).toBe(pickDailyChallenge(open, new Date(2026, 9, 1, 23))?.id);
    expect(new Set(days).size).toBe(2);
  });

  it('keeps rotating among all of them once everything is perfect', () => {
    const perfect = categories.map(item => ({ ...item, bestScore: 100 }));

    expect(pickDailyChallenge(perfect, now)).not.toBeNull();
    expect(pickDailyChallenge([], now)).toBeNull();
  });

  it('describes the state of a challenge', () => {
    expect(challengeStatus(categories[0])).toMatchObject({
      kind: 'new',
      eyebrow: 'SIN JUGAR',
      figure: '–',
      goal: 'Aún sin jugar',
      best: null,
    });
    expect(
      challengeStatus({
        ...categories[0],
        attemptsCount: 2,
        bestScore: 80,
        bestCorrect: 8,
        bestTotal: 10,
      }),
    ).toMatchObject({
      kind: 'played',
      eyebrow: '2 RONDAS',
      ratio: 0.8,
      figure: '8',
      goal: 'Récord 8/10 · a por el 9',
      best: '8/10',
    });
    expect(
      challengeStatus({
        ...categories[0],
        attemptsCount: 1,
        bestScore: 100,
        bestCorrect: 10,
        bestTotal: 10,
      }),
    ).toMatchObject({ kind: 'perfect', eyebrow: 'COMPLETADA', goal: 'Récord perfecto' });
  });

  it('writes the age of a round', () => {
    expect(relativeDay(new Date(2026, 9, 1, 8).toISOString(), now)).toBe('hoy');
    expect(relativeDay(new Date(2026, 8, 30, 8).toISOString(), now)).toBe('ayer');
    expect(relativeDay(new Date(2026, 8, 28, 8).toISOString(), now)).toBe('hace 3 días');
    expect(relativeDay(new Date(2026, 5, 14, 8).toISOString(), now)).toBe('14 jun');
    expect(relativeDay('nope', now)).toBe('');
  });

  it('lists the latest rounds, newest first, with their category', () => {
    const rows = historyRows(
      [
        { id: '1', categoryId: 'a', score: 80, correctCount: 8, totalQuestions: 10, pointsEarned: 120, completedAt: new Date(2026, 8, 14).toISOString() },
        { id: '2', categoryId: 'b', score: 70, correctCount: 7, totalQuestions: 10, pointsEarned: 90, completedAt: new Date(2026, 8, 28).toISOString() },
        { id: '3', categoryId: 'zzz', score: 10, correctCount: 1, totalQuestions: 10, pointsEarned: 10, completedAt: new Date(2026, 8, 1).toISOString() },
      ],
      categories,
      now,
      2,
    );

    expect(rows.map(row => row.id)).toEqual(['2', '1']);
    expect(rows[0]).toMatchObject({ title: 'B', score: '7/10', points: 90 });
  });

  it('chooses the next challenge, wrapping around', () => {
    expect(nextChallenge(categories, 'a')?.id).toBe('b');
    expect(nextChallenge(categories, 'c')?.id).toBe('a');
    expect(nextChallenge(categories.slice(0, 1), 'a')).toBeNull();
    expect(nextChallenge(categories, 'missing')).toBeNull();
  });

  it('chooses the photo by keyword and rotates for unknown categories', () => {
    expect(categoryPhotoKey({ slug: 'nutricion', name: 'Nutrición' }, 2)).toBe('nutrition');
    expect(categoryPhotoKey({ name: 'Entrenamiento' }, 0)).toBe('training');
    expect(categoryPhotoKey({ name: 'Recuperación' }, 0)).toBe('recovery');
    expect(categoryPhotoKey({ name: 'Suplementos' }, 4)).toBe('training');
  });
});
