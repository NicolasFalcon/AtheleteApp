import {getSupabaseClient} from '@app/services/supabase/client';
import type {
  QuizAttempt,
  QuizCategoryPreview,
  QuizQuestion,
} from '@app/types/quiz';

function getClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  return client;
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
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
    pointsReward: typeof row.points_reward === 'number' ? row.points_reward : 10,
    sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0,
  };
}

export async function fetchQuizCategories(
  userId?: string,
): Promise<QuizCategoryPreview[]> {
  const client = getClient();

  const {data: categories, error: categoryError} = await (client as any)
    .from('quiz_categories')
    .select('*')
    .eq('is_active', true)
    .order('created_at');

  if (categoryError) {
    throw categoryError;
  }

  const {data: questions, error: questionError} = await (client as any)
    .from('quiz_questions')
    .select('id, category_id')
    .eq('is_active', true);

  if (questionError) {
    throw questionError;
  }

  let attempts: any[] = [];

  if (userId) {
    const {data: rawAttempts, error: attemptError} = await (client as any)
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId);

    if (attemptError) {
      throw attemptError;
    }

    attempts = rawAttempts || [];
  }

  return ((categories || []) as any[]).map(category => {
    const categoryAttempts = attempts.filter(
      attempt => attempt.category_id === category.id,
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
      bestScore:
        categoryAttempts.length > 0
          ? Math.max(...categoryAttempts.map(attempt => attempt.score))
          : undefined,
      attemptsCount: categoryAttempts.length,
    };
  });
}

export async function fetchQuizQuestions(
  categoryId: string,
): Promise<QuizQuestion[]> {
  const client = getClient();
  const {data, error} = await (client as any)
    .from('quiz_questions')
    .select('*')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    throw error;
  }

  const rows = ((data || []) as any[]).map(mapQuestion);
  const grouped = {
    easy: rows.filter(row => row.difficulty === 'easy'),
    medium: rows.filter(row => row.difficulty === 'medium'),
    hard: rows.filter(row => row.difficulty === 'hard'),
  };

  const picks = [
    ...shuffle(grouped.easy).slice(0, 3),
    ...shuffle(grouped.medium).slice(0, 4),
    ...shuffle(grouped.hard).slice(0, 3),
  ];

  const remaining = shuffle(
    rows.filter(row => !picks.some(pick => pick.id === row.id)),
  );

  while (picks.length < 10 && remaining.length > 0) {
    const next = remaining.shift();
    if (next) {
      picks.push(next);
    }
  }

  const difficultyOrder: Record<string, number> = {
    easy: 0,
    medium: 1,
    hard: 2,
  };

  return picks.sort(
    (left, right) =>
      (difficultyOrder[left.difficulty] ?? 1) -
      (difficultyOrder[right.difficulty] ?? 1),
  );
}

async function unlockBadgeIfNeeded(userId: string, badgeId: string) {
  const client = getClient();
  const {data: existing, error: existingError} = await (client
    .from('user_badges') as any)
    .select('badge_id')
    .eq('user_id', userId)
    .eq('badge_id', badgeId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return false;
  }

  const {error: insertError} = await (client.from('user_badges') as any).insert({
    user_id: userId,
    badge_id: badgeId,
  });

  if (insertError) {
    throw insertError;
  }

  return true;
}

async function maybeUnlockQuizMaster(userId: string, categoryId: string) {
  const client = getClient();
  const [{data: attempts, error: attemptsError}, {data: categories, error: catsError}] =
    await Promise.all([
      (client.from('quiz_attempts') as any)
        .select('category_id, score')
        .eq('user_id', userId),
      (client.from('quiz_categories') as any)
        .select('id')
        .eq('is_active', true),
    ]);

  if (attemptsError) {
    throw attemptsError;
  }

  if (catsError) {
    throw catsError;
  }

  const allCategoryIds = ((categories || []) as Array<{id: string}>).map(
    item => item.id,
  );
  const perfectCategories = new Set(
    ((attempts || []) as Array<{category_id: string; score: number}>)
      .filter(item => item.score === 100)
      .map(item => item.category_id),
  );

  perfectCategories.add(categoryId);

  if (allCategoryIds.length > 0 && allCategoryIds.every(id => perfectCategories.has(id))) {
    await unlockBadgeIfNeeded(userId, 'quiz_master');
    return true;
  }

  return false;
}

export async function submitQuizAttempt(params: {
  userId: string;
  categoryId: string;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
}): Promise<{
  attempt: QuizAttempt;
  unlockedBadges: string[];
}> {
  const client = getClient();
  const score = Math.round((params.correctCount / params.totalQuestions) * 100);

  const {data, error} = await (client.from('quiz_attempts') as any)
    .insert({
      user_id: params.userId,
      category_id: params.categoryId,
      score,
      correct_count: params.correctCount,
      total_questions: params.totalQuestions,
      points_earned: params.pointsEarned,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  const {data: profile, error: profileError} = await (client
    .from('profiles') as any)
    .select('points')
    .eq('id', params.userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const currentPoints =
    typeof profile?.points === 'number' ? profile.points : 0;

  const {error: updateError} = await (client.from('profiles') as any)
    .update({points: currentPoints + params.pointsEarned})
    .eq('id', params.userId);

  if (updateError) {
    throw updateError;
  }

  const unlockedBadges: string[] = [];
  const unlockedFirstQuiz = await unlockBadgeIfNeeded(params.userId, 'first_quiz');
  if (unlockedFirstQuiz) {
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

  return {
    attempt: {
      id: data.id,
      categoryId: data.category_id,
      score: data.score,
      correctCount: data.correct_count,
      totalQuestions: data.total_questions,
      pointsEarned: data.points_earned,
      completedAt: data.completed_at,
    },
    unlockedBadges,
  };
}
