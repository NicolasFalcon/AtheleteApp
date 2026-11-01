import { useRef, useState } from 'react';
import { useToast } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import {
  draftFromAnalysis,
  toSaveInput,
  toUpdateInput,
  type MealDraft,
} from '@app/features/nutrition/mealDraft';
import { MealResultView } from '@app/features/nutrition/v2/MealResultView';
import {
  SLOT_LABELS,
  foodsFromDraft,
  mealTypeToSlot,
} from '@app/features/nutrition/nutritionDayModel';
import { useMealEntryMutations } from '@app/features/nutrition/useNutritionToday';
import { getLocalDateKey } from '@app/lib/date';
import { itemValues } from '@app/features/nutrition/mealDraft';
import { useVisionUsage } from '@app/features/vision/useVisionUsage';
import { VisionFailureSheet } from '@app/features/vision/v2/VisionFailureSheet';
import { visionFailureFrom, type VisionAction, type VisionFailureInput } from '@app/features/vision/visionCopy';
import { useAuth } from '@app/hooks/useAuth';
import { useMealMutations } from '@app/hooks/useMeals';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { useRegisteredMeal } from '@app/hooks/useRegisteredMeal';
import { createUuid } from '@app/lib/uuid';
import { mealRegistrar } from '@app/features/nutrition/mealRegistrar';
import { analyzeMeal, VisionError } from '@app/services/vision/visionService';
import type { AppScreenProps } from '@app/types/navigation';

