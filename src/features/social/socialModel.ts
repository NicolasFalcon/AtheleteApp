import type {
  FriendEntry,
  FriendInviteRow,
  HiddenCategory,
  ReceivedRequest,
  RelationshipState,
  SendFriendRequestStatus,
  SentRequest,
  SocialAudience,
  SocialProfileDetail,
  SocialSettingsRow,
} from '@app/features/social/socialTypes';

// Pure model of Comunidad · tanda B (personas). Business rules come from
// docs/social/SOCIAL_SCHEMA_PROPOSAL.md and the applied backend.

// ── Username (social_settings.username: citext, ^[a-z0-9_.]{3,24}$) ───────
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
const USERNAME_FORMAT = /^[a-z0-9_.]+$/;

// App-side courtesy: the backend only enforces format and uniqueness.
export const RESERVED_USERNAMES: readonly string[] = [
  'admin',
  'administrador',
  'athelete',
  'ellie',
  'soporte',
  'support',
  'ayuda',
  'help',
  'moderador',
  'moderator',
  'mod',
  'oficial',
  'official',
  'equipo',
  'team',
  'staff',
  'sistema',
  'system',
  'root',
  'null',
  'undefined',
];

export type UsernameError =
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'invalid_chars'
  | 'reserved';

export type UsernameCheck =
  | { ok: true; value: string }
  | { ok: false; error: UsernameError };

// Lower-case, without spaces or a leading "@" (citext: "Carlos" = "carlos").
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

export function validateUsername(raw: string): UsernameCheck {
  const value = normalizeUsername(raw);

  if (value.length === 0) {
    return { ok: false, error: 'empty' };
  }
  if (!USERNAME_FORMAT.test(value)) {
    return { ok: false, error: 'invalid_chars' };
  }
  if (value.length < USERNAME_MIN) {
    return { ok: false, error: 'too_short' };
  }
  if (value.length > USERNAME_MAX) {
    return { ok: false, error: 'too_long' };
  }
  if (RESERVED_USERNAMES.includes(value)) {
    return { ok: false, error: 'reserved' };
  }
  return { ok: true, value };
}

export const USERNAME_ERRORS: Record<UsernameError | 'username_taken', string> =
  {
    empty: 'Elige un nombre de usuario.',
    too_short: `Mínimo ${USERNAME_MIN} caracteres.`,
    too_long: `Máximo ${USERNAME_MAX} caracteres.`,
    invalid_chars: 'Usa solo letras, números, punto y guion bajo.',
    reserved: 'Ese nombre no está disponible.',
    username_taken: 'Ese nombre ya está en uso.',
  };

// ── Relationship and its allowed actions ────────────────────────────────────
export type RelationAction =
  | 'send_request'
  | 'cancel_request'
  | 'accept'
  | 'decline'
  | 'block'
  | 'unblock';

export type RelationActions = {
  canSendRequest: boolean;
  canCancelRequest: boolean;
  canAccept: boolean;
  canDecline: boolean;
  canChallenge: boolean;
  canBlock: boolean;
  canUnblock: boolean;
  // "No acepta solicitudes" instead of "Agregar" (Q12).
  requestsClosed: boolean;
};

export function relationActions(
  state: RelationshipState,
  options: { acceptsRequests?: boolean } = {},
): RelationActions {
  const acceptsRequests = options.acceptsRequests !== false;

  return {
    canSendRequest: state === 'none' && acceptsRequests,
    canCancelRequest: state === 'request_sent',
    canAccept: state === 'request_received',
    canDecline: state === 'request_received',
    canChallenge: state === 'friends',
    canBlock: state !== 'self' && state !== 'blocked',
    canUnblock: state === 'blocked',
    requestsClosed: state === 'none' && !acceptsRequests,
  };
}

// State after an action, or null when the action is not allowed. Sending a
// request to someone who already sent you one accepts it (SOCIAL_SCHEMA §4.2).
export function nextRelationship(
  state: RelationshipState,
  action: RelationAction,
  options: { acceptsRequests?: boolean } = {},
): RelationshipState | null {
  const allowed = relationActions(state, options);

  switch (action) {
    case 'send_request':
      return allowed.canSendRequest ? 'request_sent' : null;
    case 'cancel_request':
      return allowed.canCancelRequest ? 'none' : null;
    case 'accept':
      return allowed.canAccept ? 'friends' : null;
    case 'decline':
      return allowed.canDecline ? 'none' : null;
    case 'block':
      return allowed.canBlock ? 'blocked' : null;
    case 'unblock':
      return allowed.canUnblock ? 'none' : null;
  }
}

