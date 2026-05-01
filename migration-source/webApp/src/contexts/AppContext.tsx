import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Workout, Exercise, HabitChallenge, NutritionPlan, DailyNutritionLog, WorkoutSession, Habit, Coach, ChatMessage, Specialist } from '@/lib/types';
import { mockCoaches, mockSpecialists, habitOptions } from '@/lib/mockData';
import { formatLocalDate } from '@/lib/date';
import { getWorkoutAccess } from '@/lib/workoutOwnership';
import {
  getChallengeDay as getCore33Day,
  getCompletedChallengeDays,
  getCurrentChallengeStreak,
  getLongestChallengeStreak,
  isChallengeDayCompleted,
} from '@athelete/domain/core33';
import {
  dedupeFeaturedTemplates,
  mapTemplateExerciseRowToExercise,
  mapTemplateRowToWorkout,
} from '@athelete/data/workouts';
import {
  buildFeaturedRoutineTemplatePayload,
  featuredRoutineDefinitions,
  getFeaturedSource,
} from '@/lib/featuredRoutines';

interface AppContextType {
  user: {
    id: string;
    name: string;
    email: string;
    birthDate: string;
    weight: number;
    height: number;
    goal: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_health';
    trainingDaysPerWeek: number;
    dailyCalorieGoal: number;
    dailyProteinGoal: number;
    dailyCarbsGoal: number;
    dailyFatGoal: number;
    dailyWaterGoal: number;
    trainingEnvironment: string;
    availableEquipment: string[];
    restrictionsNotes: string;
    injuryNotes: string;
    exercisePreferences: string[];
    exerciseAvoidances: string[];
    dietPreferences: string[];
    foodAvoidances: string[];
  };
  setUser: React.Dispatch<React.SetStateAction<AppContextType['user']>>;
  challenge: HabitChallenge | null;
  setChallenge: React.Dispatch<React.SetStateAction<HabitChallenge | null>>;
  workoutSessions: WorkoutSession[];
  addWorkoutSession: (session: Omit<WorkoutSession, 'id'>) => void;
  refreshWorkoutSessions: () => Promise<void>;
  habitLogs: Record<string, boolean[]>;
  toggleHabitLog: (date: string, habitIndex: number) => void;
  startChallenge: (habits: Habit[]) => void;
  getChallengeDay: () => number;
  isDayCompleted: (date: string) => boolean;
  getCompletedDays: () => number;
  getCurrentStreak: () => number;
  assignedCoach: Coach | null;
  assignCoach: (coach: Coach) => void;
  chatMessages: ChatMessage[];
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  acceptNutritionPlanFromChat: (messageId: string) => void;
  workouts: Workout[];
  addCustomWorkout: (workout: Omit<Workout, 'id'>) => Promise<Workout | null>;
  updateWorkout: (workoutId: string, workout: Omit<Workout, 'id'>) => Promise<Workout | null>;
  refreshWorkouts: () => Promise<void>;
  deleteWorkout: (workoutId: string) => Promise<boolean>;
  assignedSpecialist: Specialist | null;
  assignSpecialist: (specialist: Specialist) => void;
  restartChallenge: () => void;
  getLongestStreak: () => number;
  nutritionPlan: NutritionPlan | null;
  setNutritionPlan: React.Dispatch<React.SetStateAction<NutritionPlan | null>>;
  deactivateNutritionPlan: () => Promise<void>;
  dailyNutritionLogs: DailyNutritionLog[];
  getTodayNutritionLog: () => DailyNutritionLog | null;
  upsertTodayNutritionLog: (data: Pick<DailyNutritionLog, 'calories' | 'protein' | 'carbs' | 'fats' | 'adherence'>) => void;
  hasPendingNutritionPlan: () => boolean;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const userId = authUser?.id;

