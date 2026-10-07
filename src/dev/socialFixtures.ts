import {
  buildChallengeFixtures,
  type ChallengeFixtureSet,
} from '@app/dev/socialChallengeFixtures';
import { buildPostFixtures } from '@app/dev/socialPostFixtures';
import type { ModeratorRole } from '@app/features/social/moderationModel';
import type {
  ActivityItem,
  AttachmentSource,
  FeedComment,
  FeedPost,
} from '@app/features/social/postTypes';
import type {
  FriendActivity,
  FriendInviteRow,
  FriendRequestRow,
  HiddenCategory,
  RelationshipState,
  SocialAudience,
  SocialProfileDetail,
  SocialProfileRow,
  SocialSettingsRow,
  UserBlockRow,
} from '@app/features/social/socialTypes';

// Sample data of Comunidad · tanda B. Nothing is read from or written to the
// backend. Row types are the ones of `types/supabase.ts`, so wiring the
// screens later is only a change of data source (`SocialService`).

export type SocialScenario =
  | 'default' // username set, friends, requests, blocked person
  | 'noUsername' // first entry: the username is required
  | 'noFriends' // STATE_04: no friends yet
  | 'loading' // lists never resolve
  | 'error' // lists fail until "Reintentar"
  | 'inviteLimit' // 5 active invite links
  | 'noBlocked' // empty blocked list
  | 'public' // own audience set to "Público"
  | 'feedEmpty' // friends, but nobody has posted
  | 'feedShort' // few posts: the end of the list shows
  | 'feedLoading' // the feed never resolves
  | 'feedError' // the feed fails until "Reintentar"
  | 'feedMoreError' // the first page loads, the next one fails
  | 'retired' // a removed and a hidden post at the top
  | 'termsAccepted' // the Terms were already accepted
  | 'noChallenges' // no friend challenges and no invitations
  | 'officialNotJoined' // the official challenge not joined yet
  | 'expiredChallenge' // a challenge nobody accepted in time
  | 'waitingChallenge' // a challenge the user created, nobody accepted yet
  | 'challengesLoading'
  | 'challengesError'
  | 'noNotifications'
  | 'notificationsLoading'
  | 'notificationsError'
  | 'moderator' // the user is a moderator
  | 'admin' // the user is an admin
  | 'moderatorEmpty' // moderator, empty queue
  | 'moderationLoading'
  | 'moderationError';

export const FIXTURE_ME = {
  id: 'fx-me',
  name: 'Nicolas Falcon',
} as const;

export type FixturePerson = {
  profile: SocialProfileRow;
  detail: SocialProfileDetail;
  acceptsRequests: boolean;
  audience: SocialAudience;
};

const HOUR = 3_600_000;
const DAY = 86_400_000;

function person(
  id: string,
  name: string,
  username: string,
  avatar: string,
  goal: string,
  detail: Omit<SocialProfileDetail, 'relationship'>,
  options: { acceptsRequests?: boolean; audience?: SocialAudience } = {},
): FixturePerson {
  return {
    profile: {
      id,
      name,
      username,
      avatar_key: avatar,
      // Real photos are never used in fixtures (and never shown to non-friends).
      profile_photo_url: '',
      goal,
      weight: 0,
    },
    detail: { relationship: 'none', ...detail },
    acceptsRequests: options.acceptsRequests !== false,
    audience: options.audience ?? 'friends',
  };
}

const HIDDEN: HiddenCategory[] = ['body_weight', 'nutrition'];

