import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronsUp, MoreHorizontal } from 'lucide-react-native';
import {
  BackButton,
  Button,
  Eyebrow,
  GlassHeader,
  GlassSurface,
  HexMedal,
  IconButton,
  OfficialBadge,
  PersonAvatar,
  RankBars,
  RetiredContent,
  Sheet,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { APP_ROUTES, ROOT_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import {
  MANUAL_ADDS,
  challengeActions,
  challengeViewState,
  daysLeftLabel,
  distanceLine,
  officialLeftLine,
  progressPct,
  rankBoard,
  weekBarHeight,
} from '@app/features/social/challengeModel';
import { formatThousands, timeAgo } from '@app/features/social/postModel';
import { firstName } from '@app/features/social/socialModel';
import { useSocialResource, useSocialService } from '@app/features/social/useSocial';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialChallenge'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];
const COVER = require('@app/assets/v2/photos/overhead.jpg');
const WEEKDAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

// Detalle del reto: el oficial como escena oscura (SOCIAL_08), los retos entre
// amigos y la invitación sobre fondo claro (SOCIAL_09 / SOCIAL_10). Ranking
// entre amigos, progreso, aportes y actividad; aceptar, rechazar y salir.
export function SocialChallengeScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useSocialService();
  const { challengeId, devSheet } = route.params;
  const board = useSocialResource('getChallengeBoard', s => s.getChallengeBoard(challengeId), [challengeId]);
  const [sheet, setSheet] = useState<'leave' | 'cancel' | null>(devSheet ?? null);
  const [busy, setBusy] = useState(false);
  const data = board.data;

  const back = () => safeGoBack(navigation, BACK_FALLBACKS);
  const now = new Date();
  const state = data ? challengeViewState(data.challenge, data.mine, now) : 'notJoined';
  const isCreator = Boolean(data && data.board.some(entry => entry.isMe) && data.challenge.kind === 'friends' && data.challenge.creator_id !== null && data.challenge.creator_id === data.board.find(entry => entry.isMe)?.user_id);
  const actions = data
    ? challengeActions(state, data.challenge, isCreator)
    : null;
  const ranked = data ? rankBoard(data.board, data.challenge.goal) : [];
  const line = data
    ? distanceLine(ranked, data.challenge.goal, data.challenge.metric, state === 'waiting')
    : '';

  const run = async (task: () => Promise<void>, failure = 'No se pudo completar la acción') => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await task();
    } catch {
      toast.show(failure, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const accept = () =>
    run(async () => {
      await service.respondChallengeInvite(challengeId, true);
      toast.show(`Te uniste al reto de ${firstName(data?.inviter?.name ?? 'tu amigo')}`);
    });
  const decline = () =>
    run(async () => {
      await service.respondChallengeInvite(challengeId, false);
      back();
    });
  const leave = () =>
    run(async () => {
      await service.leaveChallenge(challengeId);
      setSheet(null);
      toast.show('Saliste del reto');
      back();
    });
  const cancel = () =>
    run(async () => {
      await service.cancelFriendChallenge(challengeId);
      setSheet(null);
      toast.show('Reto cancelado');
      back();
    });
  const join = () =>
    run(async () => {
      await service.joinOfficialChallenge(challengeId);
      toast.show('Te uniste al reto');
    });
  const add = (amount: number) =>
    run(async () => {
      const result = await service.addManualContribution(challengeId, amount);
      if (!result.ok) {
        toast.show(
          result.error === 'daily_limit'
            ? 'Has llegado al máximo de registros de hoy'
            : result.error === 'amount_out_of_range'
            ? 'Cantidad no válida'
            : 'Este reto no admite registro manual',
          { tone: 'error' },
        );
      } else if (data && result.progress >= data.challenge.goal) {
        navigation.replace(APP_ROUTES.SocialChallengeDone, { challengeId });
      }
    });
  const share = () => navigation.navigate(APP_ROUTES.SocialCompose, { attach: 'challenge', sourceId: challengeId });
  const startWorkout = () =>
    navigation.navigate(ROOT_ROUTES.MainTabs, { screen: TAB_ROUTES.Workouts });

  const loading = board.status === 'loading';
  const failed = board.status === 'error';

  // ── Official challenge: dark scene ──
  if (data && data.challenge.kind === 'official') {
    const challenge = data.challenge;
    const joined = state !== 'notJoined';
    const todayIndex = (now.getDay() + 6) % 7;
    return (
      <SceneScope>
        <View style={[styles.screen, { backgroundColor: '#141312' }]}>
          <StatusBarV2 style="light" />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 190 }}>
            <View style={styles.officialHero}>
              <Image source={COVER} resizeMode="cover" style={StyleSheet.absoluteFill} />
              <LinearGradient
                colors={['rgba(20,19,18,.45)', 'rgba(20,19,18,.05)', '#141312']}
                locations={[0, 0.35, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.heroBar, { top: insets.top + 8 }]}>
                <BackButton variant="glass" onPress={back} />
                {actions?.canLeave ? (
                  <IconButton
                    icon={MoreHorizontal}
                    variant="glass"
                    accessibilityLabel="Más opciones del reto"
                    onPress={() => setSheet('leave')}
                  />
                ) : null}
              </View>
              <View style={styles.officialTexts}>
                <OfficialBadge label="OFICIAL ATHELETE · RETO DE LA SEMANA" />
                <TextV2 style={styles.officialTitle}>{challenge.title}</TextV2>
                <TextV2 variant="meta" color="#A8A6A1">
                  {`${data.participants_total ? `${formatThousands(data.participants_total)} atletas participando · ` : ''}${daysLeftLabel(challenge.ends_at, challenge.duration_days, now)}`}
                </TextV2>
              </View>
            </View>

            <View style={[styles.officialBody, { paddingHorizontal: layout.gutter }]}>
              {joined ? (
                <>
                  <View style={styles.officialFigure}>
                    <View style={styles.bigRow}>
                      <TextV2 style={styles.bigNumber}>{String(data.mine?.progress ?? 0)}</TextV2>
                      <TextV2 variant="section" color="#8C8A85">{` / ${challenge.goal}`}</TextV2>
                    </View>
                    <View style={[styles.bar8, { backgroundColor: 'rgba(255,255,255,.12)' }]}>
                      <View
                        style={[
                          styles.fill,
                          { width: `${progressPct(data.mine?.progress ?? 0, challenge.goal)}%`, backgroundColor: colors.ember.base },
                        ]}
                      />
                    </View>
                    <TextV2 variant="bodyL" color="#D8D6D1">
                      {officialLeftLine(data.mine?.progress ?? 0, challenge.goal)}
                    </TextV2>
                  </View>
                  {data.week ? (
                    <View style={styles.week}>
                      {data.week.map((value, index) => {
                        const today = index === todayIndex;
                        return (
                          <View key={WEEKDAYS[index]} style={styles.weekDay}>
                            <View
                              style={[
                                styles.weekBar,
                                {
                                  height: weekBarHeight(value),
                                  backgroundColor:
                                    value === null
                                      ? 'transparent'
                                      : today
                                      ? colors.ember.base
                                      : value === 0
                                      ? 'rgba(255,255,255,.1)'
                                      : 'rgba(255,255,255,.34)',
                                  borderWidth: value === null ? 1 : 0,
                                  borderColor: 'rgba(255,255,255,.14)',
                                },
                              ]}
                            />
                            <TextV2
                              variant="caption"
                              color={today ? '#FFFFFF' : '#8C8A85'}
                              style={today ? styles.todayLabel : undefined}
                            >
                              {WEEKDAYS[index]}
                            </TextV2>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </>
              ) : (
                <TextV2 variant="bodyL" color="#D8D6D1">
                  Suma 100 dominadas durante la semana, en tantas series y días como quieras. Cuentan solas desde tus entrenos.
                </TextV2>
              )}

              <View>
                <Eyebrow style={styles.friendsTitle}>Tus amigos en este reto</Eyebrow>
                <RankBars entries={ranked} goal={challenge.goal} variant="list" />
                {line ? (
                  <TextV2 variant="meta" color="#D8D6D1" style={styles.friendLine}>
                    {line}
                  </TextV2>
                ) : null}
              </View>

              <View style={styles.reward}>
                <HexMedal icon={ChevronsUp} size={58} />
                <View style={styles.flex}>
                  <TextV2 variant="bodyStrong" color="#FFFFFF">
                    {`+${challenge.points} puntos · Badge Semana de tracción`}
                  </TextV2>
                  <TextV2 variant="meta" color="#A8A6A1">
                    Al completar las {challenge.goal}
                  </TextV2>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.officialFooter, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            {actions?.canAddManual ? (
              <View style={styles.adds}>
                <TextV2 variant="caption" color="#8C8A85" align="center">
                  Registra una serie hecha fuera de Athelete
                </TextV2>
                <View style={styles.addRow}>
                  {MANUAL_ADDS.map(amount => (
                    <Button
                      key={amount}
                      label={`+${amount}`}
                      disabled={busy}
                      onPress={() => add(amount)}
                      style={styles.flex}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            {actions?.canJoin ? <Button label="Unirme al reto" loading={busy} onPress={join} /> : null}
            {actions?.canShare ? <Button label="Compartir" onPress={share} /> : null}
          </View>

          <LeaveSheet sheet={sheet} busy={busy} onClose={() => setSheet(null)} onLeave={leave} onCancel={cancel} />
        </View>
      </SceneScope>
    );
  }

  // ── Challenge between friends: light ──
  const challenge = data?.challenge;
  const tag =
    state === 'invited' ? 'INVITACIÓN' : state === 'expired' ? 'EXPIRADO' : 'ENTRE AMIGOS';
  const sub =
    challenge && data
      ? `${
          state === 'waiting' || state === 'invited'
            ? `${challenge.duration_days} días`
            : daysLeftLabel(challenge.ends_at, challenge.duration_days, now)
        } · ${data.board.length} participantes · acumulativo`
      : '';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title={data ? tag : undefined}
        left={<BackButton onPress={back} />}
        right={
          actions?.canLeave || actions?.canCancel ? (
            <IconButton
              icon={MoreHorizontal}
              accessibilityLabel="Más opciones del reto"
              onPress={() => setSheet(actions.canCancel ? 'cancel' : 'leave')}
            />
          ) : undefined
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 14,
          paddingBottom: 170,
          gap: 28,
        }}
      >
        {loading ? (
          <SkeletonGroup>
            <Skeleton width="70%" height={30} />
            <Skeleton width="50%" height={14} />
            <Skeleton height={160} radius={16} />
          </SkeletonGroup>
        ) : null}
        {failed ? (
          <BlockError message="No pudimos cargar el reto." onRetry={board.reload} />
        ) : null}
        {board.status === 'ready' && !data ? (
          <RetiredContent
            title="Reto no disponible"
            body="Ya no existe o no tienes acceso a él."
          />
        ) : null}

        {data && challenge ? (
          <>
            <View style={styles.titles}>
              <TextV2 style={styles.friendsTitleText}>{challenge.title}</TextV2>
              <TextV2 variant="meta" tone="secondary">
                {sub}
              </TextV2>
            </View>

            {state === 'invited' ? (
              <View style={[styles.inviteCard, { backgroundColor: colors.surface.muted }]}>
                <PersonAvatar
                  name={data.inviter?.name ?? 'Amigo'}
                  avatarKey={data.inviter?.avatar_key}
                  profilePhotoUrl={data.inviter?.profile_photo_url}
                  relationship="friends"
                  size={44}
                />
                <TextV2 variant="body" style={styles.flex}>
                  <TextV2 variant="bodyStrong">{firstName(data.inviter?.name ?? 'Un amigo')}</TextV2>
                  {' te invita a sumar juntos. Se cuenta solo desde tus sesiones.'}
                </TextV2>
              </View>
            ) : null}

            {state === 'expired' ? (
              <RetiredContent
                title="Este reto expiró"
                body="Nadie aceptó a tiempo, así que no llegó a empezar. Puedes crear otro."
              />
            ) : null}
            {state === 'cancelled' ? (
              <RetiredContent title="Reto cancelado" body="El creador lo canceló antes de empezar." />
            ) : null}

            <RankBars entries={ranked} goal={challenge.goal} />
            {line && state !== 'expired' && state !== 'cancelled' ? (
              <TextV2 variant="bodyL" style={styles.line}>
                {line}
              </TextV2>
            ) : null}

            {data.activity.length > 0 ? (
              <View>
                <Eyebrow style={styles.activityTitle}>Actividad reciente</Eyebrow>
                {data.activity.map(item => (
                  <View key={item.id} style={[styles.activityRow, { borderTopColor: colors.divider }]}>
                    <PersonAvatar
                      name={item.isMe ? 'Tú' : item.profile?.name ?? 'Amigo'}
                      avatarKey={item.profile?.avatar_key}
                      profilePhotoUrl={item.profile?.profile_photo_url}
                      relationship={item.isMe ? 'self' : 'friends'}
                      size={30}
                    />
                    <TextV2 variant="meta" style={styles.flex}>
                      <TextV2 variant="metaStrong">
                        {item.isMe ? 'Tú' : firstName(item.profile?.name ?? 'Amigo')}
                      </TextV2>
                      {` · ${item.text}`}
                    </TextV2>
                    <TextV2 variant="caption" tone="tertiary">
                      {timeAgo(item.created_at)}
                    </TextV2>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {data ? (
        <GlassSurface
          kind="nav"
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8, borderTopColor: colors.divider }]}
        >
          {actions?.canAccept ? (
            <View style={styles.footerRow}>
              <Button label="Ahora no" variant="secondary" size="lg" disabled={busy} onPress={decline} style={styles.flex} />
              <Button label="Unirme" size="lg" loading={busy} onPress={accept} style={styles.flexMore} />
            </View>
          ) : null}
          {state === 'active' ? <Button label="Empezar un entreno" onPress={startWorkout} /> : null}
          {actions?.canShare ? <Button label="Compartir" onPress={share} /> : null}
          {state === 'expired' || state === 'cancelled' ? (
            <Button label="Crear otro reto" onPress={() => navigation.replace(APP_ROUTES.SocialCreateChallenge, {})} />
          ) : null}
        </GlassSurface>
      ) : null}

      <LeaveSheet sheet={sheet} busy={busy} onClose={() => setSheet(null)} onLeave={leave} onCancel={cancel} />
    </View>
  );
}

function LeaveSheet({
  sheet,
  busy,
  onClose,
  onLeave,
  onCancel,
}: {
  sheet: 'leave' | 'cancel' | null;
  busy: boolean;
  onClose: () => void;
  onLeave: () => void;
  onCancel: () => void;
}) {
  const cancel = sheet === 'cancel';
  return (
    <Sheet
      open={sheet !== null}
      onClose={onClose}
      title={cancel ? '¿Cancelar el reto?' : '¿Salir del reto?'}
      footer={
        <Button
          label={cancel ? 'Cancelar reto' : 'Salir del reto'}
          loading={busy}
          onPress={cancel ? onCancel : onLeave}
          style={styles.flex}
        />
      }
    >
      <TextV2 variant="body" tone="secondary">
        {cancel
          ? 'Nadie ha aceptado todavía. Si lo cancelas, las invitaciones dejan de valer.'
          : 'Dejarás de aparecer en el ranking y tu progreso en este reto no se cuenta. Podrás volver si te invitan de nuevo.'}
      </TextV2>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  flexMore: { flex: 1.4 },
  officialHero: { height: 420, overflow: 'hidden' },
  heroBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  officialTexts: { position: 'absolute', left: 20, right: 20, bottom: 10, gap: 10 },
  officialTitle: { fontSize: 34, fontWeight: '700', letterSpacing: -0.7, lineHeight: 36, color: '#FFFFFF' },
  officialBody: { paddingTop: 22, gap: 32 },
  officialFigure: { gap: 12 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline' },
  bigNumber: { fontSize: 56, fontWeight: '600', letterSpacing: -1.7, lineHeight: 58, color: '#FFFFFF' },
  bar8: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  week: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', height: 72 },
  weekDay: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' },
  weekBar: { width: '100%', borderRadius: 5 },
  todayLabel: { fontWeight: '700' },
  friendsTitle: { paddingBottom: 8 },
  friendLine: { paddingTop: 10 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.06)' },
  officialFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: 'rgba(20,19,18,.84)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,.08)',
    gap: 8,
  },
  adds: { gap: 8 },
  addRow: { flexDirection: 'row', gap: 8 },
  titles: { gap: 6 },
  friendsTitleText: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4, lineHeight: 31 },
  inviteCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22 },
  line: { fontWeight: '500' },
  activityTitle: { paddingBottom: 6 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 0.5 },
  footerRow: { flexDirection: 'row', gap: 10 },
});