export type SendRequestOutcome = {
  relationship: RelationshipState;
  message: string;
  ok: boolean;
};

// send_friend_request.status → what the UI shows (neutral wording, Q12).
export function mapSendRequestStatus(
  status: SendFriendRequestStatus,
  name: string,
): SendRequestOutcome {
  switch (status) {
    case 'sent':
      return {
        ok: true,
        relationship: 'request_sent',
        message: 'Solicitud enviada',
      };
    case 'pending':
      return {
        ok: true,
        relationship: 'request_sent',
        message: 'Ya tienes una solicitud pendiente',
      };
    case 'accepted':
      return {
        ok: true,
        relationship: 'friends',
        message: `${name} ya es tu amigo`,
      };
    case 'already_friends':
      return {
        ok: true,
        relationship: 'friends',
        message: `${name} ya es tu amigo`,
      };
    case 'not_accepting':
      return {
        ok: false,
        relationship: 'none',
        message: `${name} no acepta solicitudes ahora`,
      };
    case 'unavailable':
    case 'invalid':
      return {
        ok: false,
        relationship: 'none',
        message: 'No se pudo enviar la solicitud',
      };
  }
}

// ── Who is shown with a real photo ─────────────────────────────────────────
// DA-119: only the viewer and their friends see a real profile photo; anyone
// else gets initials, even when the bucket policy would allow the photo.
export function canShowRealPhoto(state: RelationshipState): boolean {
  return state === 'self' || state === 'friends';
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return '?';
  }
  const letters =
    words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

// ── Profile of another user ────────────────────────────────────────────────
const CATEGORY_LABEL: Record<HiddenCategory, string> = {
  workouts: 'entrenamientos',
  records: 'récords',
  achievements: 'logros',
  photos: 'fotos',
  routines: 'rutinas',
  body_weight: 'peso corporal',
  nutrition: 'nutrición',
};

export function joinWithAnd(items: string[]): string {
  if (items.length <= 1) {
    return items.join('');
  }
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

// "Carlos no comparte peso corporal ni nutrición." Nutrition is never shared.
export function privacyLine(
  name: string,
  hidden: HiddenCategory[],
  relationship: RelationshipState,
  // A public profile shows activity to non-friends too (SOCIAL_SCHEMA Q2).
  showsActivity: boolean = relationship === 'friends',
): string {
  const who = firstName(name);

  if (!showsActivity) {
    return `Solo los amigos de ${who} ven su actividad.`;
  }
  const categories = Array.from(new Set<HiddenCategory>([...hidden, 'nutrition']))
    .sort((a, b) => Object.keys(CATEGORY_LABEL).indexOf(a) - Object.keys(CATEGORY_LABEL).indexOf(b))
    .map(category => CATEGORY_LABEL[category]);

  return `${who} no comparte ${categories.join(' ni ')}.`;
}

export type ProfileSections = {
  stats: boolean;
  sessions: boolean;
  badges: boolean;
  records: boolean;
  commonChallenges: boolean;
  recentPosts: boolean;
  friendsSince: boolean;
};

// The server only returns what the viewer may see, so a section shows when
// its field is present. On top of that, a non-friend never gets "amigos desde"
// or retos en común (SOCIAL_SCHEMA §5.2), even if the field came back.
export function profileSections(
  state: RelationshipState,
  detail: SocialProfileDetail | null,
): ProfileSections {
  const friend = state === 'friends' || state === 'self';

  return {
    stats: Boolean(detail),
    sessions: detail?.sessions_total !== undefined,
    badges: detail?.badges_total !== undefined,
    records: Boolean(detail?.records && detail.records.length > 0),
    commonChallenges: Boolean(
      friend && detail?.common_challenges && detail.common_challenges.length > 0,
    ),
    recentPosts: Boolean(detail?.recent_posts && detail.recent_posts.length > 0),
    friendsSince: Boolean(friend && detail?.friends_since),
  };
}

const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

// "Amigos desde marzo" (or "marzo de 2025" when it is not this year).
export function friendsSinceLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const month = MONTHS_LONG[date.getMonth()];
  return date.getFullYear() === now.getFullYear()
    ? `Amigos desde ${month}`
    : `Amigos desde ${month} de ${date.getFullYear()}`;
}