export function buildPeople(now: Date): Record<string, FixturePerson> {
  const t = now.getTime();
  const iso = (offset: number) => new Date(t - offset).toISOString();

  return {
    carlos: person('fx-carlos', 'Carlos Ruiz', 'carlos.ruiz', 'avatar_male_01', 'gain_muscle', {
      streak_days: 12,
      hidden_categories: HIDDEN,
      friends_since: iso(150 * DAY),
      sessions_total: 148,
      badges_total: 23,
      records: [
        { exercise_name: 'Press banca', value: 140, unit: 'kg', reps: 1, is_new: true },
        { exercise_name: 'Sentadilla', value: 165, unit: 'kg', reps: 3, is_new: false },
        { exercise_name: 'Dominadas lastradas', value: 20, unit: 'kg', reps: 5, is_new: false },
      ],
      common_challenges: [
        { id: 'fx-ch-1', title: '100 dominadas', progress: 81, goal: 100 },
        { id: 'fx-ch-2', title: '4 entrenamientos esta semana', progress: 4, goal: 4 },
      ],
      recent_posts: [
        { id: 'fx-post-1', type: 'record', title: '140 kg · Press banca' },
        { id: 'fx-post-2', type: 'achievement', title: 'Racha de 14 días' },
      ],
    }),
    andrea: person('fx-andrea', 'Andrea Molina', 'andrea.molina', 'avatar_female_01', 'performance', {
      streak_days: 9,
      hidden_categories: ['body_weight', 'nutrition', 'routines'],
      friends_since: iso(90 * DAY),
      sessions_total: 96,
      badges_total: 17,
      records: [
        { exercise_name: 'Sentadilla', value: 90, unit: 'kg', reps: 5, is_new: true },
        { exercise_name: 'Hip thrust', value: 120, unit: 'kg', reps: 8, is_new: false },
      ],
      recent_posts: [{ id: 'fx-post-3', type: 'workout', title: 'Pierna completa' }],
    }),
    mateo: person('fx-mateo', 'Mateo Vidal', 'mateo.vidal', 'avatar_male_02', 'gain_muscle', {
      streak_days: 9,
      hidden_categories: HIDDEN,
      friends_since: iso(200 * DAY),
      sessions_total: 64,
      badges_total: 11,
      recent_posts: [{ id: 'fx-post-4', type: 'routine', title: 'Push Day' }],
    }),
    lucia: person('fx-lucia', 'Lucía Ortega', 'lucia.ortega', 'avatar_female_02', 'maintain', {
      streak_days: 33,
      hidden_categories: HIDDEN,
      friends_since: iso(60 * DAY),
      sessions_total: 71,
      badges_total: 19,
    }),
    sofia: person('fx-sofia', 'Sofía Pérez', 'sofia.perez', 'avatar_female_03', 'lose_weight', {
      streak_days: 4,
      hidden_categories: ['body_weight', 'nutrition', 'records'],
      friends_since: iso(30 * DAY),
      sessions_total: 38,
      badges_total: 6,
    }),
    // Received requests.
    diego: person('fx-diego', 'Diego Luna', 'diego.luna', 'avatar_male_03', 'gain_muscle', {
      streak_days: 5,
      hidden_categories: HIDDEN,
    }),
    valeria: person('fx-valeria', 'Valeria Soto', 'valeria.soto', 'avatar_female_01', 'performance', {
      streak_days: 7,
      hidden_categories: HIDDEN,
    }),
    // Sent request.
    pablo: person('fx-pablo', 'Pablo Ibáñez', 'pablo.ibanez', 'avatar_neutral_01', 'improve_health', {
      streak_days: 2,
      hidden_categories: HIDDEN,
    }),
    // Strangers (found by exact username).
    irene: person('fx-irene', 'Irene Castro', 'irene.castro', 'avatar_female_02', 'maintain', {
      streak_days: 3,
      hidden_categories: HIDDEN,
    }),
    hugo: person(
      'fx-hugo',
      'Hugo Marín',
      'hugo.marin',
      'avatar_male_01',
      'performance',
      { streak_days: 8, hidden_categories: HIDDEN },
      { acceptsRequests: false },
    ),
    tomas: person('fx-tomas', 'Tomás Rey', 'tomas.rey', 'avatar_male_03', 'gain_muscle', {
      streak_days: 4,
      hidden_categories: HIDDEN,
    }),
    // Public audience: sees more without being a friend.
    elena: person(
      'fx-elena',
      'Elena Cruz',
      'elena.cruz',
      'avatar_female_03',
      'performance',
      {
        streak_days: 21,
        hidden_categories: ['body_weight', 'nutrition', 'routines'],
        sessions_total: 112,
        badges_total: 14,
        records: [
          { exercise_name: 'Peso muerto', value: 130, unit: 'kg', reps: 3, is_new: false },
          { exercise_name: 'Press militar', value: 45, unit: 'kg', reps: 5, is_new: false },
        ],
        recent_posts: [{ id: 'fx-post-5', type: 'workout', title: 'Fuerza · tren superior' }],
      },
      { audience: 'public' },
    ),
    // Blocked by me.
    raul: person('fx-raul', 'Raúl Gil', 'raul.gil', 'avatar_male_02', 'maintain', {
      streak_days: 1,
      hidden_categories: HIDDEN,
    }),
  };
}

