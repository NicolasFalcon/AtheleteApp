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

export type QuizDevState = 'data' | 'new' | 'perfect' | 'empty' | 'loading' | 'error';

export type QuizLandingRouteParams =
  | {
      // Development only: sample data / forced state (nothing is read).
      devState?: QuizDevState;
    }
  | undefined;

export type QuizChallengeRouteParams = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  devState?: 'record' | 'new';
};

export type QuizQuestionRouteParams = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  // Development only: freezes the round at a sample moment.
  devState?:
    | 'new'
    | 'correct'
    | 'incorrect'
    | 'streak'
    | 'loading'
    | 'error'
    | 'empty';
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
  // Development only: sample best before this round (the real one comes from
  // the server when the round is saved).
  devPreviousBest?: {
    score: number;
    correctCount: number;
    totalQuestions: number;
  } | null;
  // Development only: shows a saved / saving / failed result with sample data.
  devState?:
    | 'low'
    | 'mid'
    | 'perfect'
    | 'record'
    | 'saving'
    | 'error'
    | 'firstQuiz'
    | 'master';
};
