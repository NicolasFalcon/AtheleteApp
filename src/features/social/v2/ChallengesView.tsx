import { StyleSheet, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';
import {
  Button,
  ChallengeRow,
  Eyebrow,
  OfficialChallengeHero,
  PersonAvatar,
  PressableScale,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
  useToast,
  type AvatarStackItem,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  challengeViewState,
  daysLeftLabel,
  officialLeftLine,
  rowLine,
  STATE_TAG,
} from '@app/features/social/challengeModel';
import type { ChallengeSummary } from '@app/features/social/challengeTypes';
import { firstName } from '@app/features/social/socialModel';
import {
  useSocialResource,
  useSocialService,
} from '@app/features/social/useSocial';

function peopleOf(summary: ChallengeSummary): AvatarStackItem[] {
  return summary.people.flatMap((entry, index) =>
    entry.profile
      ? [
          {
            key: `${entry.profile.id}-${index}`,
            name: entry.profile.name,
            avatarKey: entry.profile.avatar_key,
            profilePhotoUrl: entry.profile.profile_photo_url,
            relationship: entry.isMe ? ('self' as const) : ('friends' as const),
          },
        ]
      : [],
  );
}

// Retos (SOCIAL_07): the official challenge as a dark event, the invitation
// with a direct action, the challenges between friends as rows and the ones
// completed recently. States: sin retos (STATE_05), cargando y error.
export function ChallengesView({
  onOpenChallenge,
  onCreate,
}: {
  onOpenChallenge: (challengeId: string) => void;
  onCreate: () => void;
}) {
  const { colors } = useThemeV2();
  const toast = useToast();
  const service = useSocialService();
  const challenges = useSocialResource(s => s.getMyChallenges());
  const data = challenges.data;

  const respond = async (summary: ChallengeSummary, accept: boolean) => {
    try {
      await service.respondChallengeInvite(summary.challenge.id, accept);
      toast.show(
        accept
          ? `Te uniste al reto de ${firstName(summary.inviter?.name ?? 'tu amigo')}`
          : 'Invitación rechazada',
        { withTabBar: true },
      );
    } catch {
      toast.show('No se pudo responder a la invitación', { tone: 'error', withTabBar: true });
    }
  };

  if (challenges.status === 'loading') {
    return (
      <SkeletonGroup>
        <Skeleton height={330} radius={30} />
        <View style={styles.skeletonRows}>
          <Skeleton width="30%" height={14} />
          <Skeleton height={20} width="70%" />
          <Skeleton height={60} radius={12} />
        </View>
      </SkeletonGroup>
    );
  }
  if (challenges.status === 'error' || !data) {
    return (
      <BlockError
        message="No pudimos cargar los retos. Tus entrenos siguen funcionando."
        onRetry={challenges.reload}
      />
    );
  }

  const now = new Date();
  const official = data.official;
  const officialState = official
    ? challengeViewState(official.challenge, official.mine, now)
    : null;

  return (
    <View style={styles.root}>
      {official ? (
        <OfficialChallengeHero
          title={official.challenge.title}
          days={daysLeftLabel(official.challenge.ends_at, official.challenge.duration_days, now)}
          joined={officialState !== 'notJoined'}
          progress={official.mine?.progress ?? 0}
          goal={official.challenge.goal}
          leftLine={officialLeftLine(official.mine?.progress ?? 0, official.challenge.goal)}
          participants={official.participants_total}
          points={official.challenge.points}
          onPress={() => onOpenChallenge(official.challenge.id)}
        />
      ) : null}

      {data.invitations.map(summary => (
        <View key={summary.challenge.id} style={styles.invite}>
          <Eyebrow>Invitación</Eyebrow>
          <View style={styles.inviteHead}>
            <PersonAvatar
              name={summary.inviter?.name ?? 'Amigo'}
              avatarKey={summary.inviter?.avatar_key}
              profilePhotoUrl={summary.inviter?.profile_photo_url}
              relationship="friends"
              size={48}
            />
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`${summary.inviter?.name ?? 'Un amigo'} te invita. ${summary.challenge.title}`}
              onPress={() => onOpenChallenge(summary.challenge.id)}
              style={styles.flex}
            >
              <TextV2 variant="body">
                <TextV2 variant="bodyStrong">{firstName(summary.inviter?.name ?? 'Un amigo')}</TextV2>
                {' te invita'}
              </TextV2>
              <TextV2 variant="cta">{summary.challenge.title}</TextV2>
            </PressableScale>
          </View>
          <View style={styles.inviteActions}>
            <Button
              label="Aceptar"
              size="md"
              onPress={() => respond(summary, true)}
              style={styles.flex}
            />
            <Button
              label="Ahora no"
              variant="secondary"
              size="md"
              onPress={() => respond(summary, false)}
              style={styles.flex}
            />
          </View>
        </View>
      ))}

      <View>
        <View style={styles.sectionHead}>
          <TextV2 variant="section">Entre amigos</TextV2>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Crear reto"
            onPress={onCreate}
            style={styles.create}
          >
            <Plus size={15} strokeWidth={2.2} color={colors.text.primary} />
            <TextV2 variant="bodyStrong">Crear reto</TextV2>
          </PressableScale>
        </View>
        {data.active.length === 0 ? (
          <View style={[styles.empty, { borderTopColor: colors.divider }]}>
            <TextV2 variant="body" tone="secondary">
              Aún no tienes retos con amigos. Crea uno y mide con quién llegas
              antes.
            </TextV2>
            <Button label="Crear reto" size="md" onPress={onCreate} />
          </View>
        ) : (
          data.active.map(summary => {
            const state = challengeViewState(summary.challenge, summary.mine, now);
            const leader = summary.leader
              ? { name: summary.leader.profile?.name ?? 'Un amigo', progress: summary.leader.progress }
              : null;
            return (
              <ChallengeRow
                key={summary.challenge.id}
                tag={STATE_TAG[state] ?? 'ENTRE AMIGOS'}
                days={daysLeftLabel(summary.challenge.ends_at, summary.challenge.duration_days, now)}
                title={summary.challenge.title}
                people={peopleOf(summary)}
                progress={summary.mine?.progress ?? 0}
                goal={summary.challenge.goal}
                line={rowLine({
                  state,
                  metric: summary.challenge.metric,
                  goal: summary.challenge.goal,
                  progress: summary.mine?.progress ?? 0,
                  leader,
                })}
                muted={state === 'expired'}
                onPress={() => onOpenChallenge(summary.challenge.id)}
              />
            );
          })
        )}
      </View>

      {data.recently_completed.length > 0 ? (
        <View>
          <Eyebrow style={styles.doneTitle}>Completados recientemente</Eyebrow>
          {data.recently_completed.map(summary => (
            <PressableScale
              key={summary.challenge.id}
              accessibilityRole="button"
              accessibilityLabel={`${summary.challenge.title}. Completado`}
              onPress={() => onOpenChallenge(summary.challenge.id)}
              style={[styles.done, { borderTopColor: colors.divider }]}
            >
              <View style={[styles.medal, { backgroundColor: colors.cta.primary }]}>
                <Check size={14} strokeWidth={3} color={colors.cta.primaryText} />
              </View>
              <View style={styles.flex}>
                <TextV2 variant="bodyStrong">{summary.challenge.title}</TextV2>
                <TextV2 variant="meta" tone="secondary">
                  {summary.mine?.final_rank_among_friends === 1
                    ? 'Primero de tus amigos en terminar'
                    : 'Terminado entre amigos'}
                </TextV2>
              </View>
              <TextV2 variant="eyebrow" tone="secondary">
                Completado
              </TextV2>
            </PressableScale>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { gap: 34 },
  skeletonRows: { gap: 14, marginTop: 28 },
  invite: { gap: 12 },
  inviteHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  inviteActions: { flexDirection: 'row', gap: 8, paddingLeft: 62 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: 6,
  },
  create: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  empty: { borderTopWidth: 1, paddingTop: 18, gap: 14, alignItems: 'flex-start' },
  doneTitle: { paddingBottom: 6 },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  medal: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
