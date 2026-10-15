import type { Meal, SaveMealInput } from '@app/services/nutrition/mealsService';

// "Registrar en Calorías" on the card of the chat: one chat message becomes at
// most one meal. A tap while it is being saved, or after it was saved, does
// nothing; a failure lets the person try again.
export type RegisterOutcome = 'saved' | 'duplicate' | 'failed';

export function createMealRegistrar() {
  const inFlight = new Set<string>();
  const done = new Set<string>();
  return {
    isBusy: (messageId: string) => inFlight.has(messageId) || done.has(messageId),
    // A meal found in the database (the card of an old thread, or one saved
    // from the editor) is registered too.
    markDone: (messageId: string) => void done.add(messageId),
    async register(
      messageId: string,
      input: SaveMealInput,
      save: (input: SaveMealInput) => Promise<Meal>,
    ): Promise<{ outcome: RegisterOutcome; meal: Meal | null }> {
      if (inFlight.has(messageId) || done.has(messageId)) {
        return { outcome: 'duplicate', meal: null };
      }
      inFlight.add(messageId);
      try {
        const meal = await save({ ...input, source: 'chat', chatMessageId: messageId });
        done.add(messageId);
        return { outcome: 'saved', meal };
      } catch {
        return { outcome: 'failed', meal: null };
      } finally {
        inFlight.delete(messageId);
      }
    },
  };
}

// One registrar for the whole app: the guard survives the screen being rebuilt.
export const mealRegistrar = createMealRegistrar();