export const GOAL_LABEL: Record<string, string> = {
  lose_weight: 'Perder grasa',
  gain_muscle: 'Ganar músculo',
  maintain: 'Mantenerse',
  improve_health: 'Mejorar salud',
  performance: 'Rendimiento',
};

export function goalText(goal: string | null | undefined): string {
  return (goal && GOAL_LABEL[goal]) || '';
}

// ── Amigos list ────────────────────────────────────────────────────────────
export type FriendGroupKey = 'received' | 'friends' | 'sent';

export type FriendGroup =
  | { key: 'received'; title: string; items: ReceivedRequest[] }
  | { key: 'friends'; title: string; items: FriendEntry[] }
  | { key: 'sent'; title: string; items: SentRequest[] };

function matches(query: string, name: string, username: string): boolean {
  const q = query.trim().toLowerCase().replace(/^@+/, '');
  return (
    q.length === 0 ||
    name.toLowerCase().includes(q) ||
    username.toLowerCase().includes(q)
  );
}

// Typing filters the people you already have; a person you do not know is
// found only by exact username (find_user_by_username, Q3).
export function buildFriendGroups(
  overview: {
    received: ReceivedRequest[];
    friends: FriendEntry[];
    sent: SentRequest[];
  },
  query: string,
): FriendGroup[] {
  const received = overview.received.filter(item =>
    matches(query, item.profile.name, item.profile.username),
  );
  const friends = overview.friends.filter(item =>
    matches(query, item.profile.name, item.profile.username),
  );
  const sent = overview.sent.filter(item =>
    matches(query, item.profile.name, item.profile.username),
  );
  const groups: FriendGroup[] = [
    { key: 'received', title: 'Solicitudes recibidas', items: received },
    { key: 'friends', title: 'Amigos', items: friends },
    { key: 'sent', title: 'Enviadas', items: sent },
  ];

  return groups.filter(group => group.items.length > 0);
}

// The query can be sent to find_user_by_username.
export function exactLookupQuery(query: string): string | null {
  const check = validateUsername(query);
  return check.ok ? check.value : null;
}

export function hubSubtitle(friends: number, activeChallenges: number): string {
  const f = `${friends} ${friends === 1 ? 'amigo' : 'amigos'}`;
  const c = `${activeChallenges} ${activeChallenges === 1 ? 'reto activo' : 'retos activos'}`;
  return `${f} · ${c}`;
}

// ── Privacy (SOCIAL_14) ────────────────────────────────────────────────────
export type PrivacyRowKey =
  | 'share_workouts'
  | 'share_records'
  | 'share_achievements'
  | 'share_photos'
  | 'share_routines'
  | 'share_body_weight'
  | 'allow_friend_requests';

export const PRIVACY_ROWS: ReadonlyArray<{
  key: PrivacyRowKey;
  title: string;
  subtitle: string;
}> = [
  {
    key: 'share_workouts',
    title: 'Entrenamientos',
    subtitle: 'Sesiones completadas y su resumen',
  },
  {
    key: 'share_records',
    title: 'Récords personales',
    subtitle: 'Tus mejores marcas',
  },
  {
    key: 'share_achievements',
    title: 'Logros',
    subtitle: 'Medallas y retos completados',
  },
  {
    key: 'share_photos',
    title: 'Fotos',
    subtitle: 'Las que añadas a tus publicaciones',
  },
  {
    key: 'share_routines',
    title: 'Rutinas',
    subtitle: 'Para que tus amigos puedan guardarlas',
  },
  {
    key: 'share_body_weight',
    title: 'Peso corporal',
    subtitle: 'Nunca se muestra salvo que lo actives',
  },
  {
    key: 'allow_friend_requests',
    title: 'Permitir solicitudes de amistad',
    subtitle: 'Cualquiera puede enviarte una',
  },
];

