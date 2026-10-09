import type { FixturePerson } from '@app/dev/socialFixtures';
import type {
  ChallengeHead,
  ChallengeMine,
} from '@app/features/social/challengeTypes';
import type { ModerationActionRow, ModerationQueueRow } from '@app/features/social/moderationModel';
import type { SocialNotification } from '@app/features/social/notificationModel';
import type { SocialProfileRow } from '@app/features/social/socialTypes';

// Sample challenges, notifications and moderation data of Comunidad · tanda C.
// Row types are the ones of `types/supabase.ts`; nothing is read from or
// written to the backend.

const HOUR = 3_600_000;
const DAY = 86_400_000;

export type FixtureParticipant = {
  who: string; // key of `people` or 'me'
  progress: number;
  status: ChallengeMine['status'];
  completedAgo?: number;
};

export type FixtureChallenge = {
  head: ChallengeHead;
  mine: ChallengeMine | null;
  participants: FixtureParticipant[];
  activity: { who: string; text: string; ago: number }[];
  inviter: string | null;
  manualToday: number;
  week: (number | null)[] | null;
  participantsTotal: number | null;
};

export type ChallengeFixtureSet = {
  challenges: FixtureChallenge[];
  notifications: SocialNotification[];
  queue: ModerationQueueRow[];
  history: ModerationActionRow[];
};

