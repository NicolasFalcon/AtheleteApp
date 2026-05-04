import {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert} from 'react-native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@app/hooks/useAuth';
import {invalidateNutritionPlanQueries} from '@app/lib/queryInvalidation';
import {
  callEllieChat,
  generateWithEllie,
  type EllieClientMessage,
  type EllieGenerationResult,
} from '@app/services/ellie/chat';
import {
  clearEllieChatHistory,
  fetchEllieChatHistory,
  insertEllieChatMessage,
} from '@app/services/supabase/ellie';
import {
  saveEllieNutritionPlan,
  saveEllieWorkout,
  type EllieGeneratedNutritionPlan,
  type EllieGeneratedWorkout,
} from '@app/services/supabase/ellie-actions';

export type EllieUiMessage =
  | {
      id: string;
      role: 'user' | 'assistant';
      kind: 'text';
      content: string;
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'workout_preview';
      content: string;
      workoutData: EllieGeneratedWorkout;
      saved?: boolean;
      discarded?: boolean;
      generationMessages?: EllieClientMessage[];
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'nutrition_preview';
      content: string;
      nutritionData: EllieGeneratedNutritionPlan;
      saved?: boolean;
      discarded?: boolean;
      generationMessages?: EllieClientMessage[];
    };

function isWorkoutPreviewMessage(
  message: EllieUiMessage | undefined,
): message is Extract<EllieUiMessage, {kind: 'workout_preview'}> {
  return Boolean(message && message.kind === 'workout_preview');
}

function isNutritionPreviewMessage(
  message: EllieUiMessage | undefined,
): message is Extract<EllieUiMessage, {kind: 'nutrition_preview'}> {
  return Boolean(message && message.kind === 'nutrition_preview');
}

function buildWelcomeMessage(userName?: string): EllieUiMessage {
  const name = userName ? ` ${userName}` : '';

  return {
    id: 'ellie-welcome',
    role: 'assistant',
    kind: 'text',
    content: `¡Hola${name}! Soy ELLIE, tu coach fitness con IA.\n\nPuedo ayudarte a:\n• Generar rutinas personalizadas\n• Crear tu plan de nutrición\n• Analizar tu progreso\n• Darte recomendaciones basadas en tus datos\n\n¿En qué te ayudo hoy?`,
  };
}

function mapWorkoutResult(data: any): EllieGeneratedWorkout {
  return {
    title:
      typeof data.title === 'string' ? data.title : 'Rutina generada por ELLIE',
    description:
      typeof data.description === 'string' ? data.description : undefined,
    type:
      data.type === 'cardio' ||
      data.type === 'fullbody' ||
      data.type === 'mobility' ||
      data.type === 'hiit'
        ? data.type
        : 'strength',
    difficulty:
      data.difficulty === 'beginner' ||
      data.difficulty === 'advanced' ||
      data.difficulty === 'intermediate'
        ? data.difficulty
        : 'intermediate',
    duration: typeof data.duration === 'number' ? data.duration : 30,
    calories: typeof data.calories === 'number' ? data.calories : 200,
    targetMuscles: Array.isArray(data.targetMuscles)
      ? data.targetMuscles.filter(
          (value: unknown): value is string => typeof value === 'string',
        )
      : Array.isArray(data.target_muscles)
        ? data.target_muscles.filter(
            (value: unknown): value is string => typeof value === 'string',
          )
        : [],
    imageUrl: typeof data.image_url === 'string' ? data.image_url : undefined,
    exercises: Array.isArray(data.exercises)
      ? data.exercises.map((exercise: any) => ({
          name:
            typeof exercise?.name === 'string'
              ? exercise.name
              : 'Ejercicio sugerido',
          exerciseId:
            typeof exercise?.exercise_id === 'string'
              ? exercise.exercise_id
              : undefined,
          sets: typeof exercise?.sets === 'number' ? exercise.sets : undefined,
          reps: typeof exercise?.reps === 'number' ? exercise.reps : undefined,
          duration:
            typeof exercise?.duration === 'number'
              ? exercise.duration
              : undefined,
          restTime:
            typeof exercise?.rest_time === 'number'
              ? exercise.rest_time
              : undefined,
          notes:
            typeof exercise?.notes === 'string' ? exercise.notes : undefined,
        }))
      : [],
  };
}

