import { getSupabaseClient } from '@app/services/supabase/client';
import type { BadgeId } from '@app/shared';
import type { Database, Json } from '@app/types/supabase';

// Event catalogue of the backend (docs/backend/BACKEND_SUMMARY.md §6). The
// server decides points and badges from it; in `strict` mode it ignores the
// points sent by the app.
export type GamificationEventType =
  | 'workout_completed'
  | 'custom_workout_created'
  | 'personal_record_created'
  | 'nutrition_activated'
  | 'nutrition_logged'
  | 'hydration_logged'
  | 'quiz_completed'
  | 'quiz_master_unlocked'
  | 'core33_day_completed'
  | 'core33_streak_7'
  | 'core33_completed';

export type GamificationAwardResult = {
  // false when nothing was granted (duplicate, or rejected in strict mode).
  awarded: boolean;
  alreadyProcessed: boolean;
  // `duplicate`, `unknown_event_type`, `invalid_reference`, `daily_limit`…
  reason: string | null;
  pointsAwarded: number;
  badgesUnlocked: BadgeId[];
  totalPoints: number;
};

type AwardGamificationEventParams = {
  eventType: GamificationEventType;
  // Format per event in BACKEND_SUMMARY §6. Omitted for once-per-user events
  // (quiz_master_unlocked).
  referenceId?: string;
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

// RPC response: {awarded, event_id, points_added, total_points, new_badges,
// reason}.
export function normalizeAwardResult(data: any): GamificationAwardResult {
  const reason = typeof data?.reason === 'string' ? data.reason : null;
  const pointsAwarded = data?.points_added;
  const badgesUnlocked = data?.new_badges;
  const totalPoints = data?.total_points;

  return {
    awarded: data?.awarded === true,
    alreadyProcessed: reason === 'duplicate',
    reason,
    pointsAwarded: typeof pointsAwarded === 'number' ? pointsAwarded : 0,
    badgesUnlocked: Array.isArray(badgesUnlocked)
      ? badgesUnlocked.filter(
          (badgeId: unknown): badgeId is BadgeId => typeof badgeId === 'string',
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
    _reference_id: params.referenceId ?? '',
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

  return normalizeAwardResult(data);
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
