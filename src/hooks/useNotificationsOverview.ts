import {useMemo} from 'react';
import {useEllieData} from '@app/hooks/useEllieData';
import type {EllieActionType, EllieNudge} from '@app/shared';
import type {
  NotificationDestination,
  ProductNotification,
} from '@app/features/notifications/types';

function getRelativeDayLabel(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86400000);

  if (days <= 0) {
    return 'Hoy';
  }

  if (days === 1) {
    return 'Ayer';
  }

  if (days < 7) {
    return `Hace ${days} días`;
  }

  return `Hace ${Math.floor(days / 7)} sem`;
}

function getActionTitle(action: EllieActionType | null, fallbackId: string) {
  switch (action) {
    case 'start_workout':
    case 'generate_workout':
      return 'Entreno pendiente';
    case 'view_challenge':
      return 'Core 33 requiere atención';
    case 'log_hydration':
      return 'Hidratación por completar';
    case 'log_nutrition':
    case 'generate_nutrition':
      return 'Nutrición de hoy';
    case 'view_progress':
      return 'Revisa tu progreso';
    case 'ask_ellie':
      return 'ELLIE tiene una sugerencia';
    default:
      return fallbackId.includes('all-done') ? 'Todo al día' : 'Recordatorio Athelete';
  }
}

function getDestination(action: EllieActionType | null): NotificationDestination {
  switch (action) {
    case 'start_workout':
    case 'generate_workout':
      return 'workouts';
    case 'view_challenge':
      return 'challenge';
    case 'log_hydration':
      return 'hydration';
    case 'log_nutrition':
    case 'generate_nutrition':
      return 'nutrition';
    case 'view_progress':
      return 'progress';
    case 'ask_ellie':
    default:
      return action ? 'ellie' : 'progress';
  }
}

function mapNudgeToNotification(nudge: EllieNudge): ProductNotification {
  return {
    id: nudge.id,
    icon: nudge.icon,
    title: getActionTitle(nudge.action, nudge.id),
    summary: nudge.text,
    contextLabel: nudge.tone === 'positive' ? 'Logro reciente' : 'Para hoy',
    actionLabel: nudge.actionLabel || 'Ver detalle',
    priority: nudge.priority,
    unread: nudge.tone !== 'positive',
    tone: nudge.tone,
    destination: getDestination(nudge.action),
    sourceAction: nudge.action,
  };
}

export function useNotificationsOverview() {
  const ellieData = useEllieData();

  const notifications = useMemo<ProductNotification[]>(() => {
    const context = ellieData.context;
    const items = ellieData.nudges.map(mapNudgeToNotification);

    if (!context) {
      return items;
    }

    if (!context.nutrition.hasActivePlan) {
      items.push({
        id: 'nutrition-plan-missing',
        icon: 'utensils',
        title: 'Activa tu plan nutricional',
        summary:
          'ELLIE puede calcular tus calorías y macros para que el plan quede conectado a tu objetivo.',
        contextLabel: 'Configuración pendiente',
        actionLabel: 'Crear con ELLIE',
        priority: 4.5,
        unread: true,
        tone: 'reminder',
        destination: 'ellie',
        sourceAction: 'generate_nutrition',
      });
    }

    if (ellieData.personalRecordsQuery.latestRecord && ellieData.recentPrLabel) {
      const latest = ellieData.personalRecordsQuery.latestRecord;
      const daysSince =
        (Date.now() - new Date(latest.recordedAt).getTime()) / 86400000;

      if (daysSince < 7) {
        items.push({
          id: `recent-pr-${latest.id}`,
          icon: 'trophy',
          title: 'Nuevo PR registrado',
          summary: ellieData.recentPrLabel,
          contextLabel: getRelativeDayLabel(latest.recordedAt),
          actionLabel: 'Ver PR',
          priority: 7,
          unread: false,
          tone: 'positive',
          destination: 'personal-records',
        });
      }
    }

    if (ellieData.weeklySummary) {
      const weekly = ellieData.weeklySummary;
      const hasMetTrainingGoal =
        weekly.workoutsGoal > 0 && weekly.workoutsCompleted >= weekly.workoutsGoal;

      if (hasMetTrainingGoal) {
        items.push({
          id: 'weekly-training-goal',
          icon: 'trending-up',
          title: 'Semana bien encaminada',
          summary: `${weekly.workoutsCompleted}/${weekly.workoutsGoal} entrenos completados. ${weekly.suggestion}`,
          contextLabel: 'Progreso semanal',
          actionLabel: 'Ver progreso',
          priority: 8,
          unread: false,
          tone: 'positive',
          destination: 'progress',
          sourceAction: 'view_progress',
        });
      }
    }

    return [...items]
      .sort((left, right) => left.priority - right.priority)
      .slice(0, 8);
  }, [
    ellieData.context,
    ellieData.nudges,
    ellieData.personalRecordsQuery.latestRecord,
    ellieData.recentPrLabel,
    ellieData.weeklySummary,
  ]);

  return {
    notifications,
    unreadCount: notifications.filter(item => item.unread).length,
    isLoading:
      ellieData.overviewQuery.isLoading ||
      ellieData.personalRecordsQuery.isLoading ||
      ellieData.exercisesQuery.isLoading,
    error:
      ellieData.overviewQuery.error ||
      ellieData.personalRecordsQuery.error ||
      ellieData.exercisesQuery.error ||
      null,
  };
}
