import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { usePersonalRecords } from '@app/hooks/usePersonalRecords';
import { fetchEllieOverview } from '@app/services/supabase/ellie';
import {
  buildEllieContext,
  ellieQuickChips,
  formatPRValue,
  generateProactiveNudges,
  generateSmartInsights,
  generateWeeklySummary,
  serializeEllieContext,
  type EllieActionType,
  type EllieFullContext,
  type EllieNudge,
} from '@app/shared';

export type ElliePromptCard = {
  id: string;
  icon: 'dumbbell' | 'utensils' | 'target' | 'droplets' | 'trending-up';
  title: string;
  subtitle: string;
  prompt: string;
};

function buildPromptCards(ctx: EllieFullContext): ElliePromptCard[] {
  return [
    {
      id: 'train-today',
      icon: 'dumbbell',
      title: '¿Qué debería entrenar hoy?',
      subtitle: ctx.training.todayWorkoutDone
        ? 'Ya entrenaste hoy, pero ELLIE puede ajustar la siguiente sesión.'
        : 'Dime si conviene seguir una rutina tuya o generar una nueva.',
      prompt:
        '¿Qué debería entrenar hoy según mi progreso actual? Si hace falta, sugiéreme una rutina de mi biblioteca o genera una nueva.',
    },
    {
      id: 'nutrition-plan',
      icon: 'utensils',
      title: 'Crea tu plan de nutrición',
      subtitle: ctx.nutrition.hasActivePlan
        ? 'Recalcula mis macros y calorías para el objetivo actual.'
        : 'Calcula mis macros y calorías para el objetivo actual.',
      prompt:
        'Crea mi plan de nutrición con macros y calorías ajustadas a mi objetivo actual.',
    },
    {
      id: 'core33',
      icon: 'target',
      title: 'Analiza mi Core 33',
      subtitle: ctx.challenge.active
        ? `Revisa cómo voy en el día ${ctx.challenge.currentDay} y qué me falta completar.`
        : 'Explícame cómo retomar mi consistencia con hábitos simples.',
      prompt: ctx.challenge.active
        ? `Analiza mi Core 33. Voy en el día ${ctx.challenge.currentDay} de 33 y quiero saber qué me falta y cómo mantener la racha.`
        : 'Analiza mi consistencia reciente y ayúdame a retomar hábitos diarios.',
    },
    {
      id: 'hydration',
      icon: 'droplets',
      title: 'Ayúdame con mi hidratación',
      subtitle:
        ctx.hydration.goalMl > 0
          ? `Llevo ${ctx.hydration.todayPercentage}% de mi meta diaria.`
          : 'Ayúdame a definir una meta diaria de agua.',
      prompt:
        ctx.hydration.goalMl > 0
          ? `Ayúdame con mi hidratación. Llevo ${ctx.hydration.todayPercentage}% de mi meta diaria y quiero saber cómo terminar bien el día.`
          : 'Ayúdame a definir una meta de hidratación que tenga sentido para mí.',
    },
    {
      id: 'weekly-progress',
      icon: 'trending-up',
      title: '¿Cómo voy esta semana?',
      subtitle: `${ctx.training.workoutsThisWeek} entrenos, ${ctx.nutrition.recentAdherence}% de adherencia nutricional.`,
      prompt: `Analiza mi progreso de esta semana. Llevo ${ctx.training.workoutsThisWeek} entrenos y ${ctx.nutrition.recentAdherence}% de adherencia nutricional.`,
    },
  ];
}

function getPromptMode(
  prompt: string,
): 'generate_workout' | 'generate_nutrition' | undefined {
  const normalized = prompt.toLowerCase();

  if (
    normalized.includes('plan de nutrición') ||
    normalized.includes('macros') ||
    normalized.includes('calorías')
  ) {
    return 'generate_nutrition';
  }

  if (
    normalized.includes('qué debería entrenar hoy') ||
    normalized.includes('rutina') ||
    normalized.includes('entrenar hoy')
  ) {
    return 'generate_workout';
  }

  return undefined;
}

