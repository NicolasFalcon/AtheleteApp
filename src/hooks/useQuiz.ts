import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@app/hooks/useAuth';
import {invalidateQuizQueries} from '@app/lib/queryInvalidation';
import {
  fetchQuizOverview,
  fetchQuizQuestions,
  submitQuizAttempt,
} from '@app/services/supabase/quiz';
import type {QuizCategoryPreview, QuizOverview} from '@app/types/quiz';

// Categories + the user's rounds: one query for the Quiz portada, Inicio and
// the challenge screens (invalidated with ['quiz-categories', userId]).
export function useQuizOverview() {
  const {profile} = useAuth();
  const userId = profile?.id;

  return useQuery<QuizOverview>({
    queryKey: ['quiz-categories', userId, 'overview'],
    queryFn: async () => fetchQuizOverview(userId),
  });
}

export function useQuizCategories() {
  const {profile} = useAuth();
  const userId = profile?.id;

  return useQuery<QuizOverview, Error, QuizCategoryPreview[]>({
    queryKey: ['quiz-categories', userId, 'overview'],
    queryFn: async () => fetchQuizOverview(userId),
    select: overview => overview.categories,
  });
}

// The round is built once per attempt: a refetch (focus, reconnect) must not
// reshuffle the questions under the player, so the data never goes stale.
// `roundKey` (the attempt id) gives every round its own cache entry, so
// "Otra ronda" draws a new set instead of reusing the previous one.
export function useQuizQuestions(categoryId: string, roundKey: string) {
  return useQuery({
    queryKey: ['quiz-questions', categoryId, roundKey],
    enabled: Boolean(categoryId),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