export type FixtureState = {
  me: { id: string; name: string };
  settings: SocialSettingsRow | null;
  people: Record<string, FixturePerson>;
  relations: Record<string, RelationshipState>;
  requests: FriendRequestRow[];
  friendsSince: Record<string, string>;
  activities: Record<string, FriendActivity>;
  blocks: UserBlockRow[];
  invites: FriendInviteRow[];
  // Usernames that already exist (set_username → username_taken).
  takenUsernames: string[];
  failure: 'loading' | 'error' | null;
  // Feed only (the rest of the hub keeps working).
  feedFailure: 'loading' | 'error' | 'moreError' | null;
  // Same idea for the other sections of tanda C.
  challengesFailure: 'loading' | 'error' | null;
  notificationsFailure: 'loading' | 'error' | null;
  moderationFailure: 'loading' | 'error' | null;
  moderatorRole: ModeratorRole | null;
  meProfile: SocialProfileRow;
  posts: FeedPost[];
  comments: FeedComment[];
  activityItems: ActivityItem[];
  sources: AttachmentSource[];
  // Ids of what the user reported (hidden for them right away).
  reportedIds: string[];
  savedRoutines: string[];
  termsAccepted: boolean;
  challenges: ChallengeFixtureSet['challenges'];
  notifications: ChallengeFixtureSet['notifications'];
  moderationQueue: ChallengeFixtureSet['queue'];
  moderationHistory: ChallengeFixtureSet['history'];
  coParticipants: ChallengeFixtureSet['coParticipants'];
  activeChallenges: number;
  pendingInvitations: number;
};

