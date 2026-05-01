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
