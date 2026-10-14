import { homeChallengeCard } from '../src/features/home/homeChallengeSection';
import {
  buildMyChallenges,
  coverPaths,
  inviterIds,
  parseMyChallenges,
} from '../src/features/social/challengeMappers';
import {
  bigFigure,
  completionCondition,
  composeOfficialBlocks,
  formatChallengeValue,
  isFriendMetric,
  officialLeftLine,
  progressPct,
  rewardLine,
  startDateParts,
} from '../src/features/social/challengeModel';
import { parseAttachment } from '../src/features/social/feedMappers';
import { fitPolyline } from '../src/features/social/routePostGeometry';
import type { RouteAttachment } from '../src/features/social/postTypes';

const row = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  kind: 'official',
  metric: 'exercise_reps',
  status: 'active',
  title: '100 dominadas',
  goal: 100,
  duration_days: 7,
  starts_at: '2026-10-06T00:00:00Z',
  ends_at: '2026-10-16T00:00:00Z',
  points: 150,
  badge_id: 'official_12_strength',
  allow_manual: true,
  creator_id: null,
  ...extra,
});

describe('official challenges · get_my_challenges', () => {
  const data = {
    active: [],
    invitations: [],
    recently_completed: [],
    official: [
      row('reps', {
        my_status: 'joined',
        my_progress: 74,
        unit: 'reps',
        exercise_name: 'Dominadas',
        cover_path: 'covers/reps.jpg',
        cover_url: 'https://ignored.example/never-used.jpg',
        badge: { id: 'b1', title: 'Semana de tracción', icon: 'chevrons-up' },
        participants_count: 18000,
        people: {
          total: 18420,
          preview: [
            { user_id: 'me', name: 'Nico', avatar_key: 'a1', profile_photo_url: '', is_me: true },
            { user_id: 'f1', name: 'Carlos Pérez', avatar_key: 'a2', profile_photo_url: 'f1/p.jpg', is_me: false },
          ],
        },
        leader: { user_id: 'f1', name: 'Carlos Pérez', progress: 81, is_me: false },
      }),
      row('km', { metric: 'distance_km', title: '50 km en octubre', goal: 50, my_status: null, my_progress: 0, unit: 'km', sport: null, cover_path: 'covers/km.jpg' }),
    ],
    official_upcoming: [
      row('mov', { metric: 'mobility_minutes', status: 'scheduled', title: '7 días de movilidad', goal: 70, my_status: 'joined', unit: 'min', cover_path: 'covers/reps.jpg' }),
    ],
  };

  it('reads people, leader, badge, unit and exercise name without any board call', () => {
    const parsed = parseMyChallenges(data);
    const result = buildMyChallenges(parsed, new Map());
    expect(result.officialList.map(item => item.challenge.id)).toEqual(['reps', 'km']);
    expect(result.official?.challenge.id).toBe('reps');
    const reps = result.officialList[0];
    expect(reps.mine).toMatchObject({ status: 'active', progress: 74 });
    expect(reps.participants_total).toBe(18420);
    expect(reps.people.map(person => [person.profile?.id, person.isMe])).toEqual([['me', true], ['f1', false]]);
    expect(reps.leader).toMatchObject({ progress: 81, isMe: false });
    expect(reps.meta).toMatchObject({
      unit: 'reps',
      exerciseName: 'Dominadas',
      badge: { id: 'b1', title: 'Semana de tracción', icon: 'chevrons-up' },
      coverPath: 'covers/reps.jpg',
      coverUrl: null,
    });
    expect(result.officialList[1].mine).toBeNull();
    expect(result.officialList[1].challenge.metric).toBe('distance_km');
  });

  it('keeps the upcoming ones, joined with my_status "joined", even with an unknown status', () => {
    const result = buildMyChallenges(parseMyChallenges(data), new Map());
    expect(result.official_upcoming).toHaveLength(1);
    expect(result.official_upcoming[0].challenge).toMatchObject({ kind: 'official', status: 'pending' });
    expect(result.official_upcoming[0].mine?.status).toBe('active');
  });

  it('signs each cover path once and attaches the signed url', () => {
    const parsed = parseMyChallenges(data);
    expect(coverPaths(parsed).sort()).toEqual(['covers/km.jpg', 'covers/reps.jpg']);
    const result = buildMyChallenges(parsed, new Map(), new Map([['covers/reps.jpg', 'https://signed/reps']]));
    expect(result.officialList[0].meta?.coverUrl).toBe('https://signed/reps');
    expect(result.officialList[1].meta?.coverUrl).toBeNull();
    expect(result.official_upcoming[0].meta?.coverUrl).toBe('https://signed/reps');
  });

  it('survives rows with nothing extra (an older server)', () => {
    const result = buildMyChallenges(parseMyChallenges({ official: [row('o1')] }), new Map());
    expect(result.officialList[0].meta).toMatchObject({ unit: null, badge: null, coverPath: null });
    expect(result.official_upcoming).toEqual([]);
    expect(inviterIds(parseMyChallenges(null))).toEqual([]);
  });

  it('builds the Inicio card from the list: leader, cover, badge and figures', () => {
    const result = buildMyChallenges(parseMyChallenges(data), new Map(), new Map([['covers/reps.jpg', 'https://signed/reps']]));
    const card = homeChallengeCard(result, new Date('2026-10-13T12:00:00Z'));
    expect(card).toMatchObject({
      state: 'joined',
      progressText: '74',
      goalText: '100',
      unit: 'dominadas',
      coverUrl: 'https://signed/reps',
      participants: 18420,
    });
    expect(card?.friend).toMatchObject({ name: 'Carlos', progress: 81, progressText: '81' });
    expect(card?.reward).toMatchObject({ points: 150, badgeName: 'Semana de tracción', badgeIcon: 'chevrons-up' });
    expect(card?.people).toHaveLength(2);
  });

  it('does not show me as the friend who leads', () => {
    const mine = parseMyChallenges({
      official: [row('reps', { my_status: 'joined', my_progress: 90, leader: { user_id: 'me', name: 'Nico', progress: 90, is_me: true } })],
    });
    const card = homeChallengeCard(buildMyChallenges(mine, new Map()), new Date('2026-10-13T12:00:00Z'));
    expect(card?.friend).toBeNull();
  });
});

