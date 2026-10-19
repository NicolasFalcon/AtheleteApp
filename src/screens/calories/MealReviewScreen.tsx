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
  const { draft: initial, photoUri = null, source, chatMessageId, mealId } = route.params;
  const toast = useToast();
  const language = useProfileLanguage();
  const es = language === 'es';
  const { signOut } = useAuth();
  const meals = useMealMutations();
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
      if (mealId) {
        await meals.update.mutateAsync({ id: mealId, input: toUpdateInput(draft, language) });
        toast.show(es ? 'Cambios guardados' : 'Changes saved');
        navigation.goBack();
      } else {
        if (chatMessageId) {
          // Edited from the card of the chat: still one meal per card.
          const { outcome, meal } = await mealRegistrar.register(
            chatMessageId,
            toSaveInput(draft, { source, chatMessageId, language }),
            input => meals.save.mutateAsync(input),
          );
          if (outcome === 'failed') {
            throw new Error('save failed');
          }
          if (meal) {
            registeredCard.mark({ id: meal.id, mealType: meal.mealType });
          }
        } else {
          await meals.save.mutateAsync(toSaveInput(draft, { source, chatMessageId, language }));
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
        mode={mealId ? 'edit' : 'new'}
        language={language}
        submitting={busy}
        error={error}
        onSubmit={() => {
          submit().catch(() => undefined);
        }}
        onClose={close}
        onRetake={source === 'photo' ? () => navigation.replace(APP_ROUTES.CaloriesCamera, { source: 'nutrition' }) : undefined}
        onHint={draft.imagePath && !mealId ? hint : undefined}
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