export function buildChallengeFixtures(
  now: Date,
  people: Record<string, FixturePerson>,
  me: SocialProfileRow,
  options: { expired?: boolean; waiting?: boolean; official?: 'notJoined' } = {},
): ChallengeFixtureSet {
  const t = now.getTime();
  const iso = (ago: number) => new Date(t - ago).toISOString();
  const ahead = (ms: number) => new Date(t + ms).toISOString();
  const profile = (key: string): SocialProfileRow => (key === 'me' ? me : people[key].profile);

  const official: FixtureChallenge = {
    head: {
      id: 'fx-ch-official', kind: 'official', metric: 'exercise_reps', status: 'active',
      title: '100 dominadas', goal: 100, duration_days: 7,
      starts_at: iso(4 * DAY), ends_at: ahead(3 * DAY), invite_expires_at: null,
      points: 150, badge_id: 'week_traction', allow_manual: true, creator_id: null,
    },
    mine:
      options.official === 'notJoined'
        ? null
        : { status: 'active', progress: 74, invited_by: null, final_rank_among_friends: null, celebrated_at: null },
    participants: [
      { who: 'carlos', progress: 81, status: 'active' },
      { who: 'me', progress: 74, status: 'active' },
      { who: 'sofia', progress: 52, status: 'active' },
    ],
    activity: [],
    inviter: null,
    manualToday: 0,
    week: [18, 0, 22, 16, 18, null, null],
    participantsTotal: 18420,
  };

  const friendsEnt: FixtureChallenge = {
    head: {
      id: 'fx-ch-ent', kind: 'friends', metric: 'workouts', status: 'active',
      title: '4 entrenamientos esta semana', goal: 4, duration_days: 7,
      starts_at: iso(5 * DAY), ends_at: ahead(2 * DAY), invite_expires_at: null,
      points: 0, badge_id: null, allow_manual: false, creator_id: people.carlos.profile.id,
    },
    mine: { status: 'active', progress: 3, invited_by: people.carlos.profile.id, final_rank_among_friends: null, celebrated_at: null },
    participants: [
      { who: 'carlos', progress: 4, status: 'completed', completedAgo: 3 * HOUR },
      { who: 'me', progress: 3, status: 'active' },
      { who: 'andrea', progress: 2, status: 'active' },
    ],
    activity: [
      { who: 'carlos', text: 'Completó su 4.º entreno', ago: 3 * HOUR },
      { who: 'andrea', text: 'Pierna completa', ago: 2 * HOUR },
      { who: 'me', text: 'Total Body Dumbbell', ago: 26 * HOUR },
    ],
    inviter: 'carlos', manualToday: 0, week: null, participantsTotal: null,
  };

  const invitation: FixtureChallenge = {
    head: {
      id: 'fx-ch-mov', kind: 'friends', metric: 'mobility_minutes', status: 'pending',
      title: '60 min de movilidad esta semana', goal: 60, duration_days: 7,
      starts_at: null, ends_at: null, invite_expires_at: ahead(5 * DAY),
      points: 0, badge_id: null, allow_manual: false, creator_id: people.andrea.profile.id,
    },
    mine: { status: 'invited', progress: 0, invited_by: people.andrea.profile.id, final_rank_among_friends: null, celebrated_at: null },
    participants: [
      { who: 'andrea', progress: 15, status: 'active' },
      { who: 'lucia', progress: 20, status: 'active' },
      { who: 'me', progress: 0, status: 'invited' },
    ],
    activity: [
      { who: 'lucia', text: 'Movilidad de cadera · 20 min', ago: 5 * HOUR },
      { who: 'andrea', text: 'Movilidad esencial · 15 min', ago: 6 * HOUR },
    ],
    inviter: 'andrea', manualToday: 0, week: null, participantsTotal: null,
  };

  const done: FixtureChallenge = {
    head: {
      id: 'fx-ch-done', kind: 'friends', metric: 'strength_sessions', status: 'completed',
      title: '3 sesiones de fuerza esta semana', goal: 3, duration_days: 7,
      starts_at: iso(9 * DAY), ends_at: iso(2 * DAY), invite_expires_at: null,
      points: 0, badge_id: null, allow_manual: false, creator_id: me.id,
    },
    mine: { status: 'completed', progress: 3, invited_by: null, final_rank_among_friends: 1, celebrated_at: iso(2 * DAY) },
    participants: [
      { who: 'me', progress: 3, status: 'completed', completedAgo: 3 * DAY },
      { who: 'mateo', progress: 2, status: 'active' },
    ],
    activity: [],
    inviter: null, manualToday: 0, week: null, participantsTotal: null,
  };

  const expired: FixtureChallenge = {
    head: {
      id: 'fx-ch-exp', kind: 'friends', metric: 'minutes_trained', status: 'expired',
      title: '150 min entrenados en 2 semanas', goal: 150, duration_days: 14,
      starts_at: null, ends_at: null, invite_expires_at: iso(1 * DAY),
      points: 0, badge_id: null, allow_manual: false, creator_id: me.id,
    },
    mine: { status: 'expired', progress: 0, invited_by: null, final_rank_among_friends: null, celebrated_at: null },
    participants: [
      { who: 'me', progress: 0, status: 'expired' },
      { who: 'sofia', progress: 0, status: 'expired' },
    ],
    activity: [],
    inviter: null, manualToday: 0, week: null, participantsTotal: null,
  };

  // A challenge the user created that nobody has accepted yet.
  const waiting: FixtureChallenge = {
    head: {
      id: 'fx-ch-wait', kind: 'friends', metric: 'workouts', status: 'pending',
      title: '5 entrenamientos en 2 semanas', goal: 5, duration_days: 14,
      starts_at: null, ends_at: null, invite_expires_at: ahead(6 * DAY),
      points: 0, badge_id: null, allow_manual: false, creator_id: me.id,
    },
    mine: { status: 'active', progress: 0, invited_by: null, final_rank_among_friends: null, celebrated_at: null },
    participants: [
      { who: 'me', progress: 0, status: 'active' },
      { who: 'carlos', progress: 0, status: 'invited' },
      { who: 'sofia', progress: 0, status: 'invited' },
    ],
    activity: [],
    inviter: null, manualToday: 0, week: null, participantsTotal: null,
  };

  const challenges = [
    official, friendsEnt, invitation, done,
    ...(options.expired ? [expired] : []),
    ...(options.waiting ? [waiting] : []),
  ];

  // ── Notifications ──
  const note = (
    id: string,
    type: SocialNotification['type'],
    ago: number,
    who: string | null,
    extra: Partial<SocialNotification> = {},
  ): SocialNotification => ({
    id, type, actor_id: who ? profile(who).id : null, post_id: null, comment_id: null,
    challenge_id: null, request_id: null, read_at: null, created_at: iso(ago),
    actor: who ? profile(who) : null, ...extra,
  });
  const notifications: SocialNotification[] = [
    note('fx-n1', 'friend_request', 40 * 60_000, 'diego', { request_id: 'fx-req-diego' }),
    note('fx-n2', 'post_like', 90 * 60_000, 'carlos', { post_id: 'fx-p7' }),
    note('fx-n3', 'post_like', 3 * HOUR, 'andrea', { post_id: 'fx-p7' }),
    note('fx-n4', 'post_like', 5 * HOUR, 'mateo', { post_id: 'fx-p7' }),
    note('fx-n5', 'post_comment', 4 * HOUR, 'carlos', { post_id: 'fx-p7', comment_id: 'fx-c8' }),
    note('fx-n6', 'challenge_invite', 6 * HOUR, 'andrea', { challenge_id: 'fx-ch-mov' }),
    note('fx-n7', 'friend_request', 26 * HOUR, 'valeria', { request_id: 'fx-req-valeria', read_at: iso(20 * HOUR) }),
    note('fx-n8', 'challenge_started', 27 * HOUR, 'carlos', { challenge_id: 'fx-ch-ent', read_at: iso(20 * HOUR) }),
    note('fx-n9', 'friend_accepted', 2 * DAY, 'lucia', { read_at: iso(DAY) }),
    note('fx-n10', 'content_removed', 3 * DAY, null, { read_at: iso(2 * DAY) }),
  ];

  // ── Moderation ──
  const queueRow = (
    id: string, type: 'post' | 'comment' | 'user', author: string, body: string | null,
    reasons: string[], reports: number, firstAgo: number, extra: Partial<ModerationQueueRow> = {},
  ): ModerationQueueRow => ({
    target_type: type, target_id: id, author_id: profile(author).id,
    author_username: profile(author).username, author_prior_removals: 0, body,
    first_reported_at: iso(firstAgo), last_reported_at: iso(firstAgo / 2),
    open_reports: reports, photo_path: null, post_id: type === 'post' ? id : null,
    post_type: type === 'post' ? 'workout' : null, reasons, hidden_at: null, removed_at: null, ...extra,
  });
  const queue: ModerationQueueRow[] = [
    queueRow('fx-q-post', 'post', 'raul', 'Compra seguidores aquí: enlace en mi perfil.', ['spam', 'spam', 'other'], 3, 5 * HOUR, { hidden_at: iso(2 * HOUR), author_prior_removals: 1 }),
    queueRow('fx-q-comment', 'comment', 'hugo', 'Eres un inútil, deja de publicar.', ['harassment'], 1, 9 * HOUR),
    queueRow('fx-q-violence', 'post', 'elena', 'Entreno de hoy. Sin filtro.', ['violence', 'other'], 2, 20 * HOUR),
    queueRow('fx-q-user', 'user', 'irene', null, ['nudity'], 1, 30 * HOUR),
  ];
  const history: ModerationActionRow[] = [
    { id: 'fx-h1', moderator_id: 'fx-mod', target_type: 'post', target_id: 'fx-old-a', action: 'remove', note: 'Spam repetido', created_at: iso(DAY) },
    { id: 'fx-h2', moderator_id: 'fx-mod', target_type: 'comment', target_id: 'fx-old-b', action: 'restore', note: 'Falso positivo', created_at: iso(2 * DAY) },
    { id: 'fx-h3', moderator_id: 'fx-mod', target_type: 'user', target_id: 'fx-old-c', action: 'dismiss', note: null, created_at: iso(4 * DAY) },
  ];

  return { challenges, notifications, queue, history };
}