describe('official challenges · progress of km and reps', () => {
  it('shows km with up to two decimals and reps as whole numbers', () => {
    expect(formatChallengeValue('distance_km', 12.5)).toBe('12,5');
    expect(formatChallengeValue('distance_km', 12.456)).toBe('12,46');
    expect(formatChallengeValue('distance_km', 50)).toBe('50');
    expect(formatChallengeValue('exercise_reps', 74)).toBe('74');
    expect(formatChallengeValue('exercise_reps', 73.6)).toBe('74');
  });

  it('says how much is left, in km for distance', () => {
    expect(officialLeftLine(37.5, 50, 'distance_km')).toBe('Te faltan 12,5 km para completar el reto.');
    expect(officialLeftLine(74, 100, 'exercise_reps')).toBe('Te faltan 26 para completar el reto.');
    expect(officialLeftLine(100, 100, 'exercise_reps')).toBe('Completado');
    expect(officialLeftLine(50.01, 50, 'distance_km')).toBe('Completado');
  });

  it('computes the bar and caps it', () => {
    expect(progressPct(12.5, 50)).toBe(25);
    expect(progressPct(74, 100)).toBe(74);
    expect(progressPct(120, 100)).toBe(100);
    expect(progressPct(5, 0)).toBe(0);
  });

  it('only the official challenge counts km and reps', () => {
    expect(isFriendMetric('distance_km')).toBe(false);
    expect(isFriendMetric('exercise_reps')).toBe(false);
    expect(isFriendMetric('workouts')).toBe(true);
  });

  it('writes the big figure, the condition and the reward of each kind', () => {
    expect(bigFigure({ metric: 'exercise_reps', goal: 100, title: '100 dominadas', exerciseName: 'Dominadas' })).toEqual({ big: '100', unit: 'dominadas' });
    expect(bigFigure({ metric: 'distance_km', goal: 50, title: '50 km', exerciseName: null })).toEqual({ big: '50', unit: 'km' });
    expect(bigFigure({ metric: 'strength_sessions', goal: 12, title: '', exerciseName: null })).toEqual({ big: '12', unit: 'sesiones' });
    expect(completionCondition({ metric: 'exercise_reps', goal: 100, exerciseName: 'Dominadas' })).toBe('Al completar las 100 dominadas');
    expect(completionCondition({ metric: 'distance_km', goal: 50, exerciseName: null })).toBe('Al sumar 50 km con Ruta');
    expect(completionCondition({ metric: 'distance_km', goal: 50, exerciseName: null, sport: 'running' })).toBe('Al sumar 50 km corriendo');
    expect(completionCondition({ metric: 'strength_sessions', goal: 12, exerciseName: null })).toBe('Al completar las 12 sesiones de fuerza');
    expect(rewardLine(150, 'Semana de tracción')).toBe('+150 puntos · Badge Semana de tracción');
    expect(rewardLine(null, 'X')).toBe('Badge X');
    expect(rewardLine(0, null)).toBeNull();
  });
});

