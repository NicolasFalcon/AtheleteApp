import {
  badgeName,
  challengeLabel,
  friendLeader,
  isHomeChallengeScenario,
  sampleChallengeCard,
  withFriend,
  homeChallengeCard,
  homeChallengeReward,
} from '../src/features/home/homeChallengeSection';
import type {
  BoardEntry,
  ChallengeBoard,
  ChallengeHead,
  ChallengeMine,
  ChallengeSummary,
  MyChallenges,
} from '../src/features/social/challengeTypes';

const NOW = new Date('2026-10-09T12:00:00Z');

const head = (patch: Partial<ChallengeHead> = {}): ChallengeHead => ({
  id: 'c1',
  title: '100 dominadas',
  goal: 100,
  duration_days: 7,
  starts_at: '2026-10-06T00:00:00Z',
  ends_at: '2026-10-12T12:00:00Z',
  invite_expires_at: null,
  points: 150,
  badge_id: null,
  allow_manual: true,
  creator_id: null,
  kind: 'official',
  metric: 'exercise_reps',
  status: 'active',
  ...patch,
});

const mine = (patch: Partial<ChallengeMine> = {}): ChallengeMine => ({
  status: 'active',
  progress: 74,
  invited_by: null,
  final_rank_among_friends: null,
  celebrated_at: null,
  ...patch,
});

const summary = (
  challenge: ChallengeHead,
  mineRow: ChallengeMine | null,
  participants: number | null = 18420,
): ChallengeSummary => ({
  challenge,
  mine: mineRow,
  people: [],
  inviter: null,
  participants_total: participants,
  leader: null,
});

const data = (official: ChallengeSummary | null): MyChallenges => ({
  active: [],
  invitations: [],
  recently_completed: [],
  official,
});

describe('homeChallengeCard · state of the section', () => {
  it('has no section without data or without an official challenge', () => {
    expect(homeChallengeCard(null, NOW)).toBeNull();
    expect(homeChallengeCard(data(null), NOW)).toBeNull();
  });

  it('is an invitation when I have not joined the featured official challenge', () => {
    const card = homeChallengeCard(data(summary(head(), null)), NOW);
    expect(card?.state).toBe('invite');
    expect(card?.progress).toBe(0);
    expect(card?.goal).toBe(100);
    expect(card?.participants).toBe(18420);
    expect(card?.line).toBe('');
  });

  it('shows my progress when I am in it', () => {
    const card = homeChallengeCard(data(summary(head(), mine())), NOW);
    expect(card?.state).toBe('joined');
    expect(card?.progress).toBe(74);
    expect(card?.pct).toBe(74);
    expect(card?.line).toBe('Te faltan 26 para completar el reto.');
    expect(card?.daysLabel).toBe('3 días restantes');
  });

  it('treats left or declined participation as not joined', () => {
    expect(
      homeChallengeCard(data(summary(head(), mine({ status: 'left' }))), NOW)?.state,
    ).toBe('invite');
    expect(
      homeChallengeCard(data(summary(head(), mine({ status: 'declined' }))), NOW)?.state,
    ).toBe('invite');
  });

  it('an already completed challenge reads as the invitation again (retoOff)', () => {
    const byStatus = homeChallengeCard(
      data(summary(head(), mine({ status: 'completed', progress: 100 }))),
      NOW,
    );
    const byProgress = homeChallengeCard(data(summary(head(), mine({ progress: 140 }))), NOW);
    expect(byStatus?.state).toBe('invite');
    expect(byProgress?.state).toBe('invite');
    expect(byProgress?.progress).toBe(0);
  });

  it('ignores a non-active challenge', () => {
    expect(
      homeChallengeCard(data(summary(head({ status: 'expired' }), mine())), NOW),
    ).toBeNull();
  });
});

