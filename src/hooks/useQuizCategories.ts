import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@app/hooks/useAuth';
import {getSupabaseClient} from '@app/services/supabase/client';
import type {QuizCategoryPreview} from '@app/types/quiz';

export function useQuizCategories() {
  const {profile} = useAuth();
  const userId = profile?.id;

  return useQuery({
    queryKey: ['quiz-categories', userId],
    queryFn: async (): Promise<QuizCategoryPreview[]> => {
      const client = getSupabaseClient();

      if (!client) {
        return [];
      }

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
        const {data: quizAttempts, error: attemptError} = await (client as any)
          .from('quiz_attempts')
          .select('*')
          .eq('user_id', userId);

        if (attemptError) {
          throw attemptError;
        }

        attempts = quizAttempts || [];
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
    },
  });
}
