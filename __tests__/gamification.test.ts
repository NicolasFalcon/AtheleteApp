import {
  awardGamificationEvent,
  awardGamificationEventBestEffort,
} from '@app/services/supabase/gamification';
import {getSupabaseClient} from '@app/services/supabase/client';

jest.mock('@app/services/supabase/client', () => ({
  getSupabaseClient: jest.fn(),
}));

const mockedGetSupabaseClient = jest.mocked(getSupabaseClient);

describe('awardGamificationEvent', () => {
  test('envía el contrato remoto y normaliza la respuesta', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        already_processed: false,
        points_awarded: 50,
        badges_unlocked: ['first_workout'],
        missing_badges: [],
        total_points: 275,
      },
      error: null,
    });

    mockedGetSupabaseClient.mockReturnValue({rpc} as any);

    await expect(
      awardGamificationEvent({
        eventType: 'workout_completed',
        referenceId: 'session-123',
        points: 50,
        badgeIds: ['first_workout'],
        metadata: {workoutId: 'workout-456'},
      }),
    ).resolves.toEqual({
      alreadyProcessed: false,
      pointsAwarded: 50,
      badgesUnlocked: ['first_workout'],
      missingBadges: [],
      totalPoints: 275,
    });

    expect(rpc).toHaveBeenCalledWith('award_gamification_event', {
      _event_type: 'workout_completed',
      _reference_id: 'session-123',
      _points: 50,
      _badge_ids: ['first_workout'],
      _metadata: {workoutId: 'workout-456'},
    });
  });

  test('propaga errores de la RPC sin hacer escrituras alternativas', async () => {
    const rpcError = new Error('RPC no disponible');
    const rpc = jest.fn().mockResolvedValue({data: null, error: rpcError});

    mockedGetSupabaseClient.mockReturnValue({rpc} as any);

    await expect(
      awardGamificationEvent({
        eventType: 'nutrition_logged',
        referenceId: '2026-06-11',
      }),
    ).rejects.toBe(rpcError);

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  test('degrada la recompensa secundaria sin rechazar la escritura principal', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: new Error('RPC no disponible'),
    });

    mockedGetSupabaseClient.mockReturnValue({rpc} as any);

    await expect(
      awardGamificationEventBestEffort({
        source: 'nutrition-log-test',
        eventType: 'nutrition_logged',
        referenceId: '2026-06-13',
        points: 10,
      }),
    ).resolves.toBeNull();

    expect(warn).toHaveBeenCalledWith(
      '[gamification:nutrition-log-test] No se pudo otorgar la recompensa.',
      expect.any(Error),
    );
    warn.mockRestore();
  });
});
