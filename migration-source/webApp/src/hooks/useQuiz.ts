import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface QuizCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  questionCount?: number;
  bestScore?: number;
  attemptsCount?: number;
}

export interface QuizQuestion {
  id: string;
  categoryId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string | null;
  difficulty: string;
  pointsReward: number;
  sortOrder: number;
}

export interface QuizAttempt {
  id: string;
  categoryId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
  completedAt: string;
}

export function useQuizCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: cats } = await supabase
        .from('quiz_categories')
        .select('*')
        .eq('is_active', true)
        .order('created_at');

      if (!cats) { setLoading(false); return; }

      // Get question counts per category
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('id, category_id')
        .eq('is_active', true);

      // Get user attempts
      let attempts: any[] = [];
      if (user) {
        const { data } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('user_id', user.id);
        attempts = data ?? [];
      }

      const mapped: QuizCategory[] = cats.map((c: any) => {
        const qCount = questions?.filter(q => q.category_id === c.id).length ?? 0;
        const catAttempts = attempts.filter(a => a.category_id === c.id);
        const best = catAttempts.length > 0 
          ? Math.max(...catAttempts.map((a: any) => a.score)) 
          : undefined;
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          icon: c.icon,
          questionCount: qCount,
          bestScore: best,
          attemptsCount: catAttempts.length,
        };
      });

      setCategories(mapped);
      setLoading(false);
    };
    load();
  }, [user]);

  return { categories, loading };
}

export function useQuizQuestions(categoryId: string) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('sort_order');

      if (data) {
        // Group by difficulty, pick randomly within each tier, then order easy→medium→hard
        const diffOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
        const grouped: Record<string, any[]> = { easy: [], medium: [], hard: [] };
        data.forEach((q: any) => {
          const d = q.difficulty ?? 'medium';
          (grouped[d] ??= []).push(q);
        });

        // Shuffle within each group
        Object.values(grouped).forEach(arr => arr.sort(() => Math.random() - 0.5));

        // Pick: 3 easy, 4 medium, 3 hard (fallback fills from other pools)
        const picks: any[] = [
          ...grouped.easy.splice(0, 3),
          ...grouped.medium.splice(0, 4),
          ...grouped.hard.splice(0, 3),
        ];

        // If we don't have 10 yet, fill from remaining
        const remaining = [...grouped.easy, ...grouped.medium, ...grouped.hard]
          .sort(() => Math.random() - 0.5);
        while (picks.length < 10 && remaining.length > 0) {
          picks.push(remaining.shift()!);
        }

        // Sort by difficulty: easy first, hard last
        picks.sort((a, b) => (diffOrder[a.difficulty ?? 'medium'] ?? 1) - (diffOrder[b.difficulty ?? 'medium'] ?? 1));

        setQuestions(picks.map((q: any) => ({
          id: q.id,
          categoryId: q.category_id,
          question: q.question,
          options: q.options as string[],
          correctAnswer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          pointsReward: q.points_reward,
          sortOrder: q.sort_order,
        })));
      }
      setLoading(false);
    };
    load();
  }, [categoryId]);

  return { questions, loading };
}

export function useQuizSubmit() {
  const { user } = useAuth();

  const submitAttempt = useCallback(async (
    categoryId: string,
    correctCount: number,
    totalQuestions: number,
    pointsEarned: number,
  ) => {
    if (!user) return null;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        category_id: categoryId,
        score,
        correct_count: correctCount,
        total_questions: totalQuestions,
        points_earned: pointsEarned,
      })
      .select()
      .single();

    if (error) { console.error('Quiz submit error:', error); return null; }
    return data;
  }, [user]);

  return { submitAttempt };
}
