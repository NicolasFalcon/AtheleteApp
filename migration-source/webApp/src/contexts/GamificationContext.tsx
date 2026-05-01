import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Badge, BadgeId, UserGamificationState, PointsReason } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const ALL_BADGES: Badge[] = [
  { id: 'first_workout', title: 'Primer entreno', description: 'Completa tu primera sesión de entrenamiento.', icon: '💪' },
  { id: 'week_consistency', title: 'Semana constante', description: 'Completa 3 entrenos en una semana.', icon: '📅' },
  { id: 'core33_finisher', title: 'Core 33 completado', description: 'Finaliza el reto Athelete Core · 33.', icon: '🏆' },
  { id: 'streak_7_days', title: 'Racha de 7 días', description: 'Mantente activo 7 días seguidos.', icon: '🔥' },
  { id: 'nutrition_started', title: 'Nutrición activada', description: 'Activa tu primer plan de nutrición.', icon: '🥗' },
  { id: 'first_custom_workout', title: 'Primera rutina propia', description: 'Crea tu primera rutina personalizada en Athelete.', icon: '🛠️' },
  { id: 'quiz_master', title: 'Quiz Master', description: 'Obtén puntuación perfecta en las 3 categorías de quiz.', icon: '🧠' },
  { id: 'first_quiz', title: 'Primer Quiz', description: 'Completa tu primer quiz de fitness.', icon: '📝' },
  { id: 'hydration_3_days', title: 'Hidratación x3', description: 'Cumple tu meta de agua 3 días seguidos.', icon: '💧' },
  { id: 'hydration_7_days', title: 'Hidratación x7', description: 'Cumple tu meta de agua 7 días seguidos.', icon: '🌊' },
  { id: 'weekly_hydration_master', title: 'Semana hidratada', description: 'Cumple tu meta de agua 5+ días en una semana.', icon: '🏅' },
];

const POINTS_MAP: Record<PointsReason, number> = {
  workout_completed: 50,
  workout_canceled: 10,
  core33_day_completed: 20,
  core33_completed: 500,
  nutrition_plan_activated: 40,
  custom_workout_created: 150,
  quiz_completed: 30,
};

interface GamificationContextType {
  gamification: UserGamificationState;
  allBadges: Badge[];
  awardPoints: (reason: PointsReason) => void;
  unlockBadge: (id: BadgeId) => void;
  devGrantAll: () => void;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const userId = authUser?.id;
  const [gamification, setGamification] = useState<UserGamificationState>({ points: 0, badges: [] });

  useEffect(() => {
    if (!userId) {
      setGamification({ points: 0, badges: [] });
      return;
    }

    const load = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .single();

      const { data: userBadges } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at')
        .eq('user_id', userId);

      const earnedBadges: Badge[] = (userBadges || []).map(ub => {
        const template = ALL_BADGES.find(b => b.id === ub.badge_id);
        return template
          ? { ...template, earnedAt: ub.earned_at }
          : { id: ub.badge_id as BadgeId, title: ub.badge_id, description: '', icon: '🏅', earnedAt: ub.earned_at };
      });

      setGamification({
        points: (profile as any)?.points || 0,
        badges: earnedBadges,
      });
    };

    load();
  }, [userId]);

  const unlockBadge = useCallback(async (id: BadgeId) => {
    if (!userId) return;
    if (gamification.badges.some(b => b.id === id)) return;

    const { error } = await supabase
      .from('user_badges')
      .insert({ user_id: userId, badge_id: id });

    if (!error) {
      const template = ALL_BADGES.find(b => b.id === id);
      if (template) {
        const newBadge: Badge = { ...template, earnedAt: new Date().toISOString() };
        setGamification(prev => ({
          ...prev,
          badges: [...prev.badges, newBadge],
        }));

        setTimeout(() => {
          toast({
            title: `🎉 Nuevo logro desbloqueado: ${template.title}`,
            description: template.description,
          });
        }, 0);
      }
    }
  }, [userId, gamification.badges]);

  const awardPoints = useCallback(async (reason: PointsReason) => {
    if (!userId) return;
    const pts = POINTS_MAP[reason];

    setGamification(prev => ({ ...prev, points: prev.points + pts }));

    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();

    const currentPoints = (profile as any)?.points || 0;
    await supabase
      .from('profiles')
      .update({ points: currentPoints + pts } as any)
      .eq('id', userId);
  }, [userId]);

  const devGrantAll = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();

    for (const badge of ALL_BADGES) {
      await supabase
        .from('user_badges')
        .upsert({ user_id: userId, badge_id: badge.id, earned_at: now }, { onConflict: 'user_id,badge_id' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();

    const currentPoints = (profile as any)?.points || 0;
    await supabase
      .from('profiles')
      .update({ points: currentPoints + 100 } as any)
      .eq('id', userId);

    setGamification({
      points: currentPoints + 100,
      badges: ALL_BADGES.map(b => ({ ...b, earnedAt: now })),
    });
  }, [userId]);

  return (
    <GamificationContext.Provider value={{ gamification, allBadges: ALL_BADGES, awardPoints, unlockBadge, devGrantAll }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be used within GamificationProvider');
  return ctx;
}
