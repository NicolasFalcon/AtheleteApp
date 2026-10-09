import { CommonActions, StackActions } from '@react-navigation/native';
import { hubRouteName, waitForFixtureApp } from '@app/dev/devFixtureNav';
import type { SocialScenario } from '@app/dev/socialFixtures';
import { navigationRef } from '@app/navigation/navigationRef';
import { socialFixtureStore } from '@app/services/social/fixtureSocialService';

// Development only: each Comunidad screen (tanda B) and state with sample
// data: nothing is read or written. Used by the dev menu ("Ver pantallas de
// Comunidad") and athelete://dev/social?screen=<key>.
type Target =
  | { tab: 'Community' | 'Home'; params: Record<string, unknown> }
  | { route: string; params: Record<string, unknown> | undefined };

type Entry = {
  key: string;
  label: string;
  scenario: SocialScenario;
  target: Target;
};

const tab = (
  segment: 'feed' | 'retos' | 'amigos',
  devQuery = '',
  devScroll?: 'end',
): Target => ({
  tab: 'Community',
  params: { segment, devQuery, devScroll, devNonce: Date.now() },
});
const route = (name: string, params?: Record<string, unknown>): Target => ({
  route: name,
  params,
});
const profile = (key: string, extra: Record<string, unknown> = {}): Target =>
  route('SocialProfile', { userId: `fx-${key}`, ...extra });

const home: Target = { tab: 'Home', params: {} };