describe('homeChallengeCard · reward line', () => {
  it('hides the reward when points and badge are empty', () => {
    expect(homeChallengeReward({ points: 0, badge_id: null })).toBeNull();
    expect(homeChallengeReward({ points: null, badge_id: '' })).toBeNull();
    const card = homeChallengeCard(
      data(summary(head({ points: 0, badge_id: null }), null)),
      NOW,
    );
    expect(card?.reward).toBeNull();
  });

  it('shows only what exists', () => {
    expect(homeChallengeReward({ points: 150, badge_id: null })).toEqual({
      points: 150,
      badgeId: null,
      badgeName: null,
    });
    const withBadge = homeChallengeReward({ points: 0, badge_id: 'unknown-badge' });
    expect(withBadge?.points).toBeNull();
    expect(withBadge?.badgeId).toBe('unknown-badge');
    expect(withBadge?.badgeName).toBeNull();
  });

  it('has no badge name for a missing id', () => {
    expect(badgeName(null)).toBeNull();
  });
});

describe('challengeLabel', () => {
  it('drops the goal the big figure already shows', () => {
    expect(challengeLabel('100 dominadas', 100)).toBe('dominadas');
    expect(challengeLabel('12 sesiones de fuerza', 12)).toBe('sesiones de fuerza');
    expect(challengeLabel('50 km en octubre', 50)).toBe('km en octubre');
  });

  it('keeps titles that do not start with the goal', () => {
    expect(challengeLabel('Semana de tracción', 100)).toBe('Semana de tracción');
    expect(challengeLabel('1000 pasos', 100)).toBe('1000 pasos');
    expect(challengeLabel('100', 100)).toBe('100');
  });
});

const entry = (patch: Partial<BoardEntry>): BoardEntry => ({
  user_id: 'u',
  profile: null,
  progress: 0,
  status: 'active',
  completed_at: null,
  isMe: false,
  relationship: 'friends',
  ...patch,
});

const board = (entries: BoardEntry[]): ChallengeBoard => ({
  challenge: head(),
  mine: mine(),
  participants_total: 10,
  board: entries,
  week: null,
  manualToday: 0,
  activity: [],
  inviter: null,
});

describe('friendLeader · "acaba de llegar a N"', () => {
  it('is the friend (not me) furthest along', () => {
    const friend = friendLeader(
      board([
        entry({ isMe: true, progress: 90 }),
        entry({ user_id: 'a', progress: 40 }),
        entry({ user_id: 'b', progress: 81 }),
      ]),
    );
    expect(friend?.progress).toBe(81);
  });

  it('is null without a board or without friends with progress', () => {
    expect(friendLeader(null)).toBeNull();
    expect(friendLeader(board([entry({ isMe: true, progress: 5 })]))).toBeNull();
    expect(friendLeader(board([entry({ progress: 0 })]))).toBeNull();
  });

  it('only joined cards carry the friend', () => {
    const joined = homeChallengeCard(data(summary(head(), mine())), NOW);
    const invite = homeChallengeCard(data(summary(head(), null)), NOW);
    const friend = { name: 'Carlos', progress: 81, profile: null };
    expect(joined && withFriend(joined, friend).friend).toEqual(friend);
    expect(invite && withFriend(invite, friend).friend).toBeNull();
  });
});

describe('dev samples (same as the reference)', () => {
  it('has the three scenarios', () => {
    expect(isHomeChallengeScenario('challengeInvite')).toBe(true);
    expect(isHomeChallengeScenario('challengeJoined')).toBe(true);
    expect(isHomeChallengeScenario('challengeCompleted')).toBe(true);
    expect(isHomeChallengeScenario('other')).toBe(false);
    expect(isHomeChallengeScenario(null)).toBe(false);
  });

  it('joined = 74 / 100 with Carlos at 81; invite and completed = the goal without progress', () => {
    const joined = sampleChallengeCard('challengeJoined');
    expect(joined).toMatchObject({ state: 'joined', progress: 74, label: 'dominadas' });
    expect(joined.friend).toMatchObject({ name: 'Carlos', progress: 81 });
    for (const scenario of ['challengeInvite', 'challengeCompleted'] as const) {
      const card = sampleChallengeCard(scenario);
      expect(card.state).toBe('invite');
      expect(card.progress).toBe(0);
      expect(card.participants).toBe(18420);
      expect(card.reward).toMatchObject({ points: 150, badgeName: 'Semana de tracción' });
    }
  });
});