describe('official challenges · the list view', () => {
  it('alternates a wide photo and two columns', () => {
    const blocks = composeOfficialBlocks(['a', 'b', 'c', 'd', 'e']);
    expect(blocks.map(block => block.kind)).toEqual(['wide', 'pair', 'wide', 'pair']);
    expect(blocks[1]).toEqual({ kind: 'pair', item: 'b', other: 'c' });
    expect(composeOfficialBlocks(['a', 'b'])[1]).toEqual({ kind: 'pair', item: 'b', other: null });
    expect(composeOfficialBlocks([])).toEqual([]);
  });

  it('reads the start date of the upcoming ones', () => {
    expect(startDateParts(new Date(2026, 9, 12, 12).toISOString())).toEqual({ mon: 'OCT', day: '12' });
    expect(startDateParts(null)).toBeNull();
    expect(startDateParts('nope')).toBeNull();
  });
});

describe('route post · attachment from the server', () => {
  it('reads the snapshot of a running post', () => {
    const attachment = parseAttachment(
      'route',
      {
        sport: 'running',
        distance_km: 5.2398,
        duration_sec: 1582,
        pace_label: '5:02 /km',
        elevation_m: 31,
        planned_name: 'Parque 5K',
        new_best: { distance_key: '5k', best_sec: 1481 },
        polyline: [[-34.58, -58.42], [-34.59, -58.43], [-34.6, -58.44]],
      },
      'act-1',
    ) as RouteAttachment;
    expect(attachment).toMatchObject({
      sport: 'running',
      distance_km: 5.24,
      pace_label: '5:02 /km',
      elevation_m: 31,
      planned_name: 'Parque 5K',
      new_best: '5K · 24:41',
      activity_id: 'act-1',
    });
    expect(attachment.polyline).toHaveLength(3);
  });

  it('shows km/h for cycling and an empty polyline when it is hidden', () => {
    const attachment = parseAttachment('route', {
      sport: 'cycling',
      distance_km: 42,
      duration_sec: 5400,
      avg_speed_kmh: 27.3,
      elevation_m: null,
      new_best: null,
      polyline: [],
    }) as RouteAttachment;
    expect(attachment.pace_label).toBe('27,3 km/h');
    expect(attachment.new_best).toBeNull();
    expect(attachment.polyline).toEqual([]);
    expect(parseAttachment('route', { sport: 'rowing' })).toBeNull();
  });
});

describe('route post · fitting the trimmed polyline', () => {
  it('keeps the route inside the box with its padding', () => {
    const fitted = fitPolyline(
      [
        { lat: -34.58, lon: -58.42 },
        { lat: -34.59, lon: -58.4 },
        { lat: -34.6, lon: -58.42 },
      ],
      { width: 400, height: 520, padding: 48, bottomPadding: 120 },
    );
    expect(fitted).not.toBeNull();
    const numbers = (fitted?.d.match(/-?\d+\.\d/g) ?? []).map(Number);
    for (let i = 0; i < numbers.length; i += 2) {
      expect(numbers[i]).toBeGreaterThanOrEqual(47.9);
      expect(numbers[i]).toBeLessThanOrEqual(352.1);
      expect(numbers[i + 1]).toBeGreaterThanOrEqual(47.9);
      expect(numbers[i + 1]).toBeLessThanOrEqual(400.1);
    }
    expect(fitted?.d.startsWith('M')).toBe(true);
  });

  it('draws nothing for a route that is too short', () => {
    expect(fitPolyline([], { width: 400, height: 500, padding: 40 })).toBeNull();
    expect(fitPolyline([{ lat: 1, lon: 1 }], { width: 400, height: 500, padding: 40 })).toBeNull();
  });
});