function mapNutritionResult(data: any): EllieGeneratedNutritionPlan {
  return {
    targetCalories:
      typeof (data.target_calories ?? data.targetCalories) === 'number'
        ? data.target_calories ?? data.targetCalories
        : 2000,
    targetProtein:
      typeof (data.target_protein ?? data.targetProtein) === 'number'
        ? data.target_protein ?? data.targetProtein
        : 120,
    targetCarbs:
      typeof (data.target_carbs ?? data.targetCarbs) === 'number'
        ? data.target_carbs ?? data.targetCarbs
        : 250,
    targetFats:
      typeof (data.target_fats ?? data.targetFats) === 'number'
        ? data.target_fats ?? data.targetFats
        : 65,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
  };
}

function buildPreviewPayload(
  result: EllieGenerationResult,
  contextMessages: EllieClientMessage[],
) {
  if (result.type === 'generate_workout_plan') {
    const introMessage =
      typeof result.data?.intro_message === 'string'
        ? result.data.intro_message
        : '';
    const workout = mapWorkoutResult(result.data);
    const summary =
      introMessage ||
      `He generado la rutina "${workout.title}" con ${workout.exercises.length} ejercicios.`;

    return {
      introMessage,
      summary,
      preview: {
        id: `workout-preview-${Date.now()}`,
        role: 'assistant' as const,
        kind: 'workout_preview' as const,
        content: '',
        workoutData: workout,
        saved: false,
        discarded: false,
        generationMessages: contextMessages,
      },
    };
  }

  if (result.type === 'generate_nutrition_plan') {
    const introMessage =
      typeof result.data?.intro_message === 'string'
        ? result.data.intro_message
        : '';
    const nutrition = mapNutritionResult(result.data);
    const summary =
      introMessage ||
      `He generado tu plan nutricional de ${nutrition.targetCalories} kcal por día.`;

    return {
      introMessage,
      summary,
      preview: {
        id: `nutrition-preview-${Date.now()}`,
        role: 'assistant' as const,
        kind: 'nutrition_preview' as const,
        content: '',
        nutritionData: nutrition,
        saved: false,
        discarded: false,
        generationMessages: contextMessages,
      },
    };
  }

  return null;
}