// Resultado de la foto / tarjeta del chat / edición de una comida: the draft is
// corrected here and only "Añadir al día" (or "Guardar cambios") writes it.
export function MealReviewScreen({ navigation, route }: AppScreenProps<'MealReview'>) {
  const { draft: initial, photoUri = null, source, chatMessageId, mealId, entry } = route.params;
  const toast = useToast();
  const language = useProfileLanguage();
  const es = language === 'es';
  const { signOut } = useAuth();
  const meals = useMealMutations();
  const entries = useMealEntryMutations();
  // One confirmation = one log_meal_entry, even if "Guardar" is retried.
  const clientId = useRef(createUuid());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const quota = useVisionUsage('meal');
  const registeredCard = useRegisteredMeal(chatMessageId ?? '');
  const [draft, setDraft] = useState<MealDraft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [hinting, setHinting] = useState(false);
  const [hintNote, setHintNote] = useState<string | null>(null);
  const [failure, setFailure] = useState<VisionFailureInput | null>(null);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);

  const close = () => navigation.goBack();

  const submit = async () => {
    if (submitting.current) {
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      if (entry) {
        // Nutrición · Hoy: an entry of the day edited (nut-1).
        await entries.update.mutateAsync({
          entryId: entry.id,
          date: entry.date,
          slot: mealTypeToSlot(draft.mealType),
          items: foodsFromDraft(draft, 'Comida'),
        });
        toast.show(es ? 'Cambios guardados' : 'Changes saved');
        navigation.goBack();
      } else if (mealId) {
        await meals.update.mutateAsync({ id: mealId, input: toUpdateInput(draft, language) });
        toast.show(es ? 'Cambios guardados' : 'Changes saved');
        navigation.goBack();
      } else {
        if (chatMessageId) {
          // Edited from the card of the chat: still one meal per card.
          const { outcome, meal } = await mealRegistrar.register(
            chatMessageId,
            toSaveInput(draft, { source: 'chat', chatMessageId, language }),
            input => meals.save.mutateAsync(input),
          );
          if (outcome === 'failed') {
            throw new Error('save failed');
          }
          if (meal) {
            registeredCard.mark({ id: meal.id, mealType: meal.mealType });
          }
        } else {
          // Foto · Describir: log_meal_entry in the chosen moment (nut-1).
          await entries.log.mutateAsync({
            date: getLocalDateKey(),
            slot: mealTypeToSlot(draft.mealType),
            items: foodsFromDraft(draft, 'Comida'),
            source: source === 'text' ? 'texto' : 'foto',
            clientId: clientId.current,
          });
        }
        toast.show(es ? 'Comida registrada' : 'Meal logged');
        navigation.popTo(APP_ROUTES.NutritionPlan);
      }
    } catch {
      // The cached day went back to how it was.
      setError(es ? 'No pudimos guardarla. Revisa tu conexión e inténtalo de nuevo.' : "We couldn't save it. Check your connection and try again.");
      submitting.current = false;
      setBusy(false);
    }
  };

  // "Dile algo a ELLIE": the photo is analysed again with the note.
  const hint = async (text: string) => {
    if (!draft.imagePath) {
      return;
    }
    setHinting(true);
    setHintNote(null);
    try {
      // A note is a new request: its own client_request_id.
      const { draft: next, usage } = await analyzeMeal({
        imagePath: draft.imagePath,
        clientRequestId: createUuid(),
        hint: text,
      });
      quota.record(usage);
      const fresh = draftFromAnalysis(next, new Date());
      setDraft(current => ({
        ...fresh,
        // What the person already chose stays chosen.
        mealType: current.mealTypeFromClock ? fresh.mealType : current.mealType,
        mealTypeFromClock: current.mealTypeFromClock && fresh.mealTypeFromClock,
      }));
      setHintNote(es ? 'Listo, recalculé el plato con tu nota.' : 'Done, I recalculated the plate with your note.');
    } catch (cause) {
      if (cause instanceof VisionError && cause.usage) {
        quota.record(cause.usage);
      }
      setFailure(visionFailureFrom(cause));
    } finally {
      setHinting(false);
    }
  };

  // ☆ of a food: saved as a favourite at once (toggle_favorite_food).
  const toggleFavorite = (itemId: string) => {
    const item = draft.items.find(food => food.id === itemId);
    if (!item) {
      return;
    }
    const values = itemValues(item);
    setFavoriteIds(current => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
    entries.favorite
      .mutateAsync({
        item: { name: values.name, grams: values.grams > 0 ? values.grams : null, kcal: values.kcal, p: values.protein, c: values.carbs, g: values.fats },
      })
      .catch(() => {
        setFavoriteIds(current => {
          const next = new Set(current);
          if (next.has(itemId)) {
            next.delete(itemId);
          } else {
            next.add(itemId);
          }
          return next;
        });
        toast.show(es ? 'No pudimos guardar el favorito' : "We couldn't save the favourite", { tone: 'error' });
      });
  };

  // Nutrición · Hoy flows (not the chat card, not the old editor).
  const nut1 = !chatMessageId && !mealId;

  const onAction = (action: VisionAction) => {
    setFailure(null);
    if (action === 'login') {
      signOut().catch(() => undefined);
    }
  };

  return (
    <>
      <MealResultView
        draft={draft}
        onChange={setDraft}
        photoUri={photoUri}
        mode={mealId || entry ? 'edit' : 'new'}
        ctaLabel={nut1 && !entry ? `Guardar en ${SLOT_LABELS[mealTypeToSlot(draft.mealType)]}` : undefined}
        estimateLabel={source === 'text' && !entry}
        favorites={nut1 ? { isOn: id => favoriteIds.has(id), toggle: toggleFavorite } : undefined}
        language={language}
        submitting={busy}
        error={error}
        onSubmit={() => {
          submit().catch(() => undefined);
        }}
        onClose={close}
        onRetake={source === 'photo' ? () => navigation.replace(APP_ROUTES.CaloriesCamera, { source: 'nutrition' }) : undefined}
        onHint={draft.imagePath && !mealId && !entry ? hint : undefined}
        hinting={hinting}
        hintNote={hintNote}
      />
      <VisionFailureSheet
        failure={failure}
        context="meal"
        language={language}
        onAction={onAction}
        onClose={() => setFailure(null)}
      />
    </>
  );
}

