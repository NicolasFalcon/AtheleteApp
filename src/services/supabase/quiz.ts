import { getSupabaseClient } from '@app/services/supabase/client';
import {
  bestAttempt,
  completesQuizMaster,
  selectQuizRound,
} from '@app/features/quiz/quizModel';
import { awardGamificationEvent } from '@app/services/supabase/gamification';
import type {
  QuizAttempt,
  QuizAttemptAnswer,
  QuizAttemptSummary,
  QuizCategoryPreview,
  QuizOverview,
  QuizQuestion,
} from '@app/types/quiz';

export function createQuizAttemptId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, token => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : 8 + (random % 4);
    return value.toString(16);
  });
}

function getClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  return client;
}

function mapQuestion(row: any): QuizQuestion {
  return {
    id: row.id,
    categoryId: row.category_id,
    question: row.question,
    options: Array.isArray(row.options) ? row.options : [],
    correctAnswer: row.correct_answer,
    explanation: row.explanation ?? null,
    difficulty: row.difficulty ?? 'medium',
    pointsReward:
      typeof row.points_reward === 'number' ? row.points_reward : 10,
    sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0,
  };
}

function mapAttemptSummary(row: any): QuizAttemptSummary {
  return {
    id: row.id,
    categoryId: row.category_id,
    score: typeof row.score === 'number' ? row.score : 0,
    correctCount: typeof row.correct_count === 'number' ? row.correct_count : 0,
    totalQuestions:
      typeof row.total_questions === 'number' ? row.total_questions : 0,
    pointsEarned: typeof row.points_earned === 'number' ? row.points_earned : 0,
    completedAt: row.completed_at,
  };
}

// Active categories with the user's best attempt, and the saved rounds
// (newest first) for the week and "Últimas rondas". Read only.
export async function fetchQuizOverview(
  userId?: string,
): Promise<QuizOverview> {
  const client = getClient();

  const { data: categories, error: categoryError } = await (client as any)
    .from('quiz_categories')
    .select('*')
    .eq('is_active', true)
    .order('created_at');

  if (categoryError) {
    throw categoryError;
  }

  const { data: questions, error: questionError } = await (client as any)
    .from('quiz_questions')
    .select('id, category_id')
    .eq('is_active', true);

  if (questionError) {
    throw questionError;
  }

  let attempts: QuizAttemptSummary[] = [];

  if (userId) {
    const { data: rawAttempts, error: attemptError } = await (client as any)
      .from('quiz_attempts')
      .select(
        'id, category_id, score, correct_count, total_questions, points_earned, completed_at',
      )
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (attemptError) {
      throw attemptError;
    }

    attempts = ((rawAttempts || []) as any[]).map(mapAttemptSummary);
  }

  return {
    attempts,
    categories: ((categories || []) as any[]).map(category => {
      const best = bestAttempt(
        attempts.filter(attempt => attempt.categoryId === category.id),
      );

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        questionCount: ((questions || []) as any[]).filter(
          question => question.category_id === category.id,
        ).length,
        bestScore: best?.score,
        bestCorrect: best?.correctCount,
        bestTotal: best?.totalQuestions,
        attemptsCount: best?.attemptsCount ?? 0,
      };
    }),
  };
}

export async function fetchQuizCategories(
  userId?: string,
): Promise<QuizCategoryPreview[]> {
  return (await fetchQuizOverview(userId)).categories;
}

export async function fetchQuizQuestions(
  categoryId: string,
): Promise<QuizQuestion[]> {
  const client = getClient();
  const { data, error } = await (client as any)
    .from('quiz_questions')
    .select('*')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    throw error;
  }

  return selectQuizRound(((data || []) as any[]).map(mapQuestion));
}

async function maybeUnlockQuizMaster(userId: string, categoryId: string) {
  const client = getClient();
  const [
    { data: attempts, error: attemptsError },
    { data: categories, error: catsError },
  ] = await Promise.all([
    (client.from('quiz_attempts') as any)
      .select('category_id, score')
      .eq('user_id', userId),
    (client.from('quiz_categories') as any).select('id').eq('is_active', true),
  ]);

  if (attemptsError) {
    throw attemptsError;
  }

  if (catsError) {
    throw catsError;
  }

  const allCategoryIds = ((categories || []) as Array<{ id: string }>).map(
    item => item.id,
  );

  if (
    completesQuizMaster(
      allCategoryIds,
      ((attempts || []) as Array<{ category_id: string; score: number }>).map(
        item => ({ categoryId: item.category_id, score: item.score }),
      ),
      { categoryId, score: 100 },
    )
  ) {
    // Once per user: no reference (the server enforces it).
    const awardResult = await awardGamificationEvent({
      eventType: 'quiz_master_unlocked',
      badgeIds: ['quiz_master'],
      metadata: {
        categoryId,
        perfectCategoryCount: allCategoryIds.length,
      },
    });

    return awardResult.badgesUnlocked.includes('quiz_master');
  }

  return false;
}

