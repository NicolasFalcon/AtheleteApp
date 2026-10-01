import {
  awardGamificationEvent,
  awardGamificationEventBestEffort,
  normalizeAwardResult,
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
        awarded: true,
        event_id: 'event-1',
        points_added: 50,
        total_points: 275,
        new_badges: ['first_workout'],
        reason: null,
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
      awarded: true,
      alreadyProcessed: false,
      reason: null,
      pointsAwarded: 50,
      badgesUnlocked: ['first_workout'],
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

  test('envía una referencia vacía en eventos sin referencia', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {awarded: true, points_added: 0, new_badges: ['quiz_master']},
      error: null,
    });

    mockedGetSupabaseClient.mockReturnValue({rpc} as any);

    await awardGamificationEvent({
      eventType: 'quiz_master_unlocked',
      badgeIds: ['quiz_master'],
    });

    expect(rpc).toHaveBeenCalledWith(
      'award_gamification_event',
      expect.objectContaining({
        _event_type: 'quiz_master_unlocked',
        _reference_id: '',
      }),
    );
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

describe('normalizeAwardResult', () => {
  test('marca los duplicados sin puntos ni badges', () => {
    const result = normalizeAwardResult({
      awarded: false,
      points_added: 0,
      total_points: 310,
      new_badges: [],
      reason: 'duplicate',
    });

    expect(result.awarded).toBe(false);
    expect(result.alreadyProcessed).toBe(true);
    expect(result.pointsAwarded).toBe(0);
    expect(result.totalPoints).toBe(310);
  });

  test('tolera respuestas vacías o mal formadas', () => {
    expect(normalizeAwardResult(null)).toEqual({
      awarded: false,
      alreadyProcessed: false,
      reason: null,
      pointsAwarded: 0,
      badgesUnlocked: [],
      totalPoints: 0,
    });
    expect(
      normalizeAwardResult({new_badges: ['first_pr', 3, null]}).badgesUnlocked,
    ).toEqual(['first_pr']);
  });
});
