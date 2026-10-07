import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link2 } from 'lucide-react-native';
import {
  PersonRequestActions,
  PersonRow,
  PersonStateButton,
  Row,
  SearchField,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  activityLine,
  buildFriendGroups,
  exactLookupQuery,
  firstName,
  isTodayActivity,
  mapSendRequestStatus,
} from '@app/features/social/socialModel';
import type {
  FindUserResult,
  FriendsOverview,
  SocialLoadState,
  SocialProfileRow,
} from '@app/features/social/socialTypes';
import { useSocialService } from '@app/features/social/useSocial';
import { inviteMessageLine } from '@app/features/social/v2/inviteLine';
import {
  GroupHeader,
  NoFriendsState,
} from '@app/features/social/v2/SocialParts';

type FriendsViewProps = {
  status: SocialLoadState;
  overview: FriendsOverview | null;
  onReload: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  onOpenProfile: (userId: string) => void;
  onInvite: () => void;
  username: string | null;
};

const SKELETON_ROWS = [0, 1, 2, 3];

// Comunidad · Amigos (SOCIAL_05): search, received requests, friends, sent
// requests. A person you do not have yet is found only by exact username
// (find_user_by_username, Q3); there is no "personas de tus retos" here.
export function FriendsView({
  status,
  overview,
  onReload,
  query,
  onQueryChange,
  onOpenProfile,
  onInvite,
  username,
}: FriendsViewProps) {
  const { colors } = useThemeV2();
  const service = useSocialService();
  const toast = useToast();
  const [lookup, setLookup] = useState<{
    query: string;
    result: FindUserResult | null;
  } | null>(null);

  const exact = exactLookupQuery(query);

  // Exact username lookup, debounced; the local lists filter as you type.
  useEffect(() => {
    if (!exact) {
      setLookup(null);
      return undefined;
    }
    let active = true;
    const timer = setTimeout(() => {
      service
        .findByUsername(exact)
        .then(result => {
          if (active) {
            setLookup({ query: exact, result });
          }
        })
        .catch(() => {
          if (active) {
            setLookup({ query: exact, result: null });
          }
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [exact, service]);

  const show = (message: string, tone?: 'error') =>
    toast.show(message, { withTabBar: true, tone });
  const fail = () => show('No se pudo completar la acción', 'error');

  const groups = overview ? buildFriendGroups(overview, query) : [];
  const hasPeople =
    overview !== null &&
    (overview.friends.length > 0 ||
      overview.received.length > 0 ||
      overview.sent.length > 0);
  const searching = query.trim().length > 0;
  const lookupResult =
    lookup && exact && lookup.query === exact ? lookup.result : null;
  // The lookup row only appears for someone the lists do not already show.
  const knownIds = new Set(
    overview
      ? [
          ...overview.friends.map(item => item.profile.id),
          ...overview.received.map(item => item.profile.id),
          ...overview.sent.map(item => item.profile.id),
        ]
      : [],
  );
  const showLookup =
    lookupResult !== null &&
    lookupResult.relationship !== 'self' &&
    !knownIds.has(lookupResult.user_id);
  const noResults =
    searching &&
    groups.length === 0 &&
    !showLookup &&
    (!exact || lookup?.query === exact);

  const accept = async (id: string, profile: SocialProfileRow) => {
    try {
      await service.respondFriendRequest(id, true);
      show(`${firstName(profile.name)} ya es tu amigo`);
    } catch {
      fail();
    }
  };
  const ignore = async (id: string) => {
    try {
      await service.respondFriendRequest(id, false);
      show('Solicitud ignorada');
    } catch {
      fail();
    }
  };
  const cancel = async (id: string) => {
    try {
      await service.cancelFriendRequest(id);
      show('Solicitud cancelada');
    } catch {
      fail();
    }
  };
  const send = async (result: FindUserResult) => {
    try {
      const sent = await service.sendFriendRequest(result.user_id);
      const outcome = mapSendRequestStatus(sent, firstName(result.name));
      show(outcome.message, outcome.ok ? undefined : 'error');
    } catch {
      fail();
    }
  };

  return (
    <View style={styles.root}>
      <SearchField
        placeholder="Buscar por nombre de usuario"
        value={query}
        onChangeText={onQueryChange}
      />

      {status === 'loading' ? (
        <SkeletonGroup>
          {SKELETON_ROWS.map(index => (
            <View key={index} style={styles.skeletonRow}>
              <Skeleton width={48} height={48} radius={24} />
              <View style={styles.skeletonTexts}>
                <Skeleton width="55%" height={16} />
                <Skeleton width="75%" height={12} />
              </View>
              <Skeleton width={84} height={34} radius={17} />
            </View>
          ))}
        </SkeletonGroup>
      ) : null}

      {status === 'error' ? (
        <BlockError
          message="No pudimos cargar tus amigos. Tus entrenos siguen funcionando."
          onRetry={onReload}
        />
      ) : null}

      {status === 'ready' && !searching && !hasPeople ? (
        <NoFriendsState
          title="Aún no tienes amigos"
          body="Busca a alguien por su nombre de usuario exacto o invítale con un enlace."
          onSearch={() => onQueryChange('')}
          onInvite={onInvite}
        />
      ) : null}

      {status === 'ready' && !searching && hasPeople ? (
        <TextV2 variant="meta" tone="secondary">
          Para encontrar a alguien nuevo, escribe su nombre de usuario completo.
        </TextV2>
      ) : null}

      {status === 'ready' && overview
        ? groups.map(group => (
            <View key={group.key}>
              <GroupHeader title={group.title} count={group.items.length} />
              {group.key === 'received'
                ? group.items.map(item => (
                    <PersonRow
                      key={item.request.id}
                      name={item.profile.name}
                      subtitle={`@${item.profile.username}`}
                      avatar={{
                        avatarKey: item.profile.avatar_key,
                        profilePhotoUrl: item.profile.profile_photo_url,
                        relationship: 'request_received',
                      }}
                      onPress={() => onOpenProfile(item.profile.id)}
                      trailing={
                        <PersonRequestActions
                          onAccept={() => accept(item.request.id, item.profile)}
                          onIgnore={() => ignore(item.request.id)}
                        />
                      }
                    />
                  ))
                : null}
              {group.key === 'friends'
                ? group.items.map(item => (
                    <PersonRow
                      key={item.profile.id}
                      name={item.profile.name}
                      subtitle={
                        item.lastActivity
                          ? activityLine(item.lastActivity)
                          : `@${item.profile.username}`
                      }
                      today={
                        item.lastActivity
                          ? isTodayActivity(item.lastActivity)
                          : false
                      }
                      avatar={{
                        avatarKey: item.profile.avatar_key,
                        profilePhotoUrl: item.profile.profile_photo_url,
                        relationship: 'friends',
                      }}
                      onPress={() => onOpenProfile(item.profile.id)}
                      trailing={
                        <PersonStateButton
                          state="friends"
                          onPress={() => onOpenProfile(item.profile.id)}
                        />
                      }
                    />
                  ))
                : null}
              {group.key === 'sent'
                ? group.items.map(item => (
                    <PersonRow
                      key={item.request.id}
                      name={item.profile.name}
                      subtitle={`@${item.profile.username}`}
                      avatar={{
                        avatarKey: item.profile.avatar_key,
                        profilePhotoUrl: item.profile.profile_photo_url,
                        relationship: 'request_sent',
                      }}
                      onPress={() => onOpenProfile(item.profile.id)}
                      trailing={
                        <PersonStateButton
                          state="sent"
                          onPress={() => cancel(item.request.id)}
                        />
                      }
                    />
                  ))
                : null}
            </View>
          ))
        : null}

      {status === 'ready' && showLookup && lookupResult ? (
        <View>
          <GroupHeader title="Resultado" count={1} />
          <PersonRow
            name={lookupResult.name}
            subtitle={`@${lookupResult.username}`}
            avatar={{
              avatarKey: lookupResult.avatar_key,
              relationship: lookupResult.relationship,
            }}
            onPress={() => onOpenProfile(lookupResult.user_id)}
            trailing={
              lookupResult.relationship === 'none' ? (
                lookupResult.accepts_requests ? (
                  <PersonStateButton
                    state="add"
                    onPress={() => send(lookupResult)}
                  />
                ) : (
                  <TextV2 variant="caption" tone="secondary">
                    No acepta solicitudes
                  </TextV2>
                )
              ) : null
            }
          />
        </View>
      ) : null}

      {status === 'ready' && noResults ? (
        <View style={styles.noResults}>
          <TextV2 variant="body" tone="secondary" align="center">
            Nadie con ese nombre de usuario.
          </TextV2>
          <TextV2 variant="meta" tone="tertiary" align="center">
            Escríbelo completo, tal y como lo comparte tu amigo.
          </TextV2>
        </View>
      ) : null}

      {status === 'ready' && !searching ? (
        <View style={[styles.invite, { borderTopColor: colors.divider }]}>
          <Row
            leading={
              <Link2 size={20} color={colors.text.primary} strokeWidth={1.8} />
            }
            title="Invitar amigos"
            subtitle={inviteMessageLine(username)}
            trailing="chevron"
            onPress={onInvite}
            divider={false}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 26 },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  skeletonTexts: { flex: 1, gap: 8 },
  noResults: { alignItems: 'center', gap: 4, paddingVertical: 28 },
  invite: { borderTopWidth: 1, paddingTop: 4 },
});