export function useEllieData() {
  const { profile } = useAuth();
  const personalRecordsQuery = usePersonalRecords();
  const exercisesQuery = useExerciseLibrary();

  const overviewQuery = useQuery({
    queryKey: ['ellie', 'overview', profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () =>
      fetchEllieOverview({
        userId: profile!.id,
        dailyWaterGoal: profile?.dailyWaterGoal,
      }),
  });

  const exerciseNameMap = useMemo(() => {
    const map: Record<string, string> = {};

    (exercisesQuery.data || []).forEach(exercise => {
      map[exercise.id] = exercise.name;
    });

    return map;
  }, [exercisesQuery.data]);

  const context = useMemo(() => {
    if (!profile || !overviewQuery.data) {
      return null;
    }

    return buildEllieContext({
      user: {
        id: profile.id,
        name: profile.name,
        birthDate: profile.birthDate,
        gender: profile.gender,
        weight: profile.weight || 0,
        height: profile.height || 0,
        goal: profile.goal || 'maintain',
        trainingDaysPerWeek: profile.trainingDaysPerWeek || 0,
        trainingEnvironment: profile.trainingEnvironment,
        availableEquipment: profile.availableEquipment,
        restrictionsNotes: overviewQuery.data.profileExtras.restrictionsNotes,
        injuryNotes: overviewQuery.data.profileExtras.injuryNotes,
        exercisePreferences:
          overviewQuery.data.profileExtras.exercisePreferences,
        exerciseAvoidances: overviewQuery.data.profileExtras.exerciseAvoidances,
        dietPreferences: overviewQuery.data.profileExtras.dietPreferences,
        foodAvoidances: overviewQuery.data.profileExtras.foodAvoidances,
      },
      isPremium: false,
      workoutSessions: overviewQuery.data.workoutSessions.map(session => ({
        date: session.date,
        completed: session.completed,
        workoutId: session.workoutId,
      })),
      workoutTitles: overviewQuery.data.workoutSessions.reduce<
        Record<string, string>
      >((accumulator, session) => {
        if (session.workoutId) {
          accumulator[session.workoutId] = session.workoutTitle;
        }

        return accumulator;
      }, {}),
      workoutCount: overviewQuery.data.workoutCount,
      nutritionPlan: overviewQuery.data.nutritionPlan,
      todayNutritionLog: overviewQuery.data.todayNutritionLog,
      dailyNutritionLogs: overviewQuery.data.dailyNutritionLogs,
      challenge: overviewQuery.data.challenge,
      habitLogs: overviewQuery.data.habitLogs,
      challengeDay: overviewQuery.data.challengeDay,
      currentStreak: overviewQuery.data.currentStreak,
      completedDays: overviewQuery.data.completedDays,
      gamification: {
        points: overviewQuery.data.profileExtras.points,
        badges: overviewQuery.data.badges,
      },
      personalRecords: {
        records: personalRecordsQuery.records.map(record => ({
          exerciseId: record.exerciseId,
          prType: record.prType,
          valueWeight: record.valueWeight,
          valueReps: record.valueReps,
          valueDurationSec: record.valueDurationSec,
          valueDistanceM: record.valueDistanceM,
          recordedAt: record.recordedAt,
        })),
        exerciseNames: exerciseNameMap,
      },
      hydration: overviewQuery.data.hydration,
    });
  }, [
    exerciseNameMap,
    overviewQuery.data,
    personalRecordsQuery.records,
    profile,
  ]);

  const insights = useMemo(
    () => (context ? generateSmartInsights(context) : []),
    [context],
  );
  const nudges = useMemo(
    () => (context ? generateProactiveNudges(context) : []),
    [context],
  );
  const promptCards = useMemo(
    () => (context ? buildPromptCards(context) : []),
    [context],
  );
  const quickQuestionChips = useMemo(
    () =>
      promptCards.slice(0, 4).map(card => ({
        label: card.title,
        prompt: card.prompt,
      })),
    [promptCards],
  );
  const weeklySummary = useMemo(() => {
    if (!overviewQuery.data || !profile) {
      return null;
    }

    return generateWeeklySummary({
      workoutSessions: overviewQuery.data.workoutSessions,
      trainingDaysPerWeek: profile.trainingDaysPerWeek || 0,
      dailyNutritionLogs: overviewQuery.data.dailyNutritionLogs,
      challenge: overviewQuery.data.challenge,
      challengeDay: overviewQuery.data.challengeDay,
      completedDays: overviewQuery.data.completedDays,
      points: overviewQuery.data.profileExtras.points,
    });
  }, [overviewQuery.data, profile]);

  const recentPrLabel = useMemo(() => {
    if (!personalRecordsQuery.latestRecord) {
      return null;
    }

    const exerciseName =
      exerciseNameMap[personalRecordsQuery.latestRecord.exerciseId] ||
      'Ejercicio';
    return `${exerciseName}: ${formatPRValue(
      personalRecordsQuery.latestRecord,
    )}`;
  }, [exerciseNameMap, personalRecordsQuery.latestRecord]);

  const serializedContext = useMemo(
    () => (context ? serializeEllieContext(context) : ''),
    [context],
  );

  const suggestedModes = useMemo(
    () =>
      promptCards.reduce<
        Record<string, 'generate_workout' | 'generate_nutrition' | undefined>
      >((accumulator, card) => {
        accumulator[card.prompt] = getPromptMode(card.prompt);
        return accumulator;
      }, {}),
    [promptCards],
  );

  const quickChatChips = useMemo(
    () =>
      ellieQuickChips.map(chip => ({
        ...chip,
        mode: getPromptMode(chip.prompt),
      })),
    [],
  );

  return {
    overviewQuery,
    personalRecordsQuery,
    exercisesQuery,
    context,
    serializedContext,
    insights,
    heroInsight: insights[0] || null,
    secondaryInsights: insights.slice(1, 4),
    nudges,
    priorityNudges: nudges.filter(
      (nudge): nudge is EllieNudge & { action: EllieActionType } =>
        Boolean(nudge.action && nudge.actionLabel),
    ),
    promptCards,
    quickQuestionChips,
    quickChatChips,
    weeklySummary,
    recentPrLabel,
    suggestedModes,
    resolvePromptMode: getPromptMode,
  };
}
