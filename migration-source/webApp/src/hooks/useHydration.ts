import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { subDays } from 'date-fns';
import {
  buildHydrationChartData,
  calculateHydrationStreak,
  summarizeHydrationWeek,
  type HydrationLog,
} from '@athelete/domain/hydration';

// Lazy import to avoid crash when GamificationProvider is not in tree
let _useGamification: (() => any) | null = null;
import('@/contexts/GamificationContext').then(mod => {
  _useGamification = mod.useGamification;
});

function useGamificationSafe() {
  if (_useGamification) {
    try {
      return _useGamification();
    } catch {
      // Not within provider
    }
  }
  return { unlockBadge: () => {}, gamification: { badges: [] } };
}

export function useHydration() {
  const { user } = useApp();
  const { unlockBadge, gamification } = useGamificationSafe();
  const userId = user.id || null;

  const [todayMl, setTodayMl] = useState(0);
  const [weekLogs, setWeekLogs] = useState<HydrationLog[]>([]);
  const [allRecentLogs, setAllRecentLogs] = useState<HydrationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const goalGlasses = user.dailyWaterGoal || 14;
  const goalMl = goalGlasses * 250;
  const todayGlasses = Math.floor(todayMl / 250);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Fetch 14 days for streak calculation
      const twoWeeksAgo = subDays(new Date(), 13).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_hydration_logs')
        .select('date, water_ml')
        .eq('user_id', userId)
        .gte('date', twoWeeksAgo)
        .order('date', { ascending: true });

      if (error) throw error;

      const logs: HydrationLog[] = (data || []).map((d: any) => ({
        date: d.date,
        water_ml: d.water_ml,
      }));
      setAllRecentLogs(logs);

      // Last 7 days for chart
      const weekAgo = subDays(new Date(), 6).toISOString().split('T')[0];
      setWeekLogs(logs.filter(l => l.date >= weekAgo));

      const todayLog = logs.find(l => l.date === todayStr);
      setTodayMl(todayLog?.water_ml ?? 0);
    } catch (err) {
      console.error('Error fetching hydration:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, todayStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate consecutive-day streak ending today (or yesterday)
  const hydrationStreak = useMemo(
    () => calculateHydrationStreak(allRecentLogs, goalMl),
    [allRecentLogs, goalMl],
  );

  // Auto-unlock hydration badges when streak/weekly thresholds are met
  useEffect(() => {
    if (!userId || goalMl <= 0) return;
    const earned = new Set(gamification.badges.map(b => b.id));

    if (hydrationStreak >= 3 && !earned.has('hydration_3_days')) {
      unlockBadge('hydration_3_days');
    }
    if (hydrationStreak >= 7 && !earned.has('hydration_7_days')) {
      unlockBadge('hydration_7_days');
    }
  }, [hydrationStreak, userId, goalMl, unlockBadge, gamification.badges]);

  const addWater = useCallback(async (ml: number) => {
    if (!userId) return;

    const newMl = todayMl + ml;
    setTodayMl(newMl);
    setWeekLogs(prev => {
      const existing = prev.find(l => l.date === todayStr);
      if (existing) {
        return prev.map(l => l.date === todayStr ? { ...l, water_ml: newMl } : l);
      }
      return [...prev, { date: todayStr, water_ml: newMl }];
    });
    setAllRecentLogs(prev => {
      const existing = prev.find(l => l.date === todayStr);
      if (existing) {
        return prev.map(l => l.date === todayStr ? { ...l, water_ml: newMl } : l);
      }
      return [...prev, { date: todayStr, water_ml: newMl }];
    });

    try {
      const { data: existing } = await supabase
        .from('daily_hydration_logs')
        .select('id, water_ml')
        .eq('user_id', userId)
        .eq('date', todayStr)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('daily_hydration_logs')
          .update({ water_ml: (existing as any).water_ml + ml })
          .eq('id', (existing as any).id);
      } else {
        await supabase
          .from('daily_hydration_logs')
          .insert({ user_id: userId, date: todayStr, water_ml: ml } as any);
      }

      toast('💧 Agua registrada', {
        description: `+${ml >= 1000 ? (ml / 1000).toFixed(1) + ' L' : ml + ' ml'}`,
        duration: 1500,
      });
    } catch (err) {
      console.error('Error adding water:', err);
      fetchData();
    }
  }, [userId, todayStr, todayMl, fetchData]);

  // Build 7-day array (filling gaps with 0)
  const chartData = useMemo(() => buildHydrationChartData(weekLogs), [weekLogs]);
  const { daysMetGoal, weeklyAverageMl } = useMemo(
    () => summarizeHydrationWeek(chartData, goalMl),
    [chartData, goalMl],
  );
  const todayPercentage = goalMl > 0 ? Math.min(100, Math.round((todayMl / goalMl) * 100)) : 0;

  // Auto-unlock weekly hydration master
  useEffect(() => {
    if (!userId || goalMl <= 0) return;
    const earned = new Set(gamification.badges.map(b => b.id));
    if (daysMetGoal >= 5 && !earned.has('weekly_hydration_master')) {
      unlockBadge('weekly_hydration_master');
    }
  }, [daysMetGoal, userId, goalMl, unlockBadge, gamification.badges]);

  return {
    todayMl,
    todayGlasses,
    goalMl,
    goalGlasses,
    todayPercentage,
    addWater,
    chartData,
    daysMetGoal,
    weeklyAverageMl,
    hydrationStreak,
    loading,
    refreshHydration: fetchData,
  };
}