  // User profile state (from profiles table)
  const [user, setUser] = useState<AppContextType['user']>({
    id: '', name: '', email: '', birthDate: '', weight: 0, height: 0,
    goal: 'maintain', trainingDaysPerWeek: 3,
    dailyCalorieGoal: 2000, dailyProteinGoal: 120,
    dailyCarbsGoal: 250, dailyFatGoal: 65, dailyWaterGoal: 14,
    trainingEnvironment: 'gym', availableEquipment: [],
    restrictionsNotes: '', injuryNotes: '',
    exercisePreferences: [], exerciseAvoidances: [],
    dietPreferences: [], foodAvoidances: [],
  });

  // Data states
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null);
  const [dailyNutritionLogs, setDailyNutritionLogs] = useState<DailyNutritionLog[]>([]);
  const [challenge, setChallenge] = useState<HabitChallenge | null>(null);
  const [habitLogs, setHabitLogs] = useState<Record<string, boolean[]>>({});
  const [assignedCoach, setAssignedCoach] = useState<Coach | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [assignedSpecialist, setAssignedSpecialist] = useState<Specialist | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const ensureFeaturedEditorialWorkouts = useCallback(async () => {
    if (!userId) return;

    const featuredSources = featuredRoutineDefinitions.map((routine) => getFeaturedSource(routine.slug));
    const { data: existingTemplates, error: existingError } = await supabase
      .from('workout_templates')
      .select('id, source, title, description, type, difficulty, duration, calories, target_muscles, image_url, tags, created_by_ai, is_public, created_at')
      .eq('created_by', userId)
      .in('source', featuredSources)
      .order('created_at', { ascending: false });

    if (existingError) {
      console.error('Error checking featured routines:', existingError);
      return;
    }

    const canonicalTemplateBySource = new Map<string, typeof existingTemplates[number]>();
    const duplicateTemplates: Array<{ id: string; canonicalId: string }> = [];

    for (const template of existingTemplates || []) {
      if (!template.source) {
        continue;
      }

      const canonicalTemplate = canonicalTemplateBySource.get(template.source);
      if (!canonicalTemplate) {
        canonicalTemplateBySource.set(template.source, template);
        continue;
      }

      duplicateTemplates.push({
        id: template.id,
        canonicalId: canonicalTemplate.id,
      });
    }

    if (duplicateTemplates.length > 0) {
      for (const duplicateTemplate of duplicateTemplates) {
        const { error: sessionError } = await supabase
          .from('workout_sessions')
          .update({
            workout_id: duplicateTemplate.canonicalId,
          })
          .eq('user_id', userId)
          .eq('workout_id', duplicateTemplate.id);

        if (sessionError) {
          console.error('Error re-linking duplicate featured routine sessions:', sessionError);
          return;
        }
      }

      const duplicateTemplateIds = duplicateTemplates.map((template) => template.id);
      const { error: deleteExercisesError } = await supabase
        .from('template_exercises')
        .delete()
        .in('template_id', duplicateTemplateIds);

      if (deleteExercisesError) {
        console.error('Error deleting duplicate featured routine exercises:', deleteExercisesError);
        return;
      }

      const { error: deleteTemplatesError } = await supabase
        .from('workout_templates')
        .delete()
        .eq('created_by', userId)
        .in('id', duplicateTemplateIds);

      if (deleteTemplatesError) {
        console.error('Error deleting duplicate featured routines:', deleteTemplatesError);
        return;
      }
    }

    const exerciseNames = Array.from(
      new Set(
        featuredRoutineDefinitions.flatMap((routine) => routine.exercises.map((exercise) => exercise.name))
      )
    );

    const { data: exerciseRows } = await supabase
      .from('exercises')
      .select('id, name')
      .in('name', exerciseNames);

    const exerciseIdByName = new Map((exerciseRows || []).map((exercise) => [exercise.name, exercise.id]));

    const canonicalTemplateIds = Array.from(canonicalTemplateBySource.values()).map((template) => template.id);
    const { data: existingExerciseRows, error: existingExercisesError } = canonicalTemplateIds.length > 0
      ? await supabase
        .from('template_exercises')
        .select('template_id, name, exercise_id, sets, reps, duration, rest_time, notes, sort_order')
        .in('template_id', canonicalTemplateIds)
        .order('sort_order')
      : { data: [], error: null };

    if (existingExercisesError) {
      console.error('Error checking featured routine exercises:', existingExercisesError);
      return;
    }

    const existingExercisesByTemplate = (existingExerciseRows || []).reduce<Record<string, Array<{
      name: string;
      exercise_id: string | null;
      sets: number | null;
      reps: number | null;
      duration: number | null;
      rest_time: number | null;
      notes: string | null;
      sort_order: number | null;
    }>>>((acc, exercise) => {
      if (!acc[exercise.template_id]) {
        acc[exercise.template_id] = [];
      }

      acc[exercise.template_id].push(exercise);
      return acc;
    }, {});

    for (const routine of featuredRoutineDefinitions) {
      const source = getFeaturedSource(routine.slug);
      const templatePayload = buildFeaturedRoutineTemplatePayload(routine);
      const desiredExercises = routine.exercises.map((exercise, index) => ({
        name: exercise.name,
        exercise_id: exerciseIdByName.get(exercise.name) || null,
        sets: exercise.sets ?? null,
        reps: exercise.reps ?? null,
        duration: exercise.duration ?? null,
        rest_time: exercise.restTime,
        notes: exercise.notes || null,
        sort_order: index,
      }));
      const existingTemplate = canonicalTemplateBySource.get(source);

      if (existingTemplate) {
        const currentTags = existingTemplate.tags || [];
        const currentTargetMuscles = existingTemplate.target_muscles || [];
        const currentExercises = existingExercisesByTemplate[existingTemplate.id] || [];

        const templateChanged =
          existingTemplate.title !== templatePayload.title ||
          existingTemplate.description !== templatePayload.description ||
          existingTemplate.type !== templatePayload.type ||
          existingTemplate.difficulty !== templatePayload.difficulty ||
          existingTemplate.duration !== templatePayload.duration ||
          existingTemplate.calories !== templatePayload.calories ||
          existingTemplate.image_url !== templatePayload.image_url ||
          existingTemplate.created_by_ai !== templatePayload.created_by_ai ||
          existingTemplate.is_public !== templatePayload.is_public ||
          JSON.stringify(currentTargetMuscles) !== JSON.stringify(templatePayload.target_muscles) ||
          JSON.stringify(currentTags) !== JSON.stringify(templatePayload.tags);

        if (templateChanged) {
          const { error: updateTemplateError } = await supabase
            .from('workout_templates')
            .update(templatePayload)
            .eq('id', existingTemplate.id)
            .eq('created_by', userId);

          if (updateTemplateError) {
            console.error('Error updating featured routine:', routine.slug, updateTemplateError);
            continue;
          }
        }

        const exercisesChanged =
          currentExercises.length !== desiredExercises.length ||
          currentExercises.some((exercise, index) => {
            const desired = desiredExercises[index];
            return (
              exercise.name !== desired.name ||
              exercise.exercise_id !== desired.exercise_id ||
              exercise.sets !== desired.sets ||
              exercise.reps !== desired.reps ||
              exercise.duration !== desired.duration ||
              exercise.rest_time !== desired.rest_time ||
              exercise.notes !== desired.notes ||
              exercise.sort_order !== desired.sort_order
            );
          });

        if (!exercisesChanged) {
          continue;
        }

        const { error: deleteExistingExercisesError } = await supabase
          .from('template_exercises')
          .delete()
          .eq('template_id', existingTemplate.id);

        if (deleteExistingExercisesError) {
          console.error('Error resetting featured routine exercises:', routine.slug, deleteExistingExercisesError);
          continue;
        }

        const { error: replaceExercisesError } = await supabase
          .from('template_exercises')
          .insert(
            desiredExercises.map((exercise) => ({
              template_id: existingTemplate.id,
              ...exercise,
            }))
          );

        if (replaceExercisesError) {
          console.error('Error replacing featured routine exercises:', routine.slug, replaceExercisesError);
        }

        continue;
      }

      const { data: insertedTemplate, error: insertTemplateError } = await supabase
        .from('workout_templates')
        .insert({
          ...templatePayload,
          created_by: userId,
        })
        .select()
        .single();

      if (insertTemplateError || !insertedTemplate) {
        console.error('Error creating featured routine:', routine.slug, insertTemplateError);
        continue;
      }

      const { error: insertExercisesError } = await supabase
        .from('template_exercises')
        .insert(
          desiredExercises.map((exercise) => ({
            template_id: insertedTemplate.id,
            ...exercise,
          }))
        );

      if (insertExercisesError) {
        console.error('Error creating featured routine exercises:', routine.slug, insertExercisesError);
        await supabase.from('workout_templates').delete().eq('id', insertedTemplate.id);
      }
    }
  }, [userId]);

  const refreshNutritionPlan = useCallback(async () => {
    if (!userId) {
      setNutritionPlan(null);
      return;
    }

    const { data: plans } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    if (plans && plans.length > 0) {
      const p = plans[0];
      setNutritionPlan({
        id: p.id,
        userId: p.user_id,
        targetCalories: p.target_calories,
        targetProtein: p.target_protein,
        targetCarbs: p.target_carbs ?? undefined,
        targetFats: p.target_fats ?? undefined,
        notes: p.notes ?? undefined,
      });
    } else {
      setNutritionPlan(null);
    }
  }, [userId]);

  // ─── Load real data from Supabase ───────────────────────────────
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        await ensureFeaturedEditorialWorkouts();

        // 1. Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profile) {
          setUser({
            id: userId,
            name: profile.name || '',
            email: authUser?.email || '',
            birthDate: profile.birth_date || '',
            weight: Number(profile.weight) || 0,
            height: Number(profile.height) || 0,
            goal: (profile.goal as AppContextType['user']['goal']) || 'maintain',
            trainingDaysPerWeek: profile.training_days_per_week || 3,
            dailyCalorieGoal: (profile as any).daily_calorie_goal || 2000,
            dailyProteinGoal: (profile as any).daily_protein_goal || 120,
            dailyCarbsGoal: (profile as any).daily_carbs_goal || 250,
            dailyFatGoal: (profile as any).daily_fat_goal || 65,
            dailyWaterGoal: (profile as any).daily_water_goal || 14,
            trainingEnvironment: (profile as any).training_environment || 'gym',
            availableEquipment: (profile as any).available_equipment || [],
            restrictionsNotes: (profile as any).restrictions_notes || '',
            injuryNotes: (profile as any).injury_notes || '',
            exercisePreferences: (profile as any).exercise_preferences || [],
            exerciseAvoidances: (profile as any).exercise_avoidances || [],
            dietPreferences: (profile as any).diet_preferences || [],
            foodAvoidances: (profile as any).food_avoidances || [],
          });
        }

        // 2. Workout templates → Workout[]
        const { data: templates } = await supabase
          .from('workout_templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (templates && templates.length > 0) {
          // Load exercises for all templates
          const templateIds = templates.map(t => t.id);
          const { data: exercises } = await supabase
            .from('template_exercises')
            .select('*')
            .in('template_id', templateIds)
            .order('sort_order');

          const exercisesByTemplate = (exercises || []).reduce<Record<string, Exercise[]>>((acc, ex) => {
            if (!acc[ex.template_id]) acc[ex.template_id] = [];
            acc[ex.template_id].push(mapTemplateExerciseRowToExercise(ex));
            return acc;
          }, {});

          setWorkouts(
            dedupeFeaturedTemplates(templates).map((template) =>
              mapTemplateRowToWorkout(template, exercisesByTemplate)
            )
          );
        } else {
          setWorkouts([]);
        }

        // 3. Workout sessions
        const { data: sessions } = await supabase
          .from('workout_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });

        setWorkoutSessions((sessions || []).map(s => ({
          id: s.id,
          workoutId: s.workout_id || '',
          userId: s.user_id,
          date: s.date,
          completed: s.completed || false,
          duration: s.duration || 0,
          caloriesBurned: s.calories_burned || 0,
          status: (s as any).status || undefined,
          startedAt: (s as any).started_at || null,
          endedAt: (s as any).ended_at || null,
          createdAt: (s as any).created_at || undefined,
        })));

        // 4. Nutrition plan (active)
        await refreshNutritionPlan();

        // 5. Daily nutrition logs (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: logs } = await supabase
          .from('daily_nutrition_logs')
          .select('*')
          .eq('user_id', userId)
          .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: false });

        setDailyNutritionLogs((logs || []).map(l => ({
          id: l.id,
          userId: l.user_id,
          date: l.date,
          calories: l.calories || 0,
          protein: l.protein || 0,
          carbs: l.carbs ?? undefined,
          fats: l.fats ?? undefined,
          adherence: l.adherence ?? undefined,
        })));

        // 6. Challenge participation (active)
        const { data: participations } = await supabase
          .from('challenge_participations')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .limit(1);

        if (participations && participations.length > 0) {
          const cp = participations[0];
          const habits = (cp.habits as any[]) || [];
          setChallenge({
            id: cp.id,
            userId: cp.user_id,
            status: cp.status as HabitChallenge['status'],
            startDate: cp.start_date,
            habits: habits.map((h: any, i: number) => ({
              id: h.id || `h${i}`,
              challengeId: cp.id,
              category: h.category || 'training',
              name: h.name || '',
            })),
          });

          // Load habit logs for this participation
          const { data: hLogs } = await supabase
            .from('habit_logs')
            .select('*')
            .eq('participation_id', cp.id);

          const logMap: Record<string, boolean[]> = {};
          (hLogs || []).forEach(hl => {
            if (!logMap[hl.date]) logMap[hl.date] = [false, false, false];
            if (hl.habit_index >= 0 && hl.habit_index < 3) {
              logMap[hl.date][hl.habit_index] = hl.completed || false;
            }
          });
          setHabitLogs(logMap);
        } else {
          setChallenge(null);
          setHabitLogs({});
        }
      } catch (err) {
        console.error('Error loading app data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId, authUser?.email, ensureFeaturedEditorialWorkouts, refreshNutritionPlan]);

  // ─── Workout sessions ───────────────────────────────────────────
  const refreshWorkoutSessions = useCallback(async () => {
    if (!userId) return;
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    setWorkoutSessions((sessions || []).map(s => ({
      id: s.id,
      workoutId: s.workout_id || '',
      userId: s.user_id,
      date: s.date,
      completed: s.completed || false,
      duration: s.duration || 0,
      caloriesBurned: s.calories_burned || 0,
      status: (s as any).status || undefined,
      startedAt: (s as any).started_at || null,
      endedAt: (s as any).ended_at || null,
      createdAt: (s as any).created_at || undefined,
    })));
  }, [userId]);

  const addWorkoutSession = useCallback(async (session: Omit<WorkoutSession, 'id'>) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        workout_id: session.workoutId || null,
        workout_title: '',
        date: session.date,
        completed: session.completed,
        duration: session.duration,
        calories_burned: session.caloriesBurned,
      })
      .select()
      .single();

    if (!error && data) {
      setWorkoutSessions(prev => [{
        id: data.id,
        workoutId: data.workout_id || '',
        userId: data.user_id,
        date: data.date,
        completed: data.completed || false,
        duration: data.duration || 0,
        caloriesBurned: data.calories_burned || 0,
        status: (data as any).status || undefined,
        startedAt: (data as any).started_at || null,
        endedAt: (data as any).ended_at || null,
        createdAt: (data as any).created_at || undefined,
      }, ...prev]);
    }
  }, [userId]);

  // ─── Challenge ──────────────────────────────────────────────────
  const startChallenge = useCallback(async (habits: Habit[]) => {
    if (!userId) return;
    const habitsJson = habits.map(h => ({
      id: h.id,
      category: h.category,
      name: h.name,
    }));

    const { data, error } = await supabase
      .from('challenge_participations')
      .insert({
        user_id: userId,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        habits: habitsJson,
      })
      .select()
      .single();

    if (!error && data) {
      setChallenge({
        id: data.id,
        userId: data.user_id,
        status: 'active',
        startDate: data.start_date,
        habits,
      });
      setHabitLogs({});
    }
  }, [userId]);

  const getChallengeDay = (): number => {
    return getCore33Day(challenge);
  };

  const isDayCompleted = (date: string): boolean => {
    return isChallengeDayCompleted(habitLogs, date);
  };

  const getCompletedDays = (): number => {
    return getCompletedChallengeDays(habitLogs);
  };

  const getCurrentStreak = (): number => {
    return getCurrentChallengeStreak(challenge, habitLogs);
  };

  const getLongestStreak = (): number => {
    return getLongestChallengeStreak(challenge, habitLogs);
  };

  const toggleHabitLog = useCallback(async (date: string, habitIndex: number) => {
    if (!userId || !challenge) return;
    const dayLogs = habitLogs[date] || [false, false, false];
    const newVal = !dayLogs[habitIndex];

    // Optimistic update
    const newDayLogs = [...dayLogs];
    newDayLogs[habitIndex] = newVal;
    setHabitLogs(prev => ({ ...prev, [date]: newDayLogs }));

    // Upsert to DB
    await supabase
      .from('habit_logs')
      .upsert({
        participation_id: challenge.id,
        user_id: userId,
        date,
        habit_index: habitIndex,
        completed: newVal,
      }, { onConflict: 'participation_id,date,habit_index' });
  }, [userId, challenge, habitLogs]);

  const restartChallenge = useCallback(async () => {
    if (!userId || !challenge) {
      setChallenge(null);
      setHabitLogs({});
      return;
    }
    // Mark current as abandoned
    await supabase
      .from('challenge_participations')
      .update({ status: 'abandoned' })
      .eq('id', challenge.id);

    setChallenge(null);
    setHabitLogs({});
  }, [userId, challenge]);

  // ─── Coach (still local for now – catalog data) ─────────────────
  const assignCoach = (coach: Coach) => {
    setAssignedCoach(coach);
  };

  const addChatMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `m${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const acceptNutritionPlanFromChat = async (messageId: string) => {
    setChatMessages(prev =>
      prev.map(m => m.id === messageId ? { ...m, nutritionPlanAccepted: true } : m)
    );
    const msg = chatMessages.find(m => m.id === messageId);
    if (msg?.nutritionPlanData && userId) {
      await supabase
        .from('nutrition_plans')
        .update({ is_active: false } as any)
        .eq('user_id', userId)
        .eq('is_active', true);

      const { data, error } = await supabase
        .from('nutrition_plans')
        .insert({
          user_id: userId,
          target_calories: msg.nutritionPlanData.targetCalories,
          target_protein: msg.nutritionPlanData.targetProtein,
          target_carbs: msg.nutritionPlanData.targetCarbs,
          target_fats: msg.nutritionPlanData.targetFats,
          notes: msg.nutritionPlanData.notes,
          is_active: true,
        })
        .select()
        .single();

      if (!error && data) {
        setNutritionPlan({
          id: data.id,
          userId: data.user_id,
          targetCalories: data.target_calories,
          targetProtein: data.target_protein,
          targetCarbs: data.target_carbs ?? undefined,
          targetFats: data.target_fats ?? undefined,
          notes: data.notes ?? undefined,
        });
      }
    }
  };

  // ─── Custom workouts ────────────────────────────────────────────
  const addCustomWorkout = useCallback(async (workout: Omit<Workout, 'id'>) => {
    if (!userId) return null;
    const { data: tpl, error } = await supabase
      .from('workout_templates')
      .insert({
        title: workout.title,
        type: workout.type,
        duration: workout.duration,
        difficulty: workout.difficulty,
        calories: workout.calories,
        target_muscles: workout.targetMuscles,
        description: workout.description || null,
        is_premium: workout.isPremium,
        image_url: workout.imageUrl,
        tags: workout.tags || [],
        created_by: userId,
        created_by_ai: workout.createdByAi || false,
        is_public: false,
        source: workout.source || 'custom',
      })
      .select()
      .single();

    if (error || !tpl) {
      return null;
    }

    if (workout.exercises.length > 0) {
      const { error: exerciseError } = await supabase
        .from('template_exercises')
        .insert(workout.exercises.map((ex, i) => ({
          template_id: tpl.id,
          exercise_id: ex.exerciseId || null,
          name: ex.name,
          sets: ex.sets ?? null,
          reps: ex.reps ?? null,
          duration: ex.duration ?? null,
          rest_time: ex.restTime,
          notes: ex.notes || null,
          sort_order: i,
        })));

      if (exerciseError) {
        await supabase.from('workout_templates').delete().eq('id', tpl.id);
        return null;
      }
    }

    const savedWorkout = mapTemplateRowToWorkout(tpl, {
      [tpl.id]: workout.exercises,
    });

    setWorkouts(prev => [savedWorkout, ...prev]);
    return savedWorkout;
  }, [userId]);

  const updateWorkout = useCallback(async (workoutId: string, workout: Omit<Workout, 'id'>) => {
    if (!userId) return null;

    const currentWorkout = workouts.find(item => item.id === workoutId);
    if (!currentWorkout || !getWorkoutAccess(currentWorkout, userId).canEdit) {
      return null;
    }

    const { data: updatedTemplate, error: updateError } = await supabase
      .from('workout_templates')
      .update({
        title: workout.title,
        type: workout.type,
        duration: workout.duration,
        difficulty: workout.difficulty,
        calories: workout.calories,
        target_muscles: workout.targetMuscles,
        description: workout.description || null,
        image_url: workout.imageUrl || null,
        tags: workout.tags || [],
      })
      .eq('id', workoutId)
      .eq('created_by', userId)
      .select()
      .single();

    if (updateError || !updatedTemplate) {
      return null;
    }

    const { error: deleteExercisesError } = await supabase
      .from('template_exercises')
      .delete()
      .eq('template_id', workoutId);

    if (deleteExercisesError) {
      return null;
    }

    if (workout.exercises.length > 0) {
      const { error: exerciseError } = await supabase
        .from('template_exercises')
        .insert(workout.exercises.map((exercise, index) => ({
          template_id: workoutId,
          exercise_id: exercise.exerciseId || null,
          name: exercise.name,
          sets: exercise.sets ?? null,
          reps: exercise.reps ?? null,
          duration: exercise.duration ?? null,
          rest_time: exercise.restTime,
          notes: exercise.notes || null,
          sort_order: index,
        })));

      if (exerciseError) {
        return null;
      }
    }

    const updatedWorkout = mapTemplateRowToWorkout(updatedTemplate, {
      [workoutId]: workout.exercises,
    });

    setWorkouts(prev => prev.map(item => item.id === workoutId ? updatedWorkout : item));
    return updatedWorkout;
  }, [userId, workouts]);

  const refreshWorkouts = useCallback(async () => {
    await ensureFeaturedEditorialWorkouts();

    const { data: templates } = await supabase
      .from('workout_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (templates && templates.length > 0) {
      const templateIds = templates.map(t => t.id);
      const { data: exercises } = await supabase
        .from('template_exercises')
        .select('*')
        .in('template_id', templateIds)
        .order('sort_order');

      const exercisesByTemplate = (exercises || []).reduce<Record<string, Exercise[]>>((acc, ex) => {
        if (!acc[ex.template_id]) acc[ex.template_id] = [];
        acc[ex.template_id].push(mapTemplateExerciseRowToExercise(ex));
        return acc;
      }, {});

      setWorkouts(
        dedupeFeaturedTemplates(templates).map((template) =>
          mapTemplateRowToWorkout(template, exercisesByTemplate)
        )
      );
    } else {
      setWorkouts([]);
    }
  }, [ensureFeaturedEditorialWorkouts]);

  const deleteWorkout = useCallback(async (workoutId: string) => {
    if (!userId) return false;

    const workout = workouts.find(item => item.id === workoutId);
    if (!workout || !getWorkoutAccess(workout, userId).canDelete) {
      return false;
    }

    const { error: sessionError } = await supabase
      .from('workout_sessions')
      .update({
        workout_id: null,
        workout_title: workout.title,
      })
      .eq('user_id', userId)
      .eq('workout_id', workoutId);

    if (sessionError) {
      return false;
    }

    const { error: deleteExercisesError } = await supabase
      .from('template_exercises')
      .delete()
      .eq('template_id', workoutId);

    if (deleteExercisesError) {
      return false;
    }

    const { error: deleteTemplateError } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', workoutId)
      .eq('created_by', userId);

    if (deleteTemplateError) {
      return false;
    }

    setWorkouts(prev => prev.filter(w => w.id !== workoutId));
    return true;
  }, [userId, workouts]);

  const assignSpecialist = (specialist: Specialist) => {
    setAssignedSpecialist(specialist);
  };

  // ─── Nutrition ──────────────────────────────────────────────────
  const getTodayNutritionLog = (): DailyNutritionLog | null => {
    const today = formatLocalDate();
    return dailyNutritionLogs.find(l => l.date === today) ?? null;
  };

  const deactivateNutritionPlan = useCallback(async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('nutrition_plans')
      .update({ is_active: false } as any)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    await refreshNutritionPlan();
  }, [refreshNutritionPlan, userId]);

  const upsertTodayNutritionLog = useCallback(async (data: Pick<DailyNutritionLog, 'calories' | 'protein' | 'carbs' | 'fats' | 'adherence'>) => {
    if (!userId) return;
    const today = formatLocalDate();

    const { data: result, error } = await supabase
      .from('daily_nutrition_logs')
      .upsert({
        user_id: userId,
        date: today,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs ?? 0,
        fats: data.fats ?? 0,
        adherence: data.adherence,
      }, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (!error && result) {
      setDailyNutritionLogs(prev => {
        const existingIdx = prev.findIndex(l => l.date === today);
        const newLog: DailyNutritionLog = {
          id: result.id,
          userId: result.user_id,
          date: result.date,
          calories: result.calories || 0,
          protein: result.protein || 0,
          carbs: result.carbs ?? undefined,
          fats: result.fats ?? undefined,
          adherence: result.adherence ?? undefined,
        };
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = newLog;
          return updated;
        }
        return [newLog, ...prev];
      });
    }
  }, [userId]);

  const hasPendingNutritionPlan = (): boolean => {
    return chatMessages.some(
      m => m.type === 'nutrition_plan' && m.nutritionPlanData && !m.nutritionPlanAccepted
    );
  };

  return (
    <AppContext.Provider
      value={{
        user, setUser,
        challenge, setChallenge,
        workoutSessions, addWorkoutSession, refreshWorkoutSessions,
        habitLogs, toggleHabitLog,
        startChallenge, getChallengeDay,
        isDayCompleted, getCompletedDays, getCurrentStreak,
        assignedCoach, assignCoach,
        chatMessages, addChatMessage, acceptNutritionPlanFromChat,
        workouts, addCustomWorkout, updateWorkout, refreshWorkouts, deleteWorkout,
        assignedSpecialist, assignSpecialist,
        restartChallenge, getLongestStreak,
        nutritionPlan, setNutritionPlan, deactivateNutritionPlan,
        dailyNutritionLogs, getTodayNutritionLog, upsertTodayNutritionLog, hasPendingNutritionPlan,
        isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
