import type {EllieActionType} from '@app/shared';

export type NotificationIconName =
  | 'dumbbell'
  | 'target'
  | 'droplets'
  | 'utensils'
  | 'sparkles'
  | 'trophy'
  | 'heart'
  | 'trending-up'
  | 'brain';

export type NotificationDestination =
  | 'workouts'
  | 'challenge'
  | 'hydration'
  | 'nutrition'
  | 'ellie'
  | 'progress'
  | 'quiz'
  | 'personal-records';

export type ProductNotification = {
  id: string;
  icon: NotificationIconName;
  title: string;
  summary: string;
  contextLabel: string;
  actionLabel: string;
  priority: number;
  unread: boolean;
  tone: 'reminder' | 'positive' | 'encouragement';
  destination: NotificationDestination;
  sourceAction?: EllieActionType | null;
};
