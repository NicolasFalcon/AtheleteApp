export type QuizCategoryPreview = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  questionCount: number;
  // Percentage (0-100) of the best attempt.
  bestScore?: number;
  // Hits of the best attempt, and the questions it had ("8" of "10").
  bestCorrect?: number;
  bestTotal?: number;
  attemptsCount: number;
};

// A saved round, as listed in "Últimas rondas" and used for the week.
export type QuizAttemptSummary = {
  id: string;
  categoryId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
  completedAt: string;
};

export type QuizOverview = {
  categories: QuizCategoryPreview[];
  attempts: QuizAttemptSummary[];
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
  answers: QuizAttemptAnswer[];
};

export type QuizAttemptAnswer = {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  pointsEarned: number;
};

export type QuizLandingRouteParams = undefined;

export type QuizChallengeRouteParams = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
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
  attemptId: string;
  answers: QuizAttemptAnswer[];
  correctCount: number;
  totalQuestions: number;
  // Points computed by the app (streak included); the server has the last word.
  pointsEarned: number;
  score: number;
  isPerfect: boolean;
  bestStreak: number;
  // Texts of the questions that were missed ("Repasemos esto").
  missed: string[];
};
