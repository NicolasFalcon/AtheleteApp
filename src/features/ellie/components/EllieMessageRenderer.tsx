import {EllieGeneratedWorkoutCard} from '@app/features/ellie/components/EllieGeneratedWorkoutCard';
import {EllieMessageBubble} from '@app/features/ellie/components/EllieMessageBubble';
import {EllieNutritionPlanCard} from '@app/features/ellie/components/EllieNutritionPlanCard';
import type {EllieUiMessage} from '@app/hooks/useEllieChat';

type EllieMessageRendererProps = {
  message: EllieUiMessage;
  busyMessageId?: string | null;
  busyAction?: 'save' | 'activate' | 'regenerate' | null;
  onSaveWorkout: (messageId: string) => void;
  onActivatePlan: (messageId: string) => void;
  onDiscard: (messageId: string) => void;
  onRegenerate: (messageId: string) => void;
  onOpenNutritionPlan?: () => void;
};

export function EllieMessageRenderer({
  message,
  busyMessageId,
  busyAction,
  onSaveWorkout,
  onActivatePlan,
  onDiscard,
  onRegenerate,
  onOpenNutritionPlan,
}: EllieMessageRendererProps) {
  if (message.kind === 'workout_preview') {
    if (message.discarded) {
      return (
        <EllieMessageBubble
          message={{
            id: `${message.id}-discarded`,
            role: 'assistant',
            kind: 'text',
            content: 'Rutina descartada. Si quieres, puedo generar otra distinta.',
          }}
        />
      );
    }

    return (
      <EllieGeneratedWorkoutCard
        workout={message.workoutData}
        saved={message.saved}
        isSaving={busyMessageId === message.id && busyAction === 'save'}
        isRegenerating={busyMessageId === message.id && busyAction === 'regenerate'}
        onSave={() => onSaveWorkout(message.id)}
        onDiscard={() => onDiscard(message.id)}
        onRegenerate={() => onRegenerate(message.id)}
      />
    );
  }

  if (message.kind === 'nutrition_preview') {
    if (message.discarded) {
      return (
        <EllieMessageBubble
          message={{
            id: `${message.id}-discarded`,
            role: 'assistant',
            kind: 'text',
            content: 'Plan descartado. Puedo preparar otra versión cuando quieras.',
          }}
        />
      );
    }

    return (
      <EllieNutritionPlanCard
        plan={message.nutritionData}
        saved={message.saved}
        isSaving={busyMessageId === message.id && busyAction === 'activate'}
        isRegenerating={busyMessageId === message.id && busyAction === 'regenerate'}
        onSave={() => onActivatePlan(message.id)}
        onDiscard={() => onDiscard(message.id)}
        onRegenerate={() => onRegenerate(message.id)}
        onOpenPlan={message.saved ? onOpenNutritionPlan : undefined}
      />
    );
  }

  return <EllieMessageBubble message={message} />;
}
