import { APP_ROUTES, ROOT_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import type { PushTarget } from '@app/features/push/pushRoute';

export type TargetChecks = {
  postExists: (postId: string) => Promise<boolean>;
  challengeExists: (challengeId: string) => Promise<boolean>;
  postOfNotification: (notificationId: string) => Promise<string | null>;
  actorOfNotification: (notificationId: string) => Promise<string | null>;
};

const INBOX: PushTarget = { kind: 'inbox' };

// A notification can outlive what it points to (a deleted post, a cancelled
// challenge): when the entity is not there any more, the inbox opens.
export async function resolveTarget(target: PushTarget, checks: TargetChecks): Promise<PushTarget> {
  try {
    switch (target.kind) {
      case 'post':
        return (await checks.postExists(target.postId)) ? target : INBOX;
      case 'challenge':
        return (await checks.challengeExists(target.challengeId)) ? target : INBOX;
      case 'comment': {
        const postId = await checks.postOfNotification(target.notificationId);
        return postId && (await checks.postExists(postId)) ? { kind: 'post', postId } : INBOX;
      }
      case 'follower': {
        const userId = await checks.actorOfNotification(target.notificationId);
        return userId ? { kind: 'profile', userId } : INBOX;
      }
      default:
        return target;
    }
  } catch {
    // Offline or unreadable: the inbox is always a safe place.
    return INBOX;
  }
}

export type Navigate = (name: string, params?: object) => void;

export function navigateToTarget(
  navigate: Navigate,
  target: PushTarget,
  context: { isCoach?: boolean } = {},
): void {
  switch (target.kind) {
    case 'coachStudents':
      navigate(APP_ROUTES.CoachStudents);
      break;
    case 'coachStudent':
      navigate(APP_ROUTES.CoachStudent, { linkId: target.linkId });
      break;
    case 'routine':
      navigate(APP_ROUTES.WorkoutDetail, { workoutId: target.workoutId });
      break;
    case 'workouts':
      navigate(ROOT_ROUTES.MainTabs, { screen: TAB_ROUTES.Workouts, params: { area: 'mine' } });
      break;
    case 'nutrition':
      navigate(APP_ROUTES.NutritionPlan);
      break;
    case 'coachLinkEnded': {
      navigate(context.isCoach === true ? APP_ROUTES.CoachStudents : APP_ROUTES.Profile);
      break;
    }
    case 'planReview':
      navigate(APP_ROUTES.PlanReview, target.weekIndex ? { weekIndex: target.weekIndex } : undefined);
      break;
    case 'plan':
      // Tu semana in its plan view; WeekRoute still checks the live state.
      navigate(APP_ROUTES.Week, {
        view: 'plan',
        ...(target.adjustmentId ? { adjustmentId: target.adjustmentId } : null),
      });
      break;
    case 'planReport':
      navigate(APP_ROUTES.PlanReport, target.planId ? { planId: target.planId } : undefined);
      break;
    case 'friends':
      navigate(ROOT_ROUTES.MainTabs, { screen: TAB_ROUTES.Community, params: { segment: 'amigos' } });
      break;
    case 'profile':
      navigate(APP_ROUTES.SocialProfile, { userId: target.userId });
      break;
    case 'post':
      navigate(APP_ROUTES.SocialPost, { postId: target.postId });
      break;
    case 'challenge':
      navigate(APP_ROUTES.SocialChallenge, { challengeId: target.challengeId });
      break;
    default:
      navigate(APP_ROUTES.SocialNotifications);
  }
}

// Whether the person is already looking at what the notification is about
// (then the banner is not shown): the inbox, or the very post / challenge /
// profile.
export function isAlreadyThere(
  current: { name?: string; params?: object } | undefined,
  target: PushTarget,
): boolean {
  if (!current?.name) {
    return false;
  }
  const params = (current.params ?? {}) as Record<string, unknown>;
  switch (target.kind) {
    case 'inbox':
      return current.name === APP_ROUTES.SocialNotifications;
    case 'post':
      return current.name === APP_ROUTES.SocialPost && params.postId === target.postId;
    case 'challenge':
      return current.name === APP_ROUTES.SocialChallenge && params.challengeId === target.challengeId;
    case 'profile':
      return current.name === APP_ROUTES.SocialProfile && params.userId === target.userId;
    case 'coachStudent':
      return current.name === APP_ROUTES.CoachStudent && params.linkId === target.linkId;
    case 'coachStudents':
      return current.name === APP_ROUTES.CoachStudents;
    case 'routine':
      return current.name === APP_ROUTES.WorkoutDetail && params.workoutId === target.workoutId;
    case 'nutrition':
      return current.name === APP_ROUTES.NutritionPlan;
    case 'planReview':
      return current.name === APP_ROUTES.PlanReview && (params.weekIndex ?? null) === target.weekIndex;
    case 'planReport':
      return current.name === APP_ROUTES.PlanReport && (params.planId ?? null) === target.planId;
    case 'plan':
      // The adjustment must be seen, not only the screen: a banner is shown.
      return false;
    case 'workouts':
    case 'coachLinkEnded':
      return false;
    default:
      // The inbox shows every new notification as it arrives.
      return current.name === APP_ROUTES.SocialNotifications;
  }
}
