import {
  createQuizAttemptId,
  submitQuizAttempt,
} from '@app/services/supabase/quiz';
import {getSupabaseClient} from '@app/services/supabase/client';
import {awardGamificationEvent} from '@app/services/supabase/gamification';

jest.mock('@app/services/supabase/client', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('@app/services/supabase/gamification', () => ({
  awardGamificationEvent: jest.fn(),
}));

const mockedGetSupabaseClient = jest.mocked(getSupabaseClient);
const mockedAwardGamificationEvent = jest.mocked(awardGamificationEvent);

const answers = [
  {
    questionId: 'question-1',
    selectedAnswer: 2,
    isCorrect: true,
    pointsEarned: 10,
  },
];

function createAttemptRow() {
  return {
    id: 'd234a0c8-7f95-4dd0-a585-a4ff11f9e7aa',
    category_id: 'category-1',
    score: 100,
    correct_count: 1,
    total_questions: 1,
    points_earned: 35,
    completed_at: '2026-07-05T22:00:00.000Z',
    answers,
  };
}

function mockAttemptInsert(
  results: Array<{data: unknown; error: unknown}>,
  earlier: Array<Record<string, number>> = [],
) {
  const single = jest.fn();
  results.forEach(result => single.mockResolvedValueOnce(result));
  const select = jest.fn(() => ({single}));
  const insert = jest.fn((_payload: Record<string, unknown>) => ({select}));
  // select('score…').eq(user).eq(category).neq(id): the best before this one.
  const neq = jest.fn(() => Promise.resolve({data: earlier, error: null}));
  const eqCategory = jest.fn(() => ({neq}));
  const eqUser = jest.fn(() => ({eq: eqCategory}));
  const selectEarlier = jest.fn(() => ({eq: eqUser}));
  const from = jest.fn(() => ({insert, select: selectEarlier}));

  mockedGetSupabaseClient.mockReturnValue({from} as any);
  return {insert, neq};
}

describe('submitQuizAttempt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('conserva el intento guardado aunque falle la gamificación secundaria', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const {insert} = mockAttemptInsert([
      {data: createAttemptRow(), error: null},
    ]);
    mockedAwardGamificationEvent.mockRejectedValue(
      new Error('ON CONFLICT inválido'),
    );

    await expect(
      submitQuizAttempt({
        attemptId: createAttemptRow().id,
        userId: 'user-1',
        categoryId: 'category-1',
        correctCount: 1,
        totalQuestions: 1,
        pointsEarned: 35,
        answers,
      }),
    ).resolves.toMatchObject({
      attempt: {
        id: createAttemptRow().id,
        answers,
      },
      unlockedBadges: [],
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({answers, id: createAttemptRow().id}),
    );
    expect(warn).toHaveBeenCalledWith(
      '[quiz-submit] El intento se guardó, pero la recompensa quedó pendiente.',
      expect.any(Error),
    );
    warn.mockRestore();
  });

  test('usa el esquema legado mientras la columna answers aún no esté desplegada', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const {insert} = mockAttemptInsert([
      {
        data: null,
        error: {
          code: 'PGRST204',
          message: "Could not find the 'answers' column",
        },
      },
      {data: createAttemptRow(), error: null},
    ]);
    mockedAwardGamificationEvent.mockResolvedValue({
      awarded: true,
      alreadyProcessed: false,
      reason: null,
      pointsAwarded: 40,
      badgesUnlocked: ['first_quiz'],
      totalPoints: 40,
    });

    const result = await submitQuizAttempt({
      attemptId: createAttemptRow().id,
      userId: 'user-1',
      categoryId: 'category-1',
      correctCount: 1,
      totalQuestions: 1,
      pointsEarned: 35,
      answers,
    });

    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[0][0]).toHaveProperty('answers', answers);
    expect(insert.mock.calls[1][0]).not.toHaveProperty('answers');
    // The server decides the points (40), not what the app sent (35).
    expect(result.pointsAwarded).toBe(40);
    expect(result.unlockedBadges).toEqual(['first_quiz']);
    warn.mockRestore();
  });

  test('lee la mejor marca anterior del servidor, sin contar este intento', async () => {
    const {neq} = mockAttemptInsert(
      [{data: createAttemptRow(), error: null}],
      [
        {score: 70, correct_count: 7, total_questions: 10},
        {score: 90, correct_count: 9, total_questions: 10},
      ],
    );
    mockedAwardGamificationEvent.mockResolvedValue({
      awarded: true,
      alreadyProcessed: false,
      reason: null,
      pointsAwarded: 40,
      badgesUnlocked: [],
      totalPoints: 140,
    });

    const result = await submitQuizAttempt({
      attemptId: createAttemptRow().id,
      userId: 'user-1',
      categoryId: 'category-1',
      correctCount: 1,
      totalQuestions: 1,
      pointsEarned: 35,
      answers,
    });

    expect(neq).toHaveBeenCalledWith('id', createAttemptRow().id);
    expect(result.previousBest).toEqual({
      score: 90,
      correctCount: 9,
      totalQuestions: 10,
    });
    expect(result.totalPoints).toBe(140);
  });

  test('sin intentos anteriores no hay mejor marca previa', async () => {
    mockAttemptInsert([{data: createAttemptRow(), error: null}]);
    mockedAwardGamificationEvent.mockResolvedValue({
      awarded: true,
      alreadyProcessed: false,
      reason: null,
      pointsAwarded: 40,
      badgesUnlocked: [],
      totalPoints: 40,
    });

    const result = await submitQuizAttempt({
      attemptId: createAttemptRow().id,
      userId: 'user-1',
      categoryId: 'category-1',
      correctCount: 1,
      totalQuestions: 1,
      pointsEarned: 35,
      answers,
    });

    expect(result.previousBest).toBeNull();
  });

  test('rechaza localmente un submit incompleto antes de tocar Supabase', async () => {
    const from = jest.fn();
    mockedGetSupabaseClient.mockReturnValue({from} as any);

    await expect(
      submitQuizAttempt({
        attemptId: createQuizAttemptId(),
        userId: 'user-1',
        categoryId: 'category-1',
        correctCount: 0,
        totalQuestions: 1,
        pointsEarned: 0,
        answers: [],
      }),
    ).rejects.toThrow('El intento está incompleto');

    expect(from).not.toHaveBeenCalled();
  });
});