export const AUDIENCE_OPTIONS: ReadonlyArray<{
  key: SocialAudience;
  label: string;
}> = [
  { key: 'friends', label: 'Solo amigos' },
  { key: 'public', label: 'Público' },
];

export function audienceLine(audience: SocialAudience): string {
  return audience === 'friends'
    ? 'Solo tus amigos ven tu actividad. Cualquiera puede encontrarte por tu nombre de usuario.'
    : 'Cualquier atleta puede ver lo que actives abajo en tu perfil. Tus amigos, además, pueden retarte.';
}

// "Así te ven tus amigos".
export function privacyPreview(
  settings: Pick<SocialSettingsRow, PrivacyRowKey>,
): string {
  const shown = PRIVACY_ROWS.filter(
    row => row.key !== 'allow_friend_requests' && settings[row.key],
  ).map(row => row.title.toLowerCase());

  return shown.length > 0
    ? `Tu nombre, tu objetivo, tu racha y ${joinWithAnd(shown)}.`
    : 'Tu nombre, tu objetivo y tu racha. Nada más.';
}

// ── Invitations (friend_invites: one use, 7 days, at most 5 active) ────────
export const MAX_ACTIVE_INVITES = 5;
export const INVITE_DAYS = 7;

export function isInviteActive(
  invite: Pick<FriendInviteRow, 'used_at' | 'revoked_at' | 'expires_at'>,
  now: Date = new Date(),
): boolean {
  return (
    invite.used_at === null &&
    invite.revoked_at === null &&
    new Date(invite.expires_at).getTime() > now.getTime()
  );
}

export function activeInviteCount(
  invites: FriendInviteRow[],
  now: Date = new Date(),
): number {
  return invites.filter(invite => isInviteActive(invite, now)).length;
}

export function canCreateInvite(
  invites: FriendInviteRow[],
  now: Date = new Date(),
): boolean {
  return activeInviteCount(invites, now) < MAX_ACTIVE_INVITES;
}

export function inviteUrl(token: string): string {
  return `athelete://amigo/${token}`;
}

export function inviteExpiryLabel(
  expiresAt: string,
  now: Date = new Date(),
): string {
  const days = Math.ceil(
    (new Date(expiresAt).getTime() - now.getTime()) / 86_400_000,
  );

  if (days <= 0) {
    return 'Caducado';
  }
  return days === 1 ? 'Caduca mañana' : `Caduca en ${days} días`;
}

// Text shared with the system share sheet.
export function inviteMessage(name: string, url: string): string {
  return `${firstName(name)} te invita a ATHELETE. Únete con este enlace: ${url}`;
}

export function usernameShareMessage(name: string, username: string): string {
  return `${firstName(name)} en ATHELETE: @${username}. Búscame por mi nombre de usuario.`;
}

// ── Last activity of a friend ("Entrenó hoy · Press banca") ─────────────────
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function dayDistance(iso: string, now: Date = new Date()): number {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
}

export function activityWhen(iso: string, now: Date = new Date()): string {
  const days = dayDistance(iso, now);

  if (days <= 0) {
    return 'hoy';
  }
  return days === 1 ? 'ayer' : `hace ${days} días`;
}

// kinds of social_activity: workout_completed, record, badge,
// core33_completed, challenge_completed, streak.
export function activityLine(
  activity: { kind: string; summary: { title: string }; created_at: string },
  now: Date = new Date(),
): string {
  const when = activityWhen(activity.created_at, now);
  const title = activity.summary.title;

  switch (activity.kind) {
    case 'workout_completed':
      return `Entrenó ${when} · ${title}`;
    case 'record':
      return `Nuevo récord · ${title}`;
    case 'badge':
      return `Logro · ${title}`;
    case 'core33_completed':
      return 'Terminó Core 33';
    case 'challenge_completed':
      return `Reto completado · ${title}`;
    case 'streak':
      return title;
    default:
      return title;
  }
}

export function isTodayActivity(
  activity: { kind: string; created_at: string },
  now: Date = new Date(),
): boolean {
  return (
    activity.kind === 'workout_completed' &&
    dayDistance(activity.created_at, now) <= 0
  );
}