export async function submitQuizAttempt(params: {
  attemptId: string;
  userId: string;
  categoryId: string;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
  answers: QuizAttemptAnswer[];
}): Promise<{
  attempt: QuizAttempt;
  unlockedBadges: string[];
  // Points granted by the server for this attempt (it computes them from the
  // saved attempt, not from what the app sends). null when nothing was
  // granted now (duplicate retry or reward failure).
  pointsAwarded: number | null;
  // Total points of the user after the award (server), null when unknown.
  totalPoints: number | null;
  // true when the attempt was saved but the reward call failed: retrying the
  // same attempt id is safe (the server answers `duplicate` if it went through).
  rewardPending: boolean;
  // Best attempt of the category read from the server just before saving this
  // one (this attempt excluded): what "nuevo récord" is compared with.
  previousBest: {
    score: number;
    correctCount: number;
    totalQuestions: number;
  } | null;
}> {
  const client = getClient();

  if (
    params.answers.length !== params.totalQuestions ||
    new Set(params.answers.map(answer => answer.questionId)).size !==
      params.totalQuestions
  ) {
    throw new Error(
      `El intento está incompleto: ${params.answers.length} de ${params.totalQuestions} respuestas.`,
    );
  }

  // Read before inserting so the new attempt cannot be its own record; the
  // attempt id is excluded so a retry after a saved insert gives the same answer.
  const { data: earlier, error: earlierError } = await (
    client.from('quiz_attempts') as any
  )
    .select('score, correct_count, total_questions')
    .eq('user_id', params.userId)
    .eq('category_id', params.categoryId)
    .neq('id', params.attemptId);

  if (earlierError) {
    throw new Error(
      `No se pudo leer tu mejor marca. ${earlierError.message ?? ''}`.trim(),
    );
  }

  const previous = bestAttempt(
    ((earlier || []) as any[]).map(row => ({
      score: row.score,
      correctCount: row.correct_count,
      totalQuestions: row.total_questions,
    })),
  );
  const previousBest = previous
    ? {
        score: previous.score,
        correctCount: previous.correctCount,
        totalQuestions: previous.totalQuestions,
      }
    : null;

  const score = Math.round((params.correctCount / params.totalQuestions) * 100);
  const attemptPayload = {
    id: params.attemptId,
    user_id: params.userId,
    category_id: params.categoryId,
    score,
    correct_count: params.correctCount,
    total_questions: params.totalQuestions,
    points_earned: params.pointsEarned,
    answers: params.answers,
  };
  const insertAttempt = (payload: Record<string, unknown>) =>
    (client.from('quiz_attempts') as any)
      .insert(payload)
      .select()
      .single();
  let { data, error } = await insertAttempt(attemptPayload);

  const answersColumnMissing =
    error?.code === 'PGRST204' &&
    String(error.message || '').toLowerCase().includes('answers');

  if (answersColumnMissing) {
    const legacyPayload: Record<string, unknown> = {...attemptPayload};
    delete legacyPayload.answers;
    const legacyResult = await insertAttempt(legacyPayload);
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error?.code === '23505') {
    const existingAttempt = await (client.from('quiz_attempts') as any)
      .select('*')
      .eq('id', params.attemptId)
      .eq('user_id', params.userId)
      .maybeSingle();

    data = existingAttempt.data;
    error = existingAttempt.error;
  }

  if (error) {
    const detail = [error.message, error.details, error.hint]
      .filter(Boolean)
      .join(' ');
    throw new Error(
      detail
        ? `No se pudo persistir el intento. ${detail}`
        : 'No se pudo persistir el intento.',
    );
  }

  if (!data?.id) {
    throw new Error('Supabase no devolvió el intento guardado.');
  }

  const unlockedBadges: string[] = [];
  let pointsAwarded: number | null = null;
  let totalPoints: number | null = null;
  let rewardPending = false;
  try {
    const attemptAward = await awardGamificationEvent({
      eventType: 'quiz_completed',
      referenceId: String(data.id),
      // Informative only: the server takes the points from quiz_attempts.
      points: params.pointsEarned,
      badgeIds: ['first_quiz'],
      metadata: {
        categoryId: params.categoryId,
        score,
        correctCount: params.correctCount,
        totalQuestions: params.totalQuestions,
      },
    });

    if (attemptAward.awarded) {
      pointsAwarded = attemptAward.pointsAwarded;
    }

    if (attemptAward.totalPoints > 0) {
      totalPoints = attemptAward.totalPoints;
    }

    if (attemptAward.badgesUnlocked.includes('first_quiz')) {
      unlockedBadges.push('first_quiz');
    }

    if (score === 100) {
      const unlockedQuizMaster = await maybeUnlockQuizMaster(
        params.userId,
        params.categoryId,
      );

      if (unlockedQuizMaster) {
        unlockedBadges.push('quiz_master');
      }
    }
  } catch (gamificationError) {
    rewardPending = true;
    console.warn(
      '[quiz-submit] El intento se guardó, pero la recompensa quedó pendiente.',
      gamificationError,
    );
  }

  return {
    attempt: {
      id: data.id,
      categoryId: data.category_id,
      score: data.score,
      correctCount: data.correct_count,
      totalQuestions: data.total_questions,
      pointsEarned: data.points_earned,
      completedAt: data.completed_at,
      answers: Array.isArray(data.answers) ? data.answers : params.answers,
    },
    unlockedBadges,
    pointsAwarded,
    totalPoints,
    rewardPending,
    previousBest,
  };
}