const SCREENS: Entry[] = [
  // Inicio with the official challenge section (v2.12): joined / invitation.
  { key: 'homeChallenge', label: 'Inicio · reto oficial con progreso', scenario: 'default', target: home },
  { key: 'homeChallengeInvite', label: 'Inicio · invitación al reto oficial', scenario: 'officialNotJoined', target: home },
  { key: 'feedEmpty', label: 'Feed sin amigos (STATE_04)', scenario: 'noFriends', target: tab('feed') },
  { key: 'feed', label: 'Feed con publicaciones (SOCIAL_01)', scenario: 'default', target: tab('feed') },
  { key: 'feedNoPosts', label: 'Feed · con amigos y sin publicaciones', scenario: 'feedEmpty', target: tab('feed') },
  { key: 'feedLoading', label: 'Feed · cargando (STATE_01)', scenario: 'feedLoading', target: tab('feed') },
  { key: 'feedError', label: 'Feed · error con reintento (STATE_07)', scenario: 'feedError', target: tab('feed') },
  { key: 'feedMore', label: 'Feed · siguiente página (scroll al final)', scenario: 'default', target: tab('feed', '', 'end') },
  { key: 'feedMoreError', label: 'Feed · error al cargar más', scenario: 'feedMoreError', target: tab('feed', '', 'end') },
  { key: 'feedEnd', label: 'Feed · fin de la lista', scenario: 'feedShort', target: tab('feed', '', 'end') },
  { key: 'feedRetired', label: 'Feed · contenido retirado y en revisión', scenario: 'retired', target: tab('feed') },
  { key: 'friends', label: 'Amigos (SOCIAL_05)', scenario: 'default', target: tab('amigos') },
  { key: 'friendsSearch', label: 'Amigos · resultado de usuario exacto', scenario: 'default', target: tab('amigos', 'irene.castro') },
  { key: 'friendsFilter', label: 'Amigos · filtro de la lista', scenario: 'default', target: tab('amigos', 'ruiz') },
  { key: 'friendsNoResults', label: 'Amigos · búsqueda sin resultados', scenario: 'default', target: tab('amigos', 'nadie.aqui') },
  { key: 'friendsEmpty', label: 'Amigos · sin amigos', scenario: 'noFriends', target: tab('amigos') },
  { key: 'friendsLoading', label: 'Amigos · cargando', scenario: 'loading', target: tab('amigos') },
  { key: 'friendsError', label: 'Amigos · error con reintento', scenario: 'error', target: tab('amigos') },
  { key: 'username', label: 'Nombre de usuario · primer acceso', scenario: 'noUsername', target: route('SocialUsername', { mode: 'create' }) },
  { key: 'usernameInvalid', label: 'Nombre de usuario · formato no válido', scenario: 'noUsername', target: route('SocialUsername', { mode: 'create', devText: 'Mi Nombre!' }) },
  { key: 'usernameTaken', label: 'Nombre de usuario · ya en uso', scenario: 'noUsername', target: route('SocialUsername', { mode: 'create', devText: 'carlos', devError: 'username_taken' }) },
  { key: 'usernameEdit', label: 'Nombre de usuario · editar', scenario: 'default', target: route('SocialUsername', { mode: 'edit' }) },
  { key: 'profileFriend', label: 'Perfil · amigo (SOCIAL_06)', scenario: 'default', target: profile('carlos') },
  { key: 'profileReceived', label: 'Perfil · solicitud recibida', scenario: 'default', target: profile('diego') },
  { key: 'profileSent', label: 'Perfil · solicitud enviada', scenario: 'default', target: profile('pablo') },
  { key: 'profileNone', label: 'Perfil · sin relación (privado)', scenario: 'default', target: profile('irene') },
  { key: 'profileClosed', label: 'Perfil · no acepta solicitudes', scenario: 'default', target: profile('hugo') },
  { key: 'profilePublic', label: 'Perfil · público sin relación', scenario: 'default', target: profile('elena') },
  { key: 'profileBlocked', label: 'Perfil · bloqueado por ti', scenario: 'default', target: profile('raul') },
  { key: 'profileAbsent', label: 'Perfil · fila ausente', scenario: 'default', target: route('SocialProfile', { userId: 'fx-ausente' }) },
  { key: 'profileConfirmBlock', label: 'Perfil · confirmar bloqueo', scenario: 'default', target: profile('carlos', { devConfirmBlock: true }) },
  { key: 'profileLoading', label: 'Perfil · cargando', scenario: 'loading', target: profile('carlos') },
  { key: 'profileError', label: 'Perfil · error con reintento', scenario: 'error', target: profile('carlos') },
  { key: 'privacy', label: 'Privacidad social · solo amigos (SOCIAL_14)', scenario: 'default', target: route('SocialPrivacy') },
  { key: 'privacyPublic', label: 'Privacidad social · público', scenario: 'public', target: route('SocialPrivacy') },
  { key: 'privacyLoading', label: 'Privacidad social · cargando', scenario: 'loading', target: route('SocialPrivacy') },
  { key: 'privacyError', label: 'Privacidad social · error con reintento', scenario: 'error', target: route('SocialPrivacy') },
  { key: 'invite', label: 'Invitar amigos', scenario: 'default', target: route('SocialInvite') },
  { key: 'inviteLimit', label: 'Invitar amigos · 5 enlaces activos', scenario: 'inviteLimit', target: route('SocialInvite') },
  { key: 'inviteEmpty', label: 'Invitar amigos · sin enlaces', scenario: 'noFriends', target: route('SocialInvite') },
  { key: 'post', label: 'Publicación y comentarios (SOCIAL_03)', scenario: 'default', target: route('SocialPost', { postId: 'fx-p1' }) },
  { key: 'postPhoto', label: 'Publicación · entreno con foto', scenario: 'default', target: route('SocialPost', { postId: 'fx-p2' }) },
  { key: 'postRoutine', label: 'Publicación · rutina compartida', scenario: 'default', target: route('SocialPost', { postId: 'fx-p3' }) },
  { key: 'postAchievement', label: 'Publicación · logro', scenario: 'default', target: route('SocialPost', { postId: 'fx-p4' }) },
  { key: 'postRemoved', label: 'Publicación · contenido retirado', scenario: 'retired', target: route('SocialPost', { postId: 'fx-removed' }) },
  { key: 'postHidden', label: 'Publicación · en revisión', scenario: 'retired', target: route('SocialPost', { postId: 'fx-hidden' }) },
  { key: 'postGone', label: 'Publicación · ya no disponible', scenario: 'default', target: route('SocialPost', { postId: 'fx-missing' }) },
  { key: 'postLoading', label: 'Publicación · cargando', scenario: 'loading', target: route('SocialPost', { postId: 'fx-p1' }) },
  { key: 'postError', label: 'Publicación · error con reintento', scenario: 'error', target: route('SocialPost', { postId: 'fx-p1' }) },
  { key: 'postMenu', label: 'Publicación · opciones', scenario: 'default', target: route('SocialPost', { postId: 'fx-p1', devAction: 'menu' }) },
  { key: 'postReport', label: 'Reportar publicación', scenario: 'default', target: route('SocialPost', { postId: 'fx-p1', devAction: 'report' }) },
  { key: 'commentReport', label: 'Reportar comentario', scenario: 'default', target: route('SocialPost', { postId: 'fx-p1', devAction: 'reportComment' }) },
  { key: 'postDelete', label: 'Eliminar tu publicación', scenario: 'default', target: route('SocialPost', { postId: 'fx-p7', devAction: 'delete' }) },
  { key: 'compose', label: 'Crear publicación (SOCIAL_02)', scenario: 'default', target: route('SocialCompose', {}) },
  { key: 'composePhoto', label: 'Crear publicación · con foto', scenario: 'default', target: route('SocialCompose', { devState: 'photo' }) },
  { key: 'composeBadPhoto', label: 'Crear publicación · foto no válida', scenario: 'default', target: route('SocialCompose', { devState: 'badPhoto', attach: 'record' }) },
  { key: 'composeTerms', label: 'Crear publicación · Términos antes de publicar', scenario: 'default', target: route('SocialCompose', { devState: 'terms' }) },
  { key: 'composeShare', label: 'Compartir entreno (SOCIAL_13)', scenario: 'termsAccepted', target: route('SocialCompose', { attach: 'workout' }) },
  { key: 'composeRecord', label: 'Compartir récord', scenario: 'termsAccepted', target: route('SocialCompose', { attach: 'record' }) },
  { key: 'retos', label: 'Retos (SOCIAL_07)', scenario: 'default', target: tab('retos') },
  { key: 'retosEmpty', label: 'Retos · sin retos (STATE_05)', scenario: 'noChallenges', target: tab('retos') },
  { key: 'retosNotJoined', label: 'Retos · oficial sin unirte', scenario: 'officialNotJoined', target: tab('retos') },
  { key: 'retosList', label: 'Retos · entre amigos y completados', scenario: 'default', target: tab('retos', '', 'end') },
  { key: 'retosExpired', label: 'Retos · reto expirado', scenario: 'expiredChallenge', target: tab('retos', '', 'end') },
  { key: 'retosWaiting', label: 'Retos · reto creado esperando', scenario: 'waitingChallenge', target: tab('retos', '', 'end') },
  { key: 'retosLoading', label: 'Retos · cargando', scenario: 'challengesLoading', target: tab('retos') },
  { key: 'retosError', label: 'Retos · error con reintento', scenario: 'challengesError', target: tab('retos') },
  { key: 'challengeOfficial', label: 'Reto oficial (SOCIAL_08)', scenario: 'default', target: route('SocialChallenge', { challengeId: 'fx-ch-official' }) },
  { key: 'challengeOfficialNotJoined', label: 'Reto oficial · sin unirte', scenario: 'officialNotJoined', target: route('SocialChallenge', { challengeId: 'fx-ch-official' }) },
  { key: 'challengeFriends', label: 'Reto entre amigos (SOCIAL_09)', scenario: 'default', target: route('SocialChallenge', { challengeId: 'fx-ch-ent' }) },
  { key: 'challengeInvite', label: 'Invitación a reto (SOCIAL_10)', scenario: 'default', target: route('SocialChallenge', { challengeId: 'fx-ch-mov' }) },
  { key: 'challengeWaiting', label: 'Reto · esperando a que acepten', scenario: 'waitingChallenge', target: route('SocialChallenge', { challengeId: 'fx-ch-wait' }) },
  { key: 'challengeCancel', label: 'Reto · cancelar (creador)', scenario: 'waitingChallenge', target: route('SocialChallenge', { challengeId: 'fx-ch-wait', devSheet: 'cancel' }) },
  { key: 'challengeCompleted', label: 'Reto · completado', scenario: 'default', target: route('SocialChallenge', { challengeId: 'fx-ch-done' }) },
  { key: 'challengeExpired', label: 'Reto · expirado', scenario: 'expiredChallenge', target: route('SocialChallenge', { challengeId: 'fx-ch-exp' }) },
  { key: 'challengeLeave', label: 'Reto · salir', scenario: 'default', target: route('SocialChallenge', { challengeId: 'fx-ch-ent', devSheet: 'leave' }) },
  { key: 'challengeLoading', label: 'Reto · cargando', scenario: 'challengesLoading', target: route('SocialChallenge', { challengeId: 'fx-ch-ent' }) },
  { key: 'challengeError', label: 'Reto · error con reintento', scenario: 'challengesError', target: route('SocialChallenge', { challengeId: 'fx-ch-ent' }) },
  { key: 'challengeMissing', label: 'Reto · no disponible', scenario: 'default', target: route('SocialChallenge', { challengeId: 'fx-ch-missing' }) },
  { key: 'doneOfficial', label: 'Reto completado · oficial (SOCIAL_12)', scenario: 'default', target: route('SocialChallengeDone', { challengeId: 'fx-ch-official' }) },
  { key: 'doneFriends', label: 'Reto completado · entre amigos', scenario: 'default', target: route('SocialChallengeDone', { challengeId: 'fx-ch-done' }) },
  { key: 'create', label: 'Crear reto · tipo (SOCIAL_11)', scenario: 'default', target: route('SocialCreateChallenge', {}) },
  { key: 'createGoal', label: 'Crear reto · objetivo', scenario: 'default', target: route('SocialCreateChallenge', { devStep: 1 }) },
  { key: 'createDuration', label: 'Crear reto · duración', scenario: 'default', target: route('SocialCreateChallenge', { devStep: 2 }) },
  { key: 'createFriends', label: 'Crear reto · amigos', scenario: 'default', target: route('SocialCreateChallenge', { devStep: 3 }) },
  { key: 'createReview', label: 'Crear reto · revisión', scenario: 'default', target: route('SocialCreateChallenge', { devStep: 4 }) },
  { key: 'notifications', label: 'Notificaciones sociales', scenario: 'default', target: route('SocialNotifications') },
  { key: 'notificationsEmpty', label: 'Notificaciones · sin notificaciones', scenario: 'noNotifications', target: route('SocialNotifications') },
  { key: 'notificationsLoading', label: 'Notificaciones · cargando', scenario: 'notificationsLoading', target: route('SocialNotifications') },
  { key: 'notificationsError', label: 'Notificaciones · error con reintento', scenario: 'notificationsError', target: route('SocialNotifications') },
  { key: 'moderation', label: 'Moderación · cola (moderador)', scenario: 'moderator', target: route('SocialModeration') },
  { key: 'moderationHistory', label: 'Moderación · historial', scenario: 'moderator', target: route('SocialModeration', { devTab: 'history' }) },
  { key: 'moderationEmpty', label: 'Moderación · cola vacía', scenario: 'moderatorEmpty', target: route('SocialModeration') },
  { key: 'moderationDenied', label: 'Moderación · usuario normal (sin acceso)', scenario: 'default', target: route('SocialModeration') },
  { key: 'moderationLoading', label: 'Moderación · cargando', scenario: 'moderationLoading', target: route('SocialModeration') },
  { key: 'moderationError', label: 'Moderación · error con reintento', scenario: 'moderationError', target: route('SocialModeration') },
  { key: 'moderationItem', label: 'Moderación · publicación oculta', scenario: 'moderator', target: route('SocialModerationItem', { targetId: 'fx-q-post' }) },
  { key: 'moderationItemComment', label: 'Moderación · comentario', scenario: 'moderator', target: route('SocialModerationItem', { targetId: 'fx-q-comment' }) },
  { key: 'moderationItemUser', label: 'Moderación · reporte de usuario', scenario: 'moderator', target: route('SocialModerationItem', { targetId: 'fx-q-user' }) },
  { key: 'moderationItemDenied', label: 'Moderación · reporte sin acceso', scenario: 'default', target: route('SocialModerationItem', { targetId: 'fx-q-post' }) },
  { key: 'routine', label: 'Rutina compartida (SOCIAL_04)', scenario: 'default', target: route('SocialRoutine', { postId: 'fx-p3' }) },
  { key: 'routineMissing', label: 'Rutina compartida · no disponible', scenario: 'default', target: route('SocialRoutine', { postId: 'fx-p1' }) },
  { key: 'composeAchievement', label: 'Compartir logro', scenario: 'termsAccepted', target: route('SocialCompose', { attach: 'achievement' }) },
  { key: 'composeChallenge', label: 'Compartir reto', scenario: 'termsAccepted', target: route('SocialCompose', { attach: 'challenge' }) },
  { key: 'blocked', label: 'Usuarios bloqueados', scenario: 'default', target: route('SocialBlocked') },
  { key: 'blockedEmpty', label: 'Usuarios bloqueados · vacío', scenario: 'noBlocked', target: route('SocialBlocked') },
  { key: 'blockedLoading', label: 'Usuarios bloqueados · cargando', scenario: 'loading', target: route('SocialBlocked') },
  { key: 'blockedError', label: 'Usuarios bloqueados · error con reintento', scenario: 'error', target: route('SocialBlocked') },
];

