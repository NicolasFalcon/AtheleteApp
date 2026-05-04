export type QuizCategoryPreview = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  questionCount: number;
  bestScore?: number;
  attemptsCount: number;
};

export type QuizQuestion = {
  id: string;
  categoryId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  pointsReward: number;
  sortOrder: number;
};

export type QuizAttempt = {
  id: string;
  categoryId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
  completedAt: string;
};

export type QuizQuestionRouteParams = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
};

export type QuizResultRouteParams = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
  score: number;
  isPerfect: boolean;
  unlockedBadges?: string[];
};