export function useEllieChat(params: {
  userName?: string;
  serializedContext: string;
}) {
  const {profile} = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [savedDraft, setSavedDraft] = useState<string | null>(null);
  const [displayMessages, setDisplayMessages] = useState<EllieUiMessage[]>([]);
  const [conversationMessages, setConversationMessages] = useState<
    EllieClientMessage[]
  >([]);
  const [isSending, setIsSending] = useState(false);
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    'save' | 'activate' | 'regenerate' | null
  >(null);

  const historyQuery = useQuery({
    queryKey: ['ellie', 'chat', profile?.id],
    enabled: Boolean(profile?.id),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => fetchEllieChatHistory(profile!.id),
  });

  useEffect(() => {
    if (!historyQuery.data) {
      return;
    }

    const welcome = buildWelcomeMessage(params.userName);
    if (historyQuery.data.length === 0) {
      setConversationMessages([]);
      setDisplayMessages([welcome]);
      return;
    }

    const loadedMessages = historyQuery.data.map(message => ({
      role: message.role,
      content: message.content,
    })) as EllieClientMessage[];

    setConversationMessages(loadedMessages);
    setDisplayMessages([
      welcome,
      ...historyQuery.data.map(message => ({
        id: message.id,
        role: message.role,
        kind: 'text' as const,
        content: message.content,
      })),
    ]);
  }, [historyQuery.data, params.userName]);

  const prefillDraft = useCallback((prompt: string) => {
    setDraft(current => {
      const trimmed = current.trim();
      if (trimmed && trimmed !== prompt) {
        setSavedDraft(trimmed);
      }
      return prompt;
    });
  }, []);

  const restoreSavedDraft = useCallback(() => {
    if (!savedDraft) {
      return;
    }

    setDraft(savedDraft);
    setSavedDraft(null);
  }, [savedDraft]);

  const dismissSavedDraft = useCallback(() => {
    setSavedDraft(null);
  }, []);

  const sendDraft = useCallback(
    async (mode?: 'generate_workout' | 'generate_nutrition') => {
      const trimmed = draft.trim();

      if (!trimmed || isSending || !profile?.id) {
        return;
      }

      const userMessage: EllieUiMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        kind: 'text',
        content: trimmed,
      };
      const nextPlainMessages = [
        ...conversationMessages,
        {role: 'user' as const, content: trimmed},
      ];

      setConversationMessages(nextPlainMessages);
      setDisplayMessages(current => [...current, userMessage]);
      setDraft('');
      setIsSending(true);
      insertEllieChatMessage({
        userId: profile.id,
        role: 'user',
        content: trimmed,
      }).catch(() => {});

      const streamingId = `assistant-stream-${Date.now()}`;
      let assistantText = '';

      await callEllieChat({
        messages: nextPlainMessages,
        userContext: params.serializedContext,
        mode,
        onDelta: delta => {
          assistantText += delta;
          setDisplayMessages(current => {
            const existingIndex = current.findIndex(
              message => message.id === streamingId,
            );
            const nextMessage: EllieUiMessage = {
              id: streamingId,
              role: 'assistant',
              kind: 'text',
              content: assistantText,
            };

            if (existingIndex >= 0) {
              return current.map(message =>
                message.id === streamingId ? nextMessage : message,
              );
            }

            return [...current, nextMessage];
          });
        },
        onDone: () => {
          setIsSending(false);

          if (!assistantText.trim()) {
            return;
          }

          insertEllieChatMessage({
            userId: profile.id,
            role: 'assistant',
            content: assistantText,
          }).catch(() => {});
          setConversationMessages(current => [
            ...current,
            {
              role: 'assistant',
              content: assistantText,
            },
          ]);
        },
        onToolResult: result => {
          setIsSending(false);

          const previewPayload = buildPreviewPayload(result, nextPlainMessages);
          if (!previewPayload) {
            return;
          }

          setDisplayMessages(current => {
            const withoutStreaming = current.filter(
              message => message.id !== streamingId,
            );
            const next = [...withoutStreaming];

            if (previewPayload.introMessage) {
              next.push({
                id: `assistant-intro-${Date.now()}`,
                role: 'assistant',
                kind: 'text',
                content: previewPayload.introMessage,
              });
            }

            next.push(previewPayload.preview);
            return next;
          });

          insertEllieChatMessage({
            userId: profile.id,
            role: 'assistant',
            content: previewPayload.summary,
          }).catch(() => {});
          setConversationMessages(current => [
            ...current,
            {
              role: 'assistant',
              content: previewPayload.summary,
            },
          ]);
        },
        onError: error => {
          setIsSending(false);
          setDisplayMessages(current => {
            const withoutStreaming = current.filter(
              message => message.id !== streamingId,
            );
            return [
              ...withoutStreaming,
              {
                id: `assistant-error-${Date.now()}`,
                role: 'assistant',
                kind: 'text',
                content:
                  error || 'ELLIE no está disponible en este momento.',
              },
            ];
          });
        },
      });
    },
    [conversationMessages, draft, isSending, params.serializedContext, profile?.id],
  );

  const saveGeneratedWorkout = useCallback(
    async (messageId: string) => {
      if (!profile?.id) {
        return;
      }

      const message = displayMessages.find(
        item => item.id === messageId && item.kind === 'workout_preview',
      );

      if (!isWorkoutPreviewMessage(message) || message.saved || message.discarded) {
        return;
      }

      setBusyMessageId(messageId);
      setBusyAction('save');
      const result = await saveEllieWorkout(profile.id, message.workoutData);

      if (!result.success) {
        setBusyMessageId(null);
        setBusyAction(null);
        Alert.alert('No pudimos guardar la rutina', result.error);
        return;
      }

      setDisplayMessages(current =>
        current.map(item =>
          item.id === messageId && item.kind === 'workout_preview'
            ? {...item, saved: true}
            : item,
        ),
      );

      await Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: ['workouts', 'library', profile.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ['ellie', 'overview', profile.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ['home', 'overview', profile.id],
        }),
      ]);

      setBusyMessageId(null);
      setBusyAction(null);
      Alert.alert('Rutina guardada', 'La rutina ya está disponible en tus entrenos.');
    },
    [displayMessages, profile?.id, queryClient],
  );

  const activateGeneratedNutritionPlan = useCallback(
    async (messageId: string) => {
      if (!profile?.id) {
        return;
      }

      const message = displayMessages.find(
        item => item.id === messageId && item.kind === 'nutrition_preview',
      );

      if (
        !isNutritionPreviewMessage(message) ||
        message.saved ||
        message.discarded
      ) {
        return;
      }

      setBusyMessageId(messageId);
      setBusyAction('activate');
      const result = await saveEllieNutritionPlan(profile.id, message.nutritionData);

      if (!result.success) {
        setBusyMessageId(null);
        setBusyAction(null);
        Alert.alert('No pudimos activar el plan', result.error);
        return;
      }

      setDisplayMessages(current =>
        current.map(item =>
          item.id === messageId && item.kind === 'nutrition_preview'
            ? {...item, saved: true}
            : item,
        ),
      );

      await invalidateNutritionPlanQueries(queryClient, profile.id);

      setBusyMessageId(null);
      setBusyAction(null);
      Alert.alert(
        'Plan activado',
        'El plan nutricional quedó activo para tu cuenta.',
      );
    },
    [displayMessages, profile?.id, queryClient],
  );

  const discardGeneratedMessage = useCallback((messageId: string) => {
    setDisplayMessages(current =>
      current.map(message =>
        message.id === messageId &&
        (message.kind === 'workout_preview' || message.kind === 'nutrition_preview')
          ? {...message, discarded: true}
          : message,
      ),
    );
  }, []);

  const regenerateGeneratedMessage = useCallback(
    async (messageId: string) => {
      const message = displayMessages.find(item => item.id === messageId);

      if (
        !message ||
        (message.kind !== 'workout_preview' &&
          message.kind !== 'nutrition_preview') ||
        !message.generationMessages ||
        isSending
      ) {
        return;
      }

      const isWorkout = message.kind === 'workout_preview';
      const regenerationMessages: EllieClientMessage[] = [
        ...message.generationMessages,
        {
          role: 'assistant',
          content: `Ya generé una versión anterior llamada "${
            isWorkout ? message.workoutData.title : 'plan anterior'
          }". El usuario quiere una variante diferente.`,
        },
        {
          role: 'user',
          content:
            'Genérame otra versión diferente, con otra estructura y una propuesta distinta.',
        },
      ];

      setBusyMessageId(messageId);
      setBusyAction('regenerate');

      try {
        const result = await generateWithEllie({
          messages: regenerationMessages,
          userContext: params.serializedContext,
          mode: isWorkout ? 'generate_workout' : 'generate_nutrition',
        });

        const previewPayload = buildPreviewPayload(result, message.generationMessages);
        if (!previewPayload) {
          return;
        }

        setDisplayMessages(current => {
          const index = current.findIndex(item => item.id === messageId);
          if (index === -1) {
            return current;
          }

          const next = [...current];
          const replacement =
            previewPayload.preview.kind === 'workout_preview'
              ? {...previewPayload.preview, id: messageId}
              : {...previewPayload.preview, id: messageId};

          next[index] = replacement;
          if (previewPayload.introMessage) {
            next.splice(index, 0, {
              id: `${messageId}-intro-${Date.now()}`,
              role: 'assistant',
              kind: 'text',
              content: previewPayload.introMessage,
            });
          }

          return next;
        });
      } catch (error) {
        Alert.alert(
          'No pudimos generar otra versión',
          error instanceof Error ? error.message : 'Intenta nuevamente.',
        );
      } finally {
        setBusyMessageId(null);
        setBusyAction(null);
      }
    },
    [displayMessages, isSending, params.serializedContext],
  );

  const clearChat = useCallback(async () => {
    if (!profile?.id) {
      return;
    }

    await clearEllieChatHistory(profile.id);
    setConversationMessages([]);
    setDraft('');
    setSavedDraft(null);
    setDisplayMessages([buildWelcomeMessage(params.userName)]);
    await queryClient.invalidateQueries({
      queryKey: ['ellie', 'chat', profile.id],
    });
  }, [params.userName, profile?.id, queryClient]);

  const hasHistory = useMemo(
    () => displayMessages.some(message => message.id !== 'ellie-welcome'),
    [displayMessages],
  );

  return {
    historyQuery,
    messages: displayMessages,
    draft,
    savedDraft,
    setDraft,
    prefillDraft,
    restoreSavedDraft,
    dismissSavedDraft,
    sendDraft,
    clearChat,
    saveGeneratedWorkout,
    activateGeneratedNutritionPlan,
    discardGeneratedMessage,
    regenerateGeneratedMessage,
    isSending,
    isClearing: false,
    hasHistory,
    busyMessageId,
    busyAction,
  };
}
