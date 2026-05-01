import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Workout } from '@/lib/types';
import { formatLocalDate, getWorkoutSessionDateKey } from '@/lib/date';

export interface DbWorkoutSession {
  id: string;
  workoutId: string;
  workoutTitle: string;
  status: 'in_progress' | 'completed' | 'canceled';
  startedAt: string | null;
  endedAt: string | null;
  duration: number;
  caloriesBurned: number;
  completedExercises: string[];
  totalExercises: number;
  date: string;
}

interface SessionDateCandidate {
  date: string;
  startedAt?: string | null;
  endedAt?: string | null;
}

interface WorkoutSessionContextType {
  todaySession: DbWorkoutSession | null;
  isLoadingSession: boolean;
  startSession: (workout: Workout) => Promise<void>;
  toggleExercise: (exerciseId: string) => void;
  finishSession: () => Promise<void>;
  cancelSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  resetSession: () => void;
  refreshSession: () => Promise<void>;
}

const WorkoutSessionContext = createContext<WorkoutSessionContextType | undefined>(undefined);

function getTodayDate(): string {
  return formatLocalDate();
}

export function WorkoutSessionProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const { refreshWorkoutSessions } = useApp();
  const userId = authUser?.id;
  const [todaySession, setTodaySession] = useState<DbWorkoutSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Debounce timer for persisting exercise toggles
  const persistTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapRow = (row: any): DbWorkoutSession => ({
    id: row.id,
    workoutId: row.workout_id || '',
    workoutTitle: row.workout_title || '',
    status: row.status as DbWorkoutSession['status'],
    startedAt: row.started_at || null,
    endedAt: row.ended_at || null,
    duration: row.duration || 0,
    caloriesBurned: row.calories_burned || 0,
    completedExercises: (row.completed_exercises as string[]) || [],
    totalExercises: row.total_exercises || 0,
    date: row.date,
  });

  const isSessionForDate = useCallback((session: SessionDateCandidate, date: string) => {
    return getWorkoutSessionDateKey(session) === date;
  }, []);

  const cancelSessionsByIds = useCallback(async (ids: string[]) => {
    if (!ids.length) return;

    await supabase
      .from('workout_sessions')
      .update({
        status: 'canceled',
        completed: false,
        ended_at: new Date().toISOString(),
      })
      .in('id', ids);
  }, []);

  // Load today's active or most recent session using local-day semantics.
  const loadTodaySession = useCallback(async () => {
    if (!userId) {
      setTodaySession(null);
      setIsLoadingSession(false);
      return;
    }
    try {
      const today = getTodayDate();
      let didMutateSessions = false;
      const { data: inProgressRows } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false });

      const staleInProgressIds = (inProgressRows || [])
        .filter((row) => !isSessionForDate({
          date: row.date,
          startedAt: row.started_at,
          endedAt: row.ended_at,
        }, today))
        .map((row) => row.id);

      if (staleInProgressIds.length > 0) {
        await cancelSessionsByIds(staleInProgressIds);
        didMutateSessions = true;
      }

      const todayInProgressRows = (inProgressRows || []).filter((row) =>
        isSessionForDate({
          date: row.date,
          startedAt: row.started_at,
          endedAt: row.ended_at,
        }, today)
      );

      if (todayInProgressRows.length > 1) {
        await cancelSessionsByIds(todayInProgressRows.slice(1).map((row) => row.id));
        didMutateSessions = true;
      }

      if (didMutateSessions) {
        await refreshWorkoutSessions();
      }

      const activeToday = todayInProgressRows[0];

      if (activeToday) {
        setTodaySession(mapRow(activeToday));
        return;
      }

      const { data: recentRows } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      const rowsForToday = (recentRows || []).filter(
        (row) => isSessionForDate({
            date: row.date,
            startedAt: row.started_at,
            endedAt: row.ended_at,
          }, today),
      );
      const resumableToday = rowsForToday.find(
        (row) =>
          row.status === 'canceled' &&
          (((row.completed_exercises as string[] | null) || []).length > 0 ||
            (row.duration || 0) > 0),
      );
      const completedToday = rowsForToday.find((row) => row.status === 'completed');
      const resolvedToday = resumableToday || completedToday || null;

      if (resolvedToday) {
        setTodaySession(mapRow(resolvedToday));
      } else {
        setTodaySession(null);
      }
    } catch (err) {
      console.error('Error loading workout session:', err);
    } finally {
      setIsLoadingSession(false);
    }
  }, [cancelSessionsByIds, isSessionForDate, refreshWorkoutSessions, userId]);

  useEffect(() => {
    loadTodaySession();
  }, [loadTodaySession]);

  useEffect(() => {
    if (!userId) return;

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        void loadTodaySession();
      }
    };

    window.addEventListener('focus', handleVisibilityRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    return () => {
      window.removeEventListener('focus', handleVisibilityRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    };
  }, [loadTodaySession, userId]);

  const refreshSession = useCallback(async () => {
    await loadTodaySession();
  }, [loadTodaySession]);

  const startSession = useCallback(async (workout: Workout) => {
    if (!userId) return;
    const today = getTodayDate();
    const now = new Date().toISOString();

    const { data: inProgressRows } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false });

    const matchingTodaySession = (inProgressRows || []).find((row) =>
      row.workout_id === workout.id &&
      isSessionForDate({
        date: row.date,
        startedAt: row.started_at,
        endedAt: row.ended_at,
      }, today)
    );

    if (matchingTodaySession) {
      const otherInProgressIds = (inProgressRows || [])
        .filter((row) => row.id !== matchingTodaySession.id)
        .map((row) => row.id);

      if (otherInProgressIds.length > 0) {
        await cancelSessionsByIds(otherInProgressIds);
        await refreshWorkoutSessions();
      }

      setTodaySession(mapRow(matchingTodaySession));
      return;
    }

    const allInProgressIds = (inProgressRows || []).map((row) => row.id);

    if (allInProgressIds.length > 0) {
      await cancelSessionsByIds(allInProgressIds);
    }

    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        workout_id: workout.id,
        workout_title: workout.title,
        date: today,
        status: 'in_progress',
        started_at: now,
        completed: false,
        duration: 0,
        calories_burned: 0,
        completed_exercises: [],
        total_exercises: workout.exercises.length,
      })
      .select()
      .single();

    if (!error && data) {
      setTodaySession(mapRow(data));
      await refreshWorkoutSessions();
    }
  }, [cancelSessionsByIds, isSessionForDate, refreshWorkoutSessions, userId]);

  // Persist completed exercises to DB (debounced)
  const persistExercises = useCallback((sessionId: string, exercises: string[]) => {
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from('workout_sessions')
        .update({ completed_exercises: exercises })
        .eq('id', sessionId);
    }, 500);
  }, []);

  const toggleExercise = useCallback((exerciseId: string) => {
    setTodaySession((prev) => {
      if (!prev || prev.status !== 'in_progress') return prev;
      const has = prev.completedExercises.includes(exerciseId);
      const newCompleted = has
        ? prev.completedExercises.filter((id) => id !== exerciseId)
        : [...prev.completedExercises, exerciseId];
      
      // Persist to DB
      persistExercises(prev.id, newCompleted);

      return { ...prev, completedExercises: newCompleted };
    });
  }, [persistExercises]);

  const computeElapsed = (startedAt: string | null): number => {
    if (!startedAt) return 0;
    return Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
  };

  const finishSession = useCallback(async () => {
    if (!todaySession) return;
    const now = new Date().toISOString();
    const elapsed = computeElapsed(todaySession.startedAt);

    const { error } = await supabase
      .from('workout_sessions')
      .update({
        status: 'completed',
        completed: true,
        ended_at: now,
        duration: elapsed,
        completed_exercises: todaySession.completedExercises,
      })
      .eq('id', todaySession.id);

    if (!error) {
      setTodaySession(prev => prev ? {
        ...prev,
        status: 'completed',
        endedAt: now,
        duration: elapsed,
      } : null);
      // Refresh AppContext workout sessions so Progress tab updates
      await refreshWorkoutSessions();
    }
  }, [todaySession, refreshWorkoutSessions]);

  const cancelSession = useCallback(async () => {
    if (!todaySession) return;
    const now = new Date().toISOString();
    const elapsed = computeElapsed(todaySession.startedAt);

    const { error } = await supabase
      .from('workout_sessions')
      .update({
        status: 'canceled',
        completed: false,
        ended_at: now,
        duration: elapsed,
        completed_exercises: todaySession.completedExercises,
      })
      .eq('id', todaySession.id);

    if (!error) {
      setTodaySession(prev => prev ? {
        ...prev,
        status: 'canceled',
        endedAt: now,
        duration: elapsed,
      } : null);
      await refreshWorkoutSessions();
    }
  }, [todaySession, refreshWorkoutSessions]);

  const resumeSession = useCallback(async () => {
    if (!todaySession || todaySession.status !== 'canceled') return;
    const resumedStartedAt = new Date(
      Date.now() - todaySession.duration * 60000
    ).toISOString();

    const { error } = await supabase
      .from('workout_sessions')
      .update({
        status: 'in_progress',
        started_at: resumedStartedAt,
        ended_at: null,
      })
      .eq('id', todaySession.id);

    if (!error) {
      setTodaySession(prev => prev ? {
        ...prev,
        status: 'in_progress',
        startedAt: resumedStartedAt,
        endedAt: null,
      } : null);
      await refreshWorkoutSessions();
    }
  }, [refreshWorkoutSessions, todaySession]);

  const resetSession = useCallback(() => {
    setTodaySession(null);
  }, []);

  return (
    <WorkoutSessionContext.Provider
      value={{
        todaySession,
        isLoadingSession,
        startSession,
        toggleExercise,
        finishSession,
        cancelSession,
        resumeSession,
        resetSession,
        refreshSession,
      }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  );
}

export function useWorkoutSession() {
  const ctx = useContext(WorkoutSessionContext);
  if (!ctx) {
    throw new Error('useWorkoutSession must be used within WorkoutSessionProvider');
  }
  return ctx;
}
