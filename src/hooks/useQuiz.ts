import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@app/hooks/useAuth';
import {invalidateQuizQueries} from '@app/lib/queryInvalidation';
import {
  fetchQuizCategories,
  fetchQuizQuestions,
  submitQuizAttempt,
} from '@app/services/supabase/quiz';

export function useQuizCategories() {
  const {profile} = useAuth();
  const userId = profile?.id;

  return useQuery({
    queryKey: ['quiz-categories', userId],
    queryFn: async () => fetchQuizCategories(userId),
  });
}

export function useQuizQuestions(categoryId: string) {
  return useQuery({
    queryKey: ['quiz-questions', categoryId],
    enabled: Boolean(categoryId),
    queryFn: async () => fetchQuizQuestions(categoryId),
  });
}

export function useQuizSubmit() {
  const queryClient = useQueryClient();
  const {profile} = useAuth();

  return useMutation({
    mutationFn: async (params: {
      attemptId: string;
      categoryId: string;
      correctCount: number;
      totalQuestions: number;
      pointsEarned: number;
      answers: Array<{
        questionId: string;
        selectedAnswer: number;
        isCorrect: boolean;
        pointsEarned: number;
      }>;
    }) => {
      if (!profile?.id) {
        throw new Error('No hay una sesión activa.');
      }

      return submitQuizAttempt({
        userId: profile.id,
        ...params,
      });
    },
    onSuccess: async () => {
      if (profile?.id) {
        await invalidateQuizQueries(queryClient, profile.id);
      }
    },
  });
}
