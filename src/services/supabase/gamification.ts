import { getSupabaseClient } from '@app/services/supabase/client';
import type { BadgeId } from '@app/shared';
import type { Database, Json } from '@app/types/supabase';

export type GamificationEventType =
  | 'quiz_completed'
  | 'core33_day_completed'
  | 'core33_completed'
  | 'personal_record_created'
  | 'nutrition_activated'
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
  eventType: GamificationEventType;
  referenceId: string;
  points?: number;
  badgeIds?: BadgeId[];
  metadata?: Json;
};

type BestEffortGamificationParams = AwardGamificationEventParams & {
  source: string;
};

type AwardGamificationEventArgs =
  Database['public']['Functions']['award_gamification_event']['Args'];

function getClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  return client;
}

function normalizeResult(data: any): GamificationAwardResult {
  const alreadyProcessed =
    data?.already_processed ?? data?.alreadyProcessed ?? false;
  const pointsAwarded = data?.points_awarded ?? data?.pointsAwarded ?? 0;
  const badgesUnlocked = data?.badges_unlocked ?? data?.badgesUnlocked ?? [];
  const missingBadges = data?.missing_badges ?? data?.missingBadges ?? [];
  const totalPoints = data?.total_points ?? data?.totalPoints ?? 0;

  return {
    alreadyProcessed: Boolean(alreadyProcessed),
    pointsAwarded: typeof pointsAwarded === 'number' ? pointsAwarded : 0,
    badgesUnlocked: Array.isArray(badgesUnlocked)
      ? badgesUnlocked.filter(
          (badgeId: unknown): badgeId is BadgeId => typeof badgeId === 'string',
        )
      : [],
    missingBadges: Array.isArray(missingBadges)
      ? missingBadges.filter(
          (badgeId: unknown): badgeId is string => typeof badgeId === 'string',
        )
      : [],
    totalPoints: typeof totalPoints === 'number' ? totalPoints : 0,
  };
}

export async function awardGamificationEvent(
  params: AwardGamificationEventParams,
): Promise<GamificationAwardResult> {
  const client = getClient();
  const args: AwardGamificationEventArgs = {
    _event_type: params.eventType,
    _reference_id: params.referenceId,
    _points: params.points ?? 0,
    _badge_ids: params.badgeIds ?? [],
    _metadata: params.metadata ?? {},
  };
  const { data, error } = await (client.rpc as any)(
    'award_gamification_event',
    args,
  );

  if (error) {
    throw error;
  }

  return normalizeResult(data);
}

export async function awardGamificationEventBestEffort(
  params: BestEffortGamificationParams,
): Promise<GamificationAwardResult | null> {
  const { source, ...event } = params;

  try {
    return await awardGamificationEvent(event);
  } catch (error) {
    console.warn(
      `[gamification:${source}] No se pudo otorgar la recompensa.`,
      error,
    );
    return null;
  }
}