export const SOCIAL_DEV_SCREENS = SCREENS;
export type SocialDevScreen = string;

export function isSocialDevScreen(value: string | null): value is string {
  return SCREENS.some(screen => screen.key === value);
}

export async function openSocialDevScreen(key: string): Promise<boolean> {
  // Sample data only: it opens without a session.
  if (!__DEV__ || !(await waitForFixtureApp())) {
    return false;
  }
  const entry = SCREENS.find(screen => screen.key === key);
  if (!entry) {
    return false;
  }
  // Each state starts from fresh sample data.
  socialFixtureStore.reset(entry.scenario);
  // Start from the root of the stack (nothing to pop when already there).
  if ((navigationRef.getRootState()?.routes.length ?? 0) > 1) {
    navigationRef.dispatch(StackActions.popToTop());
  }
  if ('tab' in entry.target) {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: hubRouteName(),
        params: { screen: entry.target.tab, params: entry.target.params },
      }),
    );
    return true;
  }
  navigationRef.dispatch(
    StackActions.push(entry.target.route as never, entry.target.params as never),
  );
  return true;
}

let cursor = -1;

export async function openNextSocialDevScreen(): Promise<string | null> {
  cursor = (cursor + 1) % SCREENS.length;
  const entry = SCREENS[cursor];
  return (await openSocialDevScreen(entry.key)) ? entry.label : null;
}