function settingsRow(
  now: Date,
  username: string,
  audience: SocialAudience,
): SocialSettingsRow {
  return {
    user_id: FIXTURE_ME.id,
    username,
    audience,
    share_workouts: true,
    share_records: true,
    share_achievements: true,
    share_photos: true,
    share_routines: true,
    share_body_weight: false,
    allow_friend_requests: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

function request(
  id: string,
  sender: string,
  receiver: string,
  now: Date,
  ago: number,
): FriendRequestRow {
  return {
    id,
    sender_id: sender,
    receiver_id: receiver,
    status: 'pending',
    created_at: new Date(now.getTime() - ago).toISOString(),
    responded_at: null,
  };
}

function invite(
  index: number,
  now: Date,
  daysLeft: number,
): FriendInviteRow {
  const created = new Date(now.getTime() - (INVITE_DAYS - daysLeft) * DAY);
  return {
    id: `fx-invite-${index}`,
    inviter_id: FIXTURE_ME.id,
    token: `fxTokenAbCdEfGhIj${index}x`,
    created_at: created.toISOString(),
    expires_at: new Date(now.getTime() + daysLeft * DAY).toISOString(),
    used_at: null,
    used_by: null,
    revoked_at: null,
  };
}

const INVITE_DAYS = 7;

export function buildFixtureState(
  scenario: SocialScenario,
  now: Date = new Date(),
): FixtureState {
  const people = buildPeople(now);
  const id = (key: string) => people[key].profile.id;
  const t = now.getTime();
  const iso = (offset: number) => new Date(t - offset).toISOString();

  const relations: Record<string, RelationshipState> = {
    [id('carlos')]: 'friends',
    [id('andrea')]: 'friends',
    [id('mateo')]: 'friends',
    [id('lucia')]: 'friends',
    [id('sofia')]: 'friends',
    [id('diego')]: 'request_received',
    [id('valeria')]: 'request_received',
    [id('pablo')]: 'request_sent',
    [id('irene')]: 'none',
    [id('tomas')]: 'none',
    [id('hugo')]: 'none',
    [id('elena')]: 'none',
    [id('raul')]: 'blocked',
  };
  const friendsSince: Record<string, string> = {
    [id('carlos')]: people.carlos.detail.friends_since as string,
    [id('andrea')]: people.andrea.detail.friends_since as string,
    [id('mateo')]: people.mateo.detail.friends_since as string,
    [id('lucia')]: people.lucia.detail.friends_since as string,
    [id('sofia')]: people.sofia.detail.friends_since as string,
  };
  const activities: Record<string, FriendActivity> = {
    [id('carlos')]: {
      user_id: id('carlos'),
      kind: 'workout_completed',
      summary: { title: 'Press banca' },
      created_at: iso(2 * HOUR),
    },
    [id('andrea')]: {
      user_id: id('andrea'),
      kind: 'workout_completed',
      summary: { title: 'Pierna' },
      created_at: iso(3 * HOUR),
    },
    [id('mateo')]: {
      user_id: id('mateo'),
      kind: 'streak',
      summary: { title: 'Racha de 9 días' },
      created_at: iso(20 * HOUR),
    },
    [id('lucia')]: {
      user_id: id('lucia'),
      kind: 'core33_completed',
      summary: { title: 'Core 33' },
      created_at: iso(30 * HOUR),
    },
    [id('sofia')]: {
      user_id: id('sofia'),
      kind: 'workout_completed',
      summary: { title: 'HIIT' },
      created_at: iso(28 * HOUR),
    },
  };
  const requests: FriendRequestRow[] = [
    request('fx-req-diego', id('diego'), FIXTURE_ME.id, now, 5 * HOUR),
    request('fx-req-valeria', id('valeria'), FIXTURE_ME.id, now, 26 * HOUR),
    request('fx-req-pablo', FIXTURE_ME.id, id('pablo'), now, 2 * DAY),
  ];
  const blocks: UserBlockRow[] = [
    {
      blocker_id: FIXTURE_ME.id,
      blocked_id: id('raul'),
      created_at: iso(10 * DAY),
    },
  ];
  const invites: FriendInviteRow[] = [invite(1, now, 5), invite(2, now, 1)];

  const meProfile: SocialProfileRow = {
    id: FIXTURE_ME.id,
    name: FIXTURE_ME.name,
    username: 'nicolas.falcon',
    avatar_key: 'avatar_male_01',
    profile_photo_url: '',
    goal: 'gain_muscle',
    weight: 0,
  };
  const state: FixtureState = {
    me: { ...FIXTURE_ME },
    settings: settingsRow(now, 'nicolas.falcon', 'friends'),
    people,
    relations,
    requests,
    friendsSince,
    activities,
    blocks,
    invites,
    takenUsernames: ['carlos', 'carlos.ruiz', 'andrea.molina', 'nicolas'],
    failure: null,
    feedFailure: null,
    challengesFailure: null,
    notificationsFailure: null,
    moderationFailure: null,
    moderatorRole: scenario === 'moderator' || scenario === 'moderatorEmpty' || scenario === 'moderationLoading' || scenario === 'moderationError' ? 'moderator' : scenario === 'admin' ? 'admin' : null,
    ...(({ challenges, notifications, queue, history, coParticipants }) => ({
      challenges,
      notifications,
      moderationQueue: queue,
      moderationHistory: history,
      coParticipants,
    }))(
      buildChallengeFixtures(now, people, meProfile, {
        expired: scenario === 'expiredChallenge',
        waiting: scenario === 'waitingChallenge',
        official: scenario === 'officialNotJoined' ? 'notJoined' : undefined,
      }),
    ),
    meProfile,
    ...(({ activity, ...rest }) => ({ ...rest, activityItems: activity }))(
      buildPostFixtures(now, people, meProfile, {
      short: scenario === 'feedShort',
      retired: scenario === 'retired',
      empty: scenario === 'feedEmpty',
      }),
    ),
    reportedIds: [],
    savedRoutines: [],
    termsAccepted: scenario === 'termsAccepted',
    activeChallenges: 2,
    pendingInvitations: 1,
  };

  switch (scenario) {
    case 'noUsername':
      state.settings = null;
      break;
    case 'noFriends': {
      state.relations = {
        [id('irene')]: 'none',
        [id('hugo')]: 'none',
        [id('elena')]: 'none',
      };
      state.requests = [];
      state.friendsSince = {};
      state.activities = {};
      state.blocks = [];
      state.invites = [];
      state.posts = [];
      state.comments = [];
      state.activityItems = [];
      state.challenges = state.challenges.filter(item => item.head.kind === 'official');
      state.notifications = [];
      state.coParticipants = [];
      state.activeChallenges = 0;
      state.pendingInvitations = 0;
      break;
    }
    case 'loading':
      state.failure = 'loading';
      break;
    case 'feedEmpty':
      state.activityItems = [];
      break;
    case 'challengesLoading':
      state.challengesFailure = 'loading';
      break;
    case 'challengesError':
      state.challengesFailure = 'error';
      break;
    case 'notificationsLoading':
      state.notificationsFailure = 'loading';
      break;
    case 'notificationsError':
      state.notificationsFailure = 'error';
      break;
    case 'noNotifications':
      state.notifications = [];
      break;
    case 'moderationLoading':
      state.moderationFailure = 'loading';
      break;
    case 'moderationError':
      state.moderationFailure = 'error';
      break;
    case 'moderatorEmpty':
      state.moderationQueue = [];
      break;
    case 'noChallenges':
      state.challenges = state.challenges.filter(item => item.head.kind === 'official');
      state.coParticipants = [];
      break;
    case 'feedLoading':
      state.feedFailure = 'loading';
      break;
    case 'feedError':
      state.feedFailure = 'error';
      break;
    case 'feedMoreError':
      state.feedFailure = 'moreError';
      break;
    case 'error':
      state.failure = 'error';
      break;
    case 'inviteLimit':
      state.invites = [1, 2, 3, 4, 5].map(index => invite(index, now, 6 - index + 1));
      break;
    case 'noBlocked':
      state.blocks = [];
      state.relations = { ...state.relations, [id('raul')]: 'none' };
      break;
    case 'public':
      state.settings = settingsRow(now, 'nicolas.falcon', 'public');
      break;
    case 'default':
      break;
  }

  return state;
}
