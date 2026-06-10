import {getSupabaseClient} from '@app/services/supabase/client';
import type {BadgeId} from '@app/shared';

export type GamificationEventType =
  | 'quiz_completed'
  | 'core33_day_completed'
  | 'core33_completed'
  | 'personal_record_created'
  | 'nutrition_plan_activated'
  | 'nutrition_logged'
  | 'workout_completed'
  | 'custom_workout_created';

export type GamificationAwardResult = {
  alreadyProcessed: boolean;
  pointsAwarded: number;
  badgesUnlocked: BadgeId[];
  missingBadges: string[];
  totalPoints: number;
};

type AwardGamificationEventParams = {
  userId: string;
  eventKey: string;
  eventType: GamificationEventType;
  points?: number;
  badgeIds?: BadgeId[];
  metadata?: Record<string, unknown>;
};

function getClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  return client;
}

function normalizeResult(data: any): GamificationAwardResult {
  return {
    alreadyProcessed: Boolean(data?.alreadyProcessed),
    pointsAwarded:
      typeof data?.pointsAwarded === 'number' ? data.pointsAwarded : 0,
    badgesUnlocked: Array.isArray(data?.badgesUnlocked)
      ? data.badgesUnlocked.filter(
          (badgeId: unknown): badgeId is BadgeId => typeof badgeId === 'string',
        )
      : [],
    missingBadges: Array.isArray(data?.missingBadges)
      ? data.missingBadges.filter(
          (badgeId: unknown): badgeId is string => typeof badgeId === 'string',
        )
      : [],
    totalPoints: typeof data?.totalPoints === 'number' ? data.totalPoints : 0,
  };
}

export async function awardGamificationEvent(
  params: AwardGamificationEventParams,
): Promise<GamificationAwardResult> {
  const client = getClient();
  const {data, error} = await (client as any).rpc('award_gamification_event', {
    p_user_id: params.userId,
    p_event_key: params.eventKey,
    p_event_type: params.eventType,
    p_points: params.points || 0,
    p_badge_ids: params.badgeIds || [],
    p_metadata: params.metadata || {},
  });

  if (error) {
    throw error;
  }

  return normalizeResult(data);
}
