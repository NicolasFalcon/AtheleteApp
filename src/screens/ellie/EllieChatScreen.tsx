import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquarePlus, MoreHorizontal, RefreshCw, Trash2, X } from 'lucide-react-native';
import { Image } from 'react-native';
import {
  BackButton,
  Button,
  EllieComposer,
  AuraMark,
  haptics,
  IconButton,
  PressableScale,
  Sheet,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
  useTopSafeBarHeight,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import {
  CANNED_PROMPTS,
  proposalMessageId,
  showSuggestions,
} from '@app/features/ellie/chatModel';
import { TrainingPlanProposalCard } from '@app/features/trainingPlan/v2/TrainingPlanProposalCard';
import { useTrainingPlanActivation } from '@app/features/trainingPlan/useTrainingPlanActivation';
import { useOpenWeek } from '@app/features/trainingPlan/useOpenWeek';
import { useTrainingPlanState } from '@app/features/trainingPlan/useTrainingPlanState';
import {
  DiscomfortCheckCard,
  RoutineProposalCard,
  RoutineProposalSheet,
} from '@app/features/ellie/v2/RoutineProposalParts';
import {
  RoutineLibraryCard,
  WeekPlanConflictCard,
  WeekPlanAddedCard,
} from '@app/features/ellie/v2/LibraryCardParts';
import { PlanAdjustmentChatCard } from '@app/features/trainingPlan/v2/PlanAdjustmentCard';
import { PlanActionConfirmCard, PlanReviewChatCard } from '@app/features/ellie/v2/PlanChatCards';
import { useAddToWeek } from '@app/features/week/v2/AddToWeekSheet';
import { addToWeekText } from '@app/features/week/addToWeekCopy';
import { weekStartOf } from '@app/features/week/weekModel';
import { invalidateWeek } from '@app/hooks/useWeekPlan';
import { invalidateWorkoutQueries } from '@app/lib/queryInvalidation';
import { routinesService } from '@app/services/routines/routinesService';
import {
  fetchEffectiveWorkoutSession,
  startWorkoutSession,
} from '@app/services/supabase/fitness';
import {
  NutritionPrefsCard,
  NutritionProposalCard,
  NutritionProposalSheet,
} from '@app/features/ellie/v2/NutritionProposalParts';
import {
  PLAN_ADJUST_PREFIX,
  PLAN_ANOTHER_VERSION,
} from '@app/features/ellie/nutritionProposalModel';
import {
  getFoodPreferences,
  type PlanEdits,
} from '@app/services/ellie/nutritionProposals';
import {
  NO_EDITS,
  planRoutineForDay,
  ProposalError,
  unplanRoutineForDay,
  type RoutineEdits,
} from '@app/services/ellie/ellieProposals';
import { isRetryable } from '@app/features/ellie/ellieCopy';
import {
  EllieVoice,
  MealAnalysisCard,
  NutritionPlanCard,
  RoutineCard,
  SuggestionPills,
  ThinkingIndicator,
  UserPill,
} from '@app/features/ellie/v2/ChatParts';
import {
  defaultGreeting,
  useEllieConversation,
} from '@app/features/ellie/v2/useEllieConversation';
import { relativeWhen } from '@app/features/ellie/chatModel';
import { useAuth } from '@app/hooks/useAuth';
import {
  useDeleteEllieConversation,
  useEllieConversations,
} from '@app/hooks/useEllieConversations';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { useRegisteredMeal } from '@app/hooks/useRegisteredMeal';
import { useMealMutations } from '@app/hooks/useMeals';
import { draftFromAnalysis, toSaveInput } from '@app/features/nutrition/mealDraft';
import { mealRegistrar } from '@app/features/nutrition/mealRegistrar';
import { PhotoSourceSheet } from '@app/features/vision/v2/PhotoSourceSheet';
import { usePhotoAttachment } from '@app/features/vision/usePhotoAttachment';
import { createUuid } from '@app/lib/uuid';
import type {
  MealCardMessage,
  RoutineLibraryMessage,
  WeekPlanConflictMessage,
  WeekPlanAddedMessage,
} from '@app/features/ellie/chatModel';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'EllieChat'>;

// The card of a photo of a meal with its own state: registered or not (read
// from the database, so it also holds after restarting), registering, failed.
function MealCard({
  card,
  language,
  onEdit,
  onOpenDay,
}: {
  card: MealCardMessage;
  language: 'es' | 'en';
  onEdit: () => void;
  onOpenDay: () => void;
}) {
  const meals = useMealMutations();
  const { registered, mark } = useRegisteredMeal(card.id);
  const [registering, setRegistering] = useState(false);
  const [failed, setFailed] = useState(false);

  const register = async () => {
    if (registered || registering || mealRegistrar.isBusy(card.id)) {
      return;
    }
    setRegistering(true);
    setFailed(false);
    const { outcome, meal } = await mealRegistrar.register(
      card.id,
      toSaveInput(draftFromAnalysis(card.meal, new Date()), { source: 'chat', chatMessageId: card.id, language }),
      input => meals.save.mutateAsync(input),
    );
    if (outcome === 'saved' && meal) {
      mark({ id: meal.id, mealType: meal.mealType });
    } else if (outcome === 'failed') {
      setFailed(true);
    }
    setRegistering(false);
  };

  return (
    <MealAnalysisCard
      card={card}
      registered={registered}
      registering={registering}
      error={failed}
      language={language}
      onRegister={() => {
        register().catch(() => undefined);
      }}
      onEdit={onEdit}
      onOpenDay={onOpenDay}
    />
  );
}

// ELLIE_02 / 03 / STATE_08: the conversation. The user's messages are black
// pills, ELLIE speaks without a bubble. A prompt that comes from another
// screen (route params) is sent once when the thread is ready.
export function EllieChatScreen({ navigation, route }: Props) {
  // KeyboardAvoidingView measures itself from its parent, which starts
  // below the TopSafeBar (B-01).
  const topSafeBarHeight = useTopSafeBarHeight();
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile, signOut } = useAuth();
  const language = useProfileLanguage();
  const params = route.params;
  const firstName = profile?.name?.trim().split(/\s+/)[0];
  const greeting = defaultGreeting(firstName);
  const chat = useEllieConversation({
    greeting,
    language,
    conversationId: params?.conversationId === 'new' ? null : params?.conversationId,
    clientContext: params?.source ?? null,
    // The session is gone: back to the sign-in.
    onUnauthorized: () => {
      signOut().catch(() => undefined);
    },
  });
  // "Agregar a semana" from a card: the chat then shows its confirmation card
  // ("Agregada al {día}", "Sustituye a {sesión} en tu plan").
  const addToWeek = useAddToWeek(added =>
    chat.weekPlanAdded({
      date: added.date,
      routineId: null,
      name: added.name,
      replaced: added.substitutes !== null,
      substitutes: added.substitutes,
      planOn: added.planOn,
    }),
  );
  const conversations = useEllieConversations();
  const deleteConversation = useDeleteEllieConversation();
  const { state } = chat;
  const scroll = useRef<ScrollView>(null);
  const input = useRef<TextInput>(null);
  const [menu, setMenu] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [photoMenu, setPhotoMenu] = useState(false);
  const photo = usePhotoAttachment();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const sentPrompt = useRef(false);
  // The routine proposal whose detail sheet is open (one at a time).
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [sheetBusy, setSheetBusy] = useState<'start' | 'save' | 'discard' | null>(null);
  const sheetCard = state.messages.find(
    message => message.id === sheetId && message.kind === 'routineProposal',
  );
  const sheetProposal =
    sheetCard?.kind === 'routineProposal' ? sheetCard.proposal : null;
  // The sheet keeps its proposal while it closes (no blank frame).
  const lastSheetProposal = useRef(sheetProposal);
  if (sheetProposal) {
    lastSheetProposal.current = sheetProposal;
  }

  // The nutrition plan whose detail sheet is open, and its activation.
  const [planSheetId, setPlanSheetId] = useState<string | null>(null);
  const [planBusy, setPlanBusy] = useState<'activate' | 'discard' | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const planCard = state.messages.find(
    message => message.id === planSheetId && message.kind === 'nutritionProposal',
  );
  const planProposal = planCard?.kind === 'nutritionProposal' ? planCard.proposal : null;
  const lastPlanProposal = useRef(planProposal);
  if (planProposal) {
    lastPlanProposal.current = planProposal;
  }
  const openPlanSheet = (id: string) => {
    setPlanError(null);
    setPlanSheetId(id);
  };
  const closeSheets = () => {
    setSheetId(null);
    setPlanSheetId(null);
  };

  // Plan de entrenamiento (tp-1.2 · v2.21 §31.2): the card whose adjust chips
  // are open, the activation (its sheets live in the hook) and "Ver Tu
  // semana" through the single "Ver semana" route.
  const openWeek = useOpenWeek();
  const trainingState = useTrainingPlanState();
  const [planChipsId, setPlanChipsId] = useState<string | null>(null);
  const trainingActivation = useTrainingPlanActivation({
    onActivated: (proposalId, startDate) =>
      chat.trainingPlanStatus(proposalMessageId(proposalId), 'active', startDate),
    onNotOpen: proposalId => chat.trainingPlanStatus(proposalMessageId(proposalId), 'replaced'),
  });
  // Ajustar from the detail (31.3): back here with that card's chips open.
  const planAdjustAt = params?.planAdjust?.at;
  const planAdjustId = params?.planAdjust?.proposalId;
  useEffect(() => {
    if (planAdjustId && planAdjustAt) {
      setPlanChipsId(proposalMessageId(planAdjustId));
    }
  }, [planAdjustAt, planAdjustId]);

  // The saved food preferences (get_food_preferences): "Cambiar" opens the
  // questions with them, and answered cards of the history show them.
  const askingPrefs = state.messages.some(message => message.kind === 'nutritionPrefs');
  const foodPrefs = useQuery({
    queryKey: ['nutrition', 'food-preferences', profile?.id],
    queryFn: getFoodPreferences,
    enabled: askingPrefs && Boolean(profile?.id),
    staleTime: 60_000,
  });

  // The cover's history button: the list opens once the push has settled
  // (iOS does not present a sheet during the transition).
  useEffect(() => {
    if (!params?.showConversations) {
      return;
    }
    const id = setTimeout(() => setListOpen(true), 350);
    return () => clearTimeout(id);
  }, [params?.showConversations]);

  // The prompt of another screen: once, when the thread has loaded.
  useEffect(() => {
    if (!params?.prompt || sentPrompt.current || !chat.ready) {
      return;
    }
    sentPrompt.current = true;
    chat.send(params.prompt, params.mode);
  }, [chat, params?.mode, params?.prompt]);

  const offline = state.blocked === 'offline';
  // AURA: processing until the first delta, active while it streams; back to
  // rest it finishes the turn without a cut.
  const aura = state.streaming ? 'active' : state.thinking ? 'processing' : 'rest';
  const loading = chat.loading;
  const autoFocus = Boolean(params?.focusInput);
  const suggestions = showSuggestions(state);

  const scrollToEnd = useCallback(
    () => scroll.current?.scrollToEnd({ animated: true }),
    [],
  );

  const adjust = () => {
    chat.setDraft('Quiero ajustar este plan: ');
    input.current?.focus();
  };

  const pickSuggestion = (index: number) => {
    const prompt = CANNED_PROMPTS[index];
    closeSheets();
    chat.send(prompt.text, prompt.mode);
  };

  // Ajustar (sliders): the composer prefilled and focused; nothing is sent.
  // What is sent then adjusts that card.
  const adjustRoutine = (proposalId: string) => {
    chat.adjustDraft(proposalId);
    input.current?.focus();
  };

  // Empezar (routine_library): the session of that routine, as from Entrenos —
  // the pending one if there is, else a new one — and then the session screen.
  const [startingId, setStartingId] = useState<string | null>(null);
  const startLibrary = async (message: RoutineLibraryMessage) => {
    const userId = profile?.id;
    if (startingId || !userId) {
      return;
    }
    setStartingId(message.id);
    try {
      const workout = await routinesService.getRoutine(message.library.routineId);
      const pending = await fetchEffectiveWorkoutSession(userId, workout.id);
      if (!pending) {
        await startWorkoutSession({ userId, workout });
      }
      invalidateWorkoutQueries(queryClient, userId).catch(() => undefined);
      closeSheets();
      navigation.navigate(APP_ROUTES.WorkoutSession, { workoutId: workout.id });
    } catch {
      toast.show(addToWeekText(language, 'library.error.start'), { tone: 'error' });
    } finally {
      setStartingId(null);
    }
  };

  // Deshacer (week_plan_added): unplan the day; the card becomes "Quitada del…".
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const undoWeekPlan = async (message: WeekPlanAddedMessage) => {
    if (undoingId) {
      return;
    }
    setUndoingId(message.id);
    try {
      await unplanRoutineForDay(message.added.date);
      chat.weekPlanRemoved(message.id);
    } catch (error) {
      toast.show(
        addToWeekText(
          language,
          error instanceof ProposalError && error.code === 'past_day'
            ? 'weekAdded.error.past_day'
            : 'weekAdded.error.generic',
        ),
        { tone: 'error' },
      );
    } finally {
      setUndoingId(null);
      invalidateWeek(queryClient).catch(() => undefined);
    }
  };

  // week_plan_conflict: replace the plan session directly with the exact
  // routine/proposal reference carried by the card. On success the same card
  // becomes the week_plan_added receipt.
  const [replacingConflictId, setReplacingConflictId] = useState<string | null>(null);
  const [failedConflictId, setFailedConflictId] = useState<string | null>(null);
  const replacePlanConflict = async (message: WeekPlanConflictMessage) => {
    if (replacingConflictId) {
      return;
    }
    const { conflict } = message;
    setReplacingConflictId(message.id);
    setFailedConflictId(null);
    try {
      const result = await planRoutineForDay({
        date: conflict.date,
        routineId: conflict.routineId,
        proposalId: conflict.proposalId,
        replace: true,
        clientId: createUuid(),
      });
      chat.weekPlanConflictResolved(message.id, {
        date: result.date,
        routineId: result.routineId,
        name: result.name || conflict.routineName,
        replaced: true,
        substitutes: conflict.planSession.title,
        planOn: true,
      });
      haptics.success();
      invalidateWeek(queryClient).catch(() => undefined);
    } catch {
      haptics.error();
      setFailedConflictId(message.id);
    } finally {
      setReplacingConflictId(null);
    }
  };

  const SAVE_FAILED = 'No se pudo guardar. Intenta de nuevo.';

  // Guardar (card): the version as ELLIE proposed it.
  const saveFromCard = (id: string) => {
    chat
      .saveProposal(id, NO_EDITS)
      .then(result => {
        if (!result.ok && result.code !== 'proposal_not_open') {
          toast.show(SAVE_FAILED, { tone: 'error' });
        }
      })
      .catch(() => undefined);
  };

  // Guardar en mis rutinas (sheet): with its variants and removed ones.
  const saveFromSheet = async (edits: RoutineEdits) => {
    if (!sheetId || sheetBusy) {
      return;
    }
    setSheetBusy('save');
    const result = await chat.saveProposal(sheetId, edits);
    setSheetBusy(null);
    if (result.ok || result.code === 'proposal_not_open') {
      setSheetId(null);
    } else {
      toast.show(SAVE_FAILED, { tone: 'error' });
    }
  };

  // Empezar ahora: the session with the sheet's version (not in Mis rutinas).
  const startFromSheet = async (edits: RoutineEdits) => {
    if (!sheetId || sheetBusy) {
      return;
    }
    setSheetBusy('start');
    const result = await chat.startProposal(sheetId, edits);
    setSheetBusy(null);
    if (result.ok && result.workoutId) {
      setSheetId(null);
      navigation.navigate(APP_ROUTES.WorkoutSession, {
        workoutId: result.workoutId,
        sessionId: result.sessionId ?? undefined,
      });
      return;
    }
    if (!result.ok && result.code === 'proposal_not_open') {
      setSheetId(null);
      return;
    }
    toast.show('No se pudo empezar. Intenta de nuevo.', { tone: 'error' });
  };

  // Descartar (sheet): the card stays as Descartada; a failure keeps the sheet.
  const discardFromSheet = async () => {
    if (!sheetId || sheetBusy) {
      return;
    }
    setSheetBusy('discard');
    const result = await chat.discardProposal(sheetId);
    setSheetBusy(null);
    if (result.ok || result.code === 'proposal_not_open') {
      setSheetId(null);
      return;
    }
    toast.show('No se pudo descartar. Intenta de nuevo.', { tone: 'error' });
  };

  // Ajustar (plan): "Ajusta el plan: " in the composer, focused.
  const adjustPlan = (proposalId: string) => {
    chat.adjustDraft(proposalId, PLAN_ADJUST_PREFIX);
    input.current?.focus();
  };

  const ACTIVATE_FAILED: Record<string, string> = {
    plan_invalid: 'El plan no pasó la revisión. Pide otra versión a ELLIE.',
    offline: 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
  };

  // Activar plan (sheet). Another plan active: confirm and call again
  // replacing it. A failure keeps the sheet open with the error and
  // "Reintentar"; closing it leaves the card open.
  const activateFromSheet = async (edits: PlanEdits, confirmReplace = false) => {
    if (!planSheetId || planBusy) {
      return;
    }
    const id = planSheetId;
    setPlanBusy('activate');
    setPlanError(null);
    const result = await chat.activatePlanProposal(id, edits, confirmReplace);
    setPlanBusy(null);
    if (result.ok) {
      setPlanSheetId(null);
      return;
    }
    if (result.code === 'plan_active_exists') {
      Alert.alert('Ya tienes un plan activo. ¿Sustituirlo?', undefined, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sustituir',
          onPress: () => {
            activateFromSheet(edits, true).catch(() => undefined);
          },
        },
      ]);
      return;
    }
    if (result.code === 'proposal_not_open') {
      setPlanSheetId(null);
      return;
    }
    setPlanError(ACTIVATE_FAILED[result.code] ?? 'No se pudo activar el plan. Inténtalo de nuevo.');
  };

  // Descartar (plan sheet): the card stays as Descartado.
  const discardPlanFromSheet = async () => {
    if (!planSheetId || planBusy) {
      return;
    }
    setPlanBusy('discard');
    const result = await chat.discardProposal(planSheetId);
    setPlanBusy(null);
    if (result.ok || result.code === 'proposal_not_open') {
      setPlanSheetId(null);
      return;
    }
    toast.show('No se pudo descartar. Intenta de nuevo.', { tone: 'error' });
  };

  // A message (written, chip or suggestion) closes the open sheet.
  const sendText = (text: string) => {
    closeSheets();
    chat.send(text);
  };

  // A photo waiting in the composer goes with the message.
  const sendNow = () => {
    closeSheets();
    const attached = photo.attachment;
    if (attached?.status === 'uploading') {
      return;
    }
    if (attached?.status === 'ready' && attached.path) {
      chat.send(chat.draft, undefined, { uri: attached.uri, path: attached.path });
      photo.clear();
      return;
    }
    chat.send(chat.draft);
  };

  const body = state.messages.map(message => {
    if (message.kind === 'nutrition') {
      return (
        <NutritionPlanCard
          key={message.id}
          card={message}
          regenerating={Boolean(chat.busy[message.id])}
          onActivate={() => chat.activatePlan(message.id)}
          onAnother={() => chat.anotherVersion(message.id)}
          onAdjust={adjust}
        />
      );
    }
    if (message.kind === 'meal') {
      return (
        <MealCard
          key={message.id}
          card={message}
          language={language}
          onEdit={() =>
            navigation.navigate(APP_ROUTES.MealReview, {
              draft: draftFromAnalysis(message.meal, new Date()),
              source: 'chat',
              chatMessageId: message.id,
            })
          }
          onOpenDay={() => navigation.navigate(APP_ROUTES.NutritionPlan)}
        />
      );
    }
    if (message.kind === 'workout') {
      return (
        <RoutineCard
          key={message.id}
          card={message}
          regenerating={Boolean(chat.busy[message.id])}
          onStart={() =>
            message.workoutId &&
            navigation.navigate(APP_ROUTES.WorkoutDetail, {
              workoutId: message.workoutId,
            })
          }
          onSave={() => {
            chat
              .saveRoutine(message.id)
              .then(saved => {
                // Already saved from this message: open that routine.
                if (saved?.replayed) {
                  navigation.navigate(APP_ROUTES.WorkoutDetail, {
                    workoutId: saved.routineId,
                  });
                }
              })
              .catch(() => undefined);
          }}
          onAnother={() => chat.anotherVersion(message.id)}
        />
      );
    }
    if (message.kind === 'routineProposal') {
      return (
        <RoutineProposalCard
          key={message.id}
          card={message}
          onOpen={() => setSheetId(message.id)}
          onSave={() => saveFromCard(message.id)}
          onAdjust={() => adjustRoutine(message.proposalId)}
          onAddToWeek={() =>
            addToWeek.open({
              name: message.proposal?.title ?? '',
              proposalId: message.proposalId,
            })
          }
          onQuickAdjust={text => {
            closeSheets();
            chat.send(text, undefined, null, { adjustProposalId: message.proposalId });
          }}
          onOpenWorkouts={() =>
            navigation.navigate(ROOT_ROUTES.MainTabs, { screen: TAB_ROUTES.Workouts })
          }
          onReload={() => chat.reloadProposal(message.id)}
        />
      );
    }
    if (message.kind === 'routineLibrary') {
      return (
        <RoutineLibraryCard
          key={message.id}
          card={message}
          starting={startingId === message.id}
          onStart={() => {
            startLibrary(message).catch(() => undefined);
          }}
          onAddToWeek={() =>
            addToWeek.open({ name: message.library.name, routineId: message.library.routineId })
          }
          onView={() =>
            navigation.navigate(APP_ROUTES.WorkoutDetail, { workoutId: message.library.routineId })
          }
          onAdjust={() => sendText(addToWeekText(language, 'library.adjust'))}
        />
      );
    }
    if (message.kind === 'weekPlanConflict') {
      return (
        <WeekPlanConflictCard
          key={message.id}
          card={message}
          replacing={replacingConflictId === message.id}
          failed={failedConflictId === message.id}
          onReplace={() => {
            replacePlanConflict(message).catch(() => undefined);
          }}
          onChooseAnother={() =>
            addToWeek.open({
              name: message.conflict.routineName,
              routineId: message.conflict.routineId,
              proposalId: message.conflict.proposalId,
            })
          }
        />
      );
    }
    if (message.kind === 'planAdjustment') {
      return (
        <PlanAdjustmentChatCard
          key={message.id}
          adjustment={message.adjustment}
          answered={message.answered}
          onAnswered={action => chat.planAdjustmentAnswered(message.id, action)}
        />
      );
    }
    if (message.kind === 'planReview') {
      return (
        <PlanReviewChatCard
          key={message.id}
          card={message}
          onOpen={weekIndex => navigation.navigate(APP_ROUTES.PlanReview, { weekIndex })}
        />
      );
    }
    if (message.kind === 'planActionConfirm') {
      return (
        <PlanActionConfirmCard
          key={message.id}
          card={message}
          onStatus={(status, pausedUntil) => chat.planActionStatus(message.id, status, pausedUntil)}
          onEnded={planId => {
            if (planId) {
              navigation.navigate(APP_ROUTES.PlanReport, { planId });
            }
          }}
        />
      );
    }
    if (message.kind === 'weekPlanAdded') {
      return (
        <WeekPlanAddedCard
          key={message.id}
          card={message}
          undoing={undoingId === message.id}
          onViewWeek={() =>
            openWeek({
              weekStart: weekStartOf(message.added.date),
              date: message.added.date,
            })
          }
          onUndo={() => {
            undoWeekPlan(message).catch(() => undefined);
          }}
        />
      );
    }
    if (message.kind === 'discomfortCheck') {
      return (
        <DiscomfortCheckCard
          key={message.id}
          card={message}
          disabled={state.thinking}
          onAnswer={(chip, zone) => {
            closeSheets();
            chat.answerDiscomfort(message.id, chip, zone);
          }}
        />
      );
    }
    if (message.kind === 'nutritionPrefs') {
      return (
        <NutritionPrefsCard
          key={message.id}
          card={message}
          current={foodPrefs.data ?? null}
          disabled={state.thinking}
          onSubmit={prefs => {
            closeSheets();
            return chat.submitPrefs(message.id, prefs).then(ok => {
              if (ok) {
                foodPrefs.refetch().catch(() => undefined);
              }
              return ok;
            });
          }}
          onChange={() => chat.reopenPrefs(message.id)}
        />
      );
    }
    if (message.kind === 'trainingPlanProposal') {
      const planId = message.proposal?.planId ?? null;
      // Active here, or already the active (or paused) plan elsewhere.
      const isActive =
        message.status === 'active' ||
        (message.status === 'open' &&
          Boolean(planId) &&
          planId === trainingState.data?.planId &&
          (trainingState.data?.state === 'active' || trainingState.data?.state === 'paused'));
      return (
        <TrainingPlanProposalCard
          key={message.id}
          proposal={message.proposal}
          status={isActive ? 'active' : message.status}
          version={message.version}
          activating={trainingActivation.busyId === message.proposalId}
          startDate={message.startDate}
          chipsOpen={planChipsId === message.id}
          disabled={state.thinking}
          onActivate={() => {
            setPlanChipsId(null);
            trainingActivation
              .activate({ proposalId: message.proposalId, startDate: message.proposal?.startDate ?? null })
              .catch(() => undefined);
          }}
          onToggleChips={() => setPlanChipsId(current => (current === message.id ? null : message.id))}
          onChip={text => {
            closeSheets();
            setPlanChipsId(null);
            chat.send(text, undefined, null, { adjustProposalId: message.proposalId });
          }}
          onViewAll={() =>
            navigation.navigate(APP_ROUTES.TrainingPlanPreview, { proposalId: message.proposalId })
          }
          onViewWeek={() => openWeek()}
          onReload={() => chat.reloadProposal(message.id)}
        />
      );
    }
    if (message.kind === 'nutritionProposal') {
      return (
        <NutritionProposalCard
          key={message.id}
          card={message}
          onOpen={() => openPlanSheet(message.id)}
          onAnother={() => {
            closeSheets();
            chat.send(PLAN_ANOTHER_VERSION, undefined, null, { adjustProposalId: message.proposalId });
          }}
          onAdjust={() => adjustPlan(message.proposalId)}
          onQuickAdjust={text => {
            closeSheets();
            chat.send(text, undefined, null, { adjustProposalId: message.proposalId });
          }}
          onOpenNutrition={() => navigation.navigate(APP_ROUTES.NutritionPlan)}
          onReload={() => chat.reloadProposal(message.id)}
        />
      );
    }
    if (message.role === 'user') {
      return (
        <UserPill
          key={message.id}
          text={message.text}
          status={message.status}
          imageUri={message.imageUri}
          imagePath={message.imagePath}
          onRetry={
            message.failure && !isRetryable(message.failure.code)
              ? undefined
              : () => chat.retry(message.id)
          }
        />
      );
    }
    return (
      <EllieVoice key={message.id} text={message.text} muted={message.notice} />
    );
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 6, paddingHorizontal: layout.gutter - 4 },
        ]}
      >
        <BackButton variant="muted" onPress={() => navigation.goBack()} />
        <View style={styles.title} accessibilityRole="header">
          <AuraMark size={28} state={aura} offline={offline} />
          <View>
            <TextV2 variant="bodyStrong">ELLIE</TextV2>
            <TextV2 variant="caption" color={colors.ellie.textSecondary}>
              {offline ? 'Sin conexión' : 'Contigo'}
            </TextV2>
          </View>
        </View>
        <IconButton
          icon={MoreHorizontal}
          variant="muted"
          accessibilityLabel="Más opciones"
          onPress={() => setMenu(true)}
        />
      </View>

      <KeyboardAvoidingView
        keyboardVerticalOffset={topSafeBarHeight}
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
          contentContainerStyle={[
            styles.thread,
            { paddingHorizontal: layout.gutter },
          ]}
        >
          {loading ? (
            <SkeletonGroup>
              <View style={styles.skeleton}>
                <Skeleton height={20} width="88%" />
                <Skeleton height={20} width="74%" />
                <Skeleton height={20} width="52%" />
              </View>
            </SkeletonGroup>
          ) : (
            <>
              {chat.historyFailed ? (
                <PressableScale
                  accessibilityRole="button"
                  onPress={() => chat.refetchHistory()}
                >
                  <TextV2 variant="meta" color={colors.text.secondary}>
                    No pudimos cargar tu conversación ·{' '}
                    <TextV2 variant="metaStrong">Reintentar</TextV2>
                  </TextV2>
                </PressableScale>
              ) : null}
              {body}
              {state.thinking && !state.streaming ? <ThinkingIndicator /> : null}
              {suggestions ? (
                <SuggestionPills
                  items={CANNED_PROMPTS.map(prompt => prompt.text)}
                  onPick={pickSuggestion}
                />
              ) : null}
            </>
          )}
        </ScrollView>

        {photo.attachment ? (
          <View style={[styles.attachment, { paddingHorizontal: layout.gutter }]}>
            <View style={[styles.attachThumb, { backgroundColor: colors.surface.muted }]}>
              <Image source={{ uri: photo.attachment.uri }} style={styles.attachImage} resizeMode="cover" />
              {photo.attachment.status === 'uploading' ? <View style={styles.attachVeil} /> : null}
            </View>
            {photo.attachment.status === 'failed' ? (
              <PressableScale accessibilityRole="button" onPress={() => { photo.retry().catch(() => undefined); }} style={styles.attachRetry}>
                <RefreshCw size={14} color={colors.ember.deep} strokeWidth={2.2} />
                <TextV2 variant="metaStrong" color={colors.ember.deep}>
                  {language === 'es' ? 'No se subió · Reintentar' : "Didn't upload · Retry"}
                </TextV2>
              </PressableScale>
            ) : (
              <TextV2 variant="meta" tone="secondary" style={styles.flex}>
                {photo.attachment.status === 'uploading'
                  ? language === 'es' ? 'Subiendo foto…' : 'Uploading photo…'
                  : language === 'es' ? 'Foto lista' : 'Photo ready'}
              </TextV2>
            )}
            <PressableScale accessibilityRole="button" accessibilityLabel={language === 'es' ? 'Quitar foto' : 'Remove photo'} onPress={photo.clear} style={styles.attachClose}>
              <X size={16} color={colors.text.secondary} strokeWidth={2.2} />
            </PressableScale>
          </View>
        ) : null}
        <View
          style={[
            styles.composer,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              paddingHorizontal: layout.gutter,
            },
          ]}
        >
          <EllieComposer
            ref={input}
            variant="input"
            placeholder={chat.composer.placeholder}
            value={chat.draft}
            onChangeText={chat.setDraft}
            onSend={sendNow}
            canSend={chat.composer.canSend || (photo.attachment?.status === 'ready' && !chat.state.thinking && !chat.composer.disabled)}
            disabled={chat.composer.disabled}
            autoFocus={autoFocus}
            auraState={aura}
            onPhoto={() => setPhotoMenu(true)}
          />
        </View>
      </KeyboardAvoidingView>

      <RoutineProposalSheet
        open={sheetId !== null && sheetProposal !== null}
        proposal={sheetProposal ?? lastSheetProposal.current}
        busy={sheetBusy}
        onClose={() => {
          if (!sheetBusy) {
            setSheetId(null);
          }
        }}
        onStart={edits => {
          startFromSheet(edits).catch(() => undefined);
        }}
        onSave={edits => {
          saveFromSheet(edits).catch(() => undefined);
        }}
        onDiscard={() => {
          discardFromSheet().catch(() => undefined);
        }}
      />

      <NutritionProposalSheet
        open={planSheetId !== null && planProposal !== null}
        proposal={planProposal ?? lastPlanProposal.current}
        busy={planBusy}
        error={planError}
        onClose={() => {
          if (!planBusy) {
            setPlanSheetId(null);
            setPlanError(null);
          }
        }}
        onActivate={edits => {
          activateFromSheet(edits).catch(() => undefined);
        }}
        onDiscard={() => {
          discardPlanFromSheet().catch(() => undefined);
        }}
      />

      {addToWeek.sheet}

      {trainingActivation.sheets}

      <PhotoSourceSheet
        open={photoMenu}
        onClose={() => setPhotoMenu(false)}
        onPicked={picked => {
          photo.attach(picked).catch(() => undefined);
        }}
        language={language}
      />

      <Sheet open={menu} onClose={() => setMenu(false)} title="ELLIE">
        <PressableScale
          accessibilityRole="button"
          onPress={() => {
            setMenu(false);
            chat.newConversation();
          }}
          style={styles.menuRow}
        >
          <MessageSquarePlus size={20} color={colors.text.primary} strokeWidth={1.8} />
          <TextV2 variant="cta">Nueva conversación</TextV2>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          onPress={() => {
            setMenu(false);
            setTimeout(() => setListOpen(true), 350);
          }}
          style={styles.menuRow}
        >
          <MoreHorizontal size={20} color={colors.text.primary} strokeWidth={1.8} />
          <TextV2 variant="cta">Conversaciones</TextV2>
        </PressableScale>
      </Sheet>

      <Sheet open={listOpen} onClose={() => setListOpen(false)} title="Conversaciones" scrollable>
        {conversations.isLoading ? (
          <SkeletonGroup>
            <View style={styles.skeleton}>
              <Skeleton height={20} width="80%" />
              <Skeleton height={20} width="60%" />
            </View>
          </SkeletonGroup>
        ) : conversations.isError ? (
          <PressableScale accessibilityRole="button" onPress={() => conversations.refetch()}>
            <TextV2 variant="meta" color={colors.text.secondary}>
              No pudimos cargar tus conversaciones ·{' '}
              <TextV2 variant="metaStrong">Reintentar</TextV2>
            </TextV2>
          </PressableScale>
        ) : (conversations.data ?? []).length === 0 ? (
          <TextV2 variant="body" color={colors.text.secondary}>
            Aún no tienes conversaciones.
          </TextV2>
        ) : (
          (conversations.data ?? []).map(item => (
            <View key={item.id} style={styles.convRow}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={item.title || 'Conversación'}
                onPress={() => {
                  setListOpen(false);
                  chat.openConversation(item.id);
                }}
                style={styles.flex}
              >
                <TextV2
                  variant="bodyStrong"
                  numberOfLines={1}
                  color={item.id === chat.conversationId ? colors.ember.strong : undefined}
                >
                  {item.title || 'Conversación'}
                </TextV2>
                <TextV2 variant="caption" color={colors.text.secondary}>
                  {relativeWhen(item.updatedAt, new Date())}
                </TextV2>
              </PressableScale>
              <IconButton
                icon={Trash2}
                variant="muted"
                accessibilityLabel="Borrar conversación"
                onPress={() => {
                  setListOpen(false);
                  setTimeout(() => setPendingDelete(item.id), 350);
                }}
              />
            </View>
          ))
        )}
      </Sheet>

      <Sheet
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="¿Borrar esta conversación?"
        footer={
          <Button
            label="Borrar"
            onPress={async () => {
              const id = pendingDelete;
              setPendingDelete(null);
              if (!id) {
                return;
              }
              try {
                await deleteConversation.mutateAsync(id);
                if (id === chat.conversationId) {
                  chat.newConversation();
                }
              } catch {
                toast.show('No pudimos borrar la conversación', {
                  tone: 'error',
                });
              }
            }}
            style={styles.flex}
          />
        }
      >
        <TextV2 variant="body" color={colors.text.secondary}>
          Se borra la conversación con todos sus mensajes y no se puede recuperar.
        </TextV2>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  title: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thread: { gap: 22, paddingTop: 18, paddingBottom: 24, flexGrow: 1 },
  skeleton: { gap: 12 },
  composer: { paddingTop: 8 },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
  attachThumb: { width: 56, height: 56, borderRadius: 14, overflow: 'hidden' },
  attachImage: { width: 56, height: 56 },
  attachVeil: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,13,12,.45)' },
  attachRetry: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  attachClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
});
