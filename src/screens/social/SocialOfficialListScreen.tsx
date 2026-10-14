import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Check } from 'lucide-react-native';
import {
  HexMedal,
  PressableScale,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import {
  bigFigure,
  completionCondition,
  composeOfficialBlocks,
  daysLeftLabel,
  rewardLine,
  startDateParts,
} from '@app/features/social/challengeModel';
import type { ChallengeSummary } from '@app/features/social/challengeTypes';
import { officialBadgeIcon } from '@app/features/social/officialBadge';
import { formatThousands } from '@app/features/social/postModel';
import { useSocialResource, useSocialService } from '@app/features/social/useSocial';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'SocialOfficialList'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];
// Photo of reserve while a challenge has no cover (black and white baked in).
const FALLBACK_COVER = require('@app/assets/v2/photos/home/reto-overhead.jpg');
const INK = '#141312';

type Card = {
  summary: ChallengeSummary;
  id: string;
  title: string;
  big: string;
  unit: string;
  description: string | null;
  reward: string | null;
  condition: string;
  badgeIcon: string | null;
  days: string;
  who: string | null;
  joined: boolean;
  cover: { uri: string } | null;
  start: { mon: string; day: string } | null;
};

function cardOf(summary: ChallengeSummary, now: Date): Card {
  const { challenge, meta } = summary;
  const figure = bigFigure({
    metric: challenge.metric,
    goal: challenge.goal,
    title: challenge.title,
    exerciseName: meta?.exerciseName ?? null,
  });
  const total = summary.participants_total;
  return {
    summary,
    id: challenge.id,
    title: challenge.title,
    big: figure.big,
    unit: figure.unit,
    description: meta?.description ?? null,
    reward: rewardLine(challenge.points, meta?.badge?.title ?? null),
    condition: completionCondition({
      metric: challenge.metric,
      goal: challenge.goal,
      exerciseName: meta?.exerciseName ?? null,
      sport: meta?.sport,
    }),
    badgeIcon: meta?.badge?.icon ?? null,
    days: daysLeftLabel(challenge.ends_at, challenge.duration_days, now),
    who: total !== null && total > 0 ? `${formatThousands(total)} atletas` : null,
    joined: summary.mine?.status === 'active' || summary.mine?.status === 'completed',
    cover: meta?.coverUrl ? { uri: meta.coverUrl } : null,
    start: startDateParts(challenge.starts_at),
  };
}

// A cover in black and white. The signed photo of the challenge, or the app's
// own while it has none.
function Photo({ cover }: { cover: Card['cover'] }) {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { filter: [{ grayscale: 1 }, { contrast: 1.1 }, { brightness: 0.78 }] },
      ]}
    >
      <Image
        source={cover ?? FALLBACK_COVER}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function Reward({ card, compact = false }: { card: Card; compact?: boolean }) {
  if (!card.reward) {
    return null;
  }
  const size = compact ? 32 : 40;
  return (
    <View style={styles.rewardRow}>
      <HexMedal icon={officialBadgeIcon(card.badgeIcon)} size={size + 8} accessibilityLabel="Badge del reto" />
      <View style={styles.flex}>
        <TextV2 style={compact ? styles.rewardSmall : styles.rewardText} numberOfLines={2}>
          {card.reward}
        </TextV2>
        {compact ? null : (
          <TextV2 style={styles.rewardCond} numberOfLines={2}>
            {card.condition}
          </TextV2>
        )}
      </View>
    </View>
  );
}

// "Unirme" / "Dentro" (and "Avisarme" / "Te avisaremos" before it starts).
function JoinButton({
  label,
  on,
  icon,
  dark = false,
  size = 40,
  disabled,
  onPress,
}: {
  label: string;
  on: boolean;
  icon?: 'bell' | 'check';
  dark?: boolean;
  size?: 36 | 40 | 44;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();
  // On a photo: white when it invites, glass once I am in. On the page: ink
  // when it invites, outlined once I am in.
  const bg = dark ? (on ? 'rgba(255,255,255,.14)' : '#FFFFFF') : on ? 'transparent' : colors.cta.primary;
  const fg = dark ? (on ? '#FFFFFF' : INK) : on ? colors.text.primary : colors.cta.primaryText;
  const Icon = icon === 'bell' ? Bell : icon === 'check' ? Check : null;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        { height: size, backgroundColor: bg },
        !dark && on ? { boxShadow: `inset 0 0 0 1px ${colors.divider}` } : null,
      ]}
    >
      {Icon ? <Icon size={14} color={fg} strokeWidth={2.2} /> : null}
      <TextV2 style={[styles.buttonText, { color: fg, fontSize: size === 44 ? 15 : size === 40 ? 14 : 13 }]}>
        {label}
      </TextV2>
    </PressableScale>
  );
}

// Retos oficiales (SOCIAL_15): the featured challenge at 580 pt, "Más retos
// para este mes" in alternating compositions, and "Lo que viene" as a
// carousel. Data: get_my_challenges (shared cache with Inicio); joining is
// join_official_challenge, also before a challenge starts (the server tells
// the people who signed up when it begins).
export function SocialOfficialListScreen({ navigation }: Props) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const service = useSocialService();
  const challenges = useSocialResource('getMyChallenges', s => s.getMyChallenges());
  const [busy, setBusy] = useState<string | null>(null);

  const back = () => safeGoBack(navigation, BACK_FALLBACKS);
  const now = new Date();
  const list = (challenges.data?.officialList ?? []).map(item => cardOf(item, now));
  const upcoming = (challenges.data?.official_upcoming ?? []).map(item => cardOf(item, now));
  const [featured, ...more] = list;
  const blocks = composeOfficialBlocks(more);

  const open = (card: Card) => navigation.navigate(APP_ROUTES.SocialChallenge, { challengeId: card.id });

  const join = async (card: Card) => {
    if (busy) {
      return;
    }
    setBusy(card.id);
    try {
      const result = await service.joinOfficialChallenge(card.id);
      if (result.ok) {
        toast.show(`Te uniste a ${card.title}`);
      } else {
        toast.show(
          result.error === 'not_available'
            ? 'Este reto ya no está disponible.'
            : 'No pudimos unirte. Inténtalo de nuevo.',
          { tone: 'error' },
        );
        challenges.reload();
      }
    } catch {
      toast.show('No pudimos unirte. Revisa tu conexión.', { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  // Before the start, signing up is "Avisarme"; tapping again takes me out.
  const toggleUpcoming = async (card: Card) => {
    if (busy) {
      return;
    }
    setBusy(card.id);
    try {
      if (card.joined) {
        const left = await service.leaveChallenge(card.id);
        if (!left) {
          challenges.reload();
        }
      } else {
        const result = await service.joinOfficialChallenge(card.id);
        if (result.ok) {
          toast.show('Te avisaremos cuando empiece');
        } else {
          toast.show('No pudimos apuntarte. Inténtalo de nuevo.', { tone: 'error' });
          challenges.reload();
        }
      }
    } catch {
      toast.show('No pudimos completar la acción. Revisa tu conexión.', { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        {featured ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${featured.title}. ${featured.joined ? 'Ver progreso' : 'Ver reto'}`}
            onPress={() => open(featured)}
            style={styles.hero}
          >
            <Photo cover={featured.cover} />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(20,19,18,.55)', 'rgba(20,19,18,0)', 'rgba(20,19,18,.15)', 'rgba(20,19,18,.94)']}
              locations={[0, 0.28, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroBottom}>
              <View style={styles.pill}>
                <View style={[styles.pillDot, { backgroundColor: colors.ember.base }]} />
                <TextV2 style={styles.pillText}>OFICIAL ATHELETE · RETO DE LA SEMANA</TextV2>
              </View>
              <View>
                <TextV2 style={styles.heroBig} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                  {featured.big}
                </TextV2>
                <TextV2 style={styles.heroUnit} numberOfLines={2}>
                  {featured.unit}
                </TextV2>
              </View>
              <Reward card={featured} />
              <View style={styles.heroFoot}>
                <View style={styles.flex}>
                  <TextV2 style={styles.heroDays}>{featured.days}</TextV2>
                  {featured.who ? <TextV2 style={styles.heroWho}>{featured.who}</TextV2> : null}
                </View>
                <JoinButton
                  dark
                  size={44}
                  label={featured.joined ? 'Ver progreso' : 'Unirme'}
                  on={false}
                  disabled={busy === featured.id}
                  onPress={() => (featured.joined ? open(featured) : join(featured).catch(() => {}))}
                />
              </View>
            </View>
          </PressableScale>
        ) : (
          <View style={[styles.emptyHero, { paddingTop: insets.top + 90 }]}>
            {challenges.status === 'error' ? (
              <BlockError message="No pudimos cargar los retos." onRetry={challenges.reload} />
            ) : challenges.status === 'ready' ? (
              <>
                <TextV2 variant="title22">Aún no hay un reto oficial en marcha</TextV2>
                <TextV2 variant="body" tone="secondary">
                  Cuando empiece uno lo verás aquí, con su recompensa.
                </TextV2>
              </>
            ) : null}
          </View>
        )}

        {blocks.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.headText}>
              <TextV2 style={[styles.eyebrow, { color: colors.text.secondary }]}>EN MARCHA</TextV2>
              <TextV2 style={styles.h2}>Más retos para este mes.</TextV2>
            </View>
            {blocks.map(block => {
              if (block.kind === 'wide') {
                const card = cardOf(block.item.summary, now);
                return (
                  <PressableScale
                    key={card.id}
                    accessibilityRole="button"
                    onPress={() => open(card)}
                    style={styles.wide}
                  >
                    <Photo cover={card.cover} />
                    <LinearGradient
                      pointerEvents="none"
                      colors={['rgba(20,19,18,.1)', 'rgba(20,19,18,.2)', 'rgba(20,19,18,.92)']}
                      locations={[0, 0.4, 1]}
                      style={StyleSheet.absoluteFill}
                    />
                    <TextV2 style={styles.wideDays}>{card.days}</TextV2>
                    <View style={styles.wideBottom}>
                      <View style={styles.bigRow}>
                        <TextV2 style={styles.wideBig} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                          {card.big}
                        </TextV2>
                        <TextV2 style={styles.wideUnit}>{card.unit}</TextV2>
                      </View>
                      <TextV2 style={styles.wideSub}>{card.title}</TextV2>
                      {card.description ? (
                        <TextV2 style={styles.wideDesc} numberOfLines={3}>
                          {card.description}
                        </TextV2>
                      ) : null}
                      <Reward card={card} compact />
                      <View style={styles.cardFoot}>
                        <TextV2 style={styles.cardWho}>{card.who ?? ''}</TextV2>
                        <JoinButton
                          dark
                          label={card.joined ? 'Dentro' : 'Unirme'}
                          on={card.joined}
                          disabled={busy === card.id}
                          onPress={() => (card.joined ? open(card) : join(card).catch(() => {}))}
                        />
                      </View>
                    </View>
                  </PressableScale>
                );
              }
              const first = cardOf(block.item.summary, now);
              const second = block.other ? cardOf(block.other.summary, now) : null;
              return (
                <View key={first.id} style={styles.pairBlock}>
                  {[first, second].flatMap(card => (card ? [card] : [])).map(card => (
                    <View key={card.id} style={styles.pairRow}>
                      <PressableScale accessibilityRole="button" onPress={() => open(card)} style={styles.pairPhoto}>
                        <Photo cover={card.cover} />
                        <LinearGradient
                          pointerEvents="none"
                          colors={['rgba(20,19,18,0)', 'rgba(20,19,18,.88)']}
                          locations={[0.3, 1]}
                          style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.pairFigure}>
                          <TextV2 style={styles.pairBig} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            {card.big}
                          </TextV2>
                          <TextV2 style={styles.pairUnit}>{card.unit}</TextV2>
                        </View>
                      </PressableScale>
                      <View style={styles.pairText}>
                        <View style={styles.gap8}>
                          <TextV2 style={[styles.pairDays, { color: colors.text.secondary }]}>{card.days}</TextV2>
                          <TextV2 style={styles.pairSub}>{card.title}</TextV2>
                          {card.description ? (
                            <TextV2 style={[styles.pairDesc, { color: colors.text.secondary }]} numberOfLines={4}>
                              {card.description}
                            </TextV2>
                          ) : null}
                        </View>
                        <View style={styles.gap8}>
                          {card.reward ? (
                            <View style={styles.pairReward}>
                              <HexMedal icon={officialBadgeIcon(card.badgeIcon)} size={44} accessibilityLabel="Badge del reto" />
                              <TextV2 style={styles.pairRewardText}>{card.reward}</TextV2>
                            </View>
                          ) : null}
                          <TextV2 style={[styles.pairWho, { color: colors.text.secondary }]}>{card.who ?? ''}</TextV2>
                          <JoinButton
                            label={card.joined ? 'Dentro' : 'Unirme'}
                            on={card.joined}
                            disabled={busy === card.id}
                            onPress={() => (card.joined ? open(card) : join(card).catch(() => {}))}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        ) : null}

        {upcoming.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.headText}>
              <TextV2 style={[styles.eyebrow, { color: colors.text.secondary }]}>PRÓXIMAMENTE</TextV2>
              <TextV2 style={styles.h2}>Lo que viene.</TextV2>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={248 + 12}
              decelerationRate="fast"
              style={{ marginHorizontal: -20 }}
              contentContainerStyle={styles.carousel}
            >
              {upcoming.map(card => (
                <View key={card.id} style={styles.next}>
                  <Photo cover={card.cover} />
                  <LinearGradient
                    pointerEvents="none"
                    colors={['rgba(20,19,18,.35)', 'rgba(20,19,18,0)', 'rgba(20,19,18,.9)']}
                    locations={[0, 0.35, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  {card.start ? (
                    <View style={styles.nextDate}>
                      <TextV2 style={styles.nextMon}>{card.start.mon}</TextV2>
                      <TextV2 style={styles.nextDay}>{card.start.day}</TextV2>
                    </View>
                  ) : null}
                  <View style={styles.nextBottom}>
                    <TextV2 style={styles.nextTitle} numberOfLines={2}>
                      {card.title}
                    </TextV2>
                    {card.description ? (
                      <TextV2 style={styles.nextDesc} numberOfLines={2}>
                        {card.description}
                      </TextV2>
                    ) : null}
                    <Reward card={card} compact />
                    <View style={styles.nextFoot}>
                      <JoinButton
                        dark
                        size={36}
                        label={card.joined ? 'Te avisaremos' : 'Avisarme'}
                        on={card.joined}
                        icon={card.joined ? 'check' : 'bell'}
                        disabled={busy === card.id}
                        onPress={() => {
                          toggleUpcoming(card).catch(() => {});
                        }}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={back}
        style={[styles.back, { top: insets.top + 8, left: Math.max(16, (width - 393) / 2 + 16) }]}
      >
        <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  gap8: { gap: 8 },
  hero: { height: 580, backgroundColor: INK, overflow: 'hidden' },
  heroBottom: { position: 'absolute', left: 20, right: 20, bottom: 26, gap: 14 },
  pill: {
    alignSelf: 'flex-start',
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.9, color: '#FFFFFF' },
  heroBig: { fontSize: 112, lineHeight: 100, fontWeight: '700', letterSpacing: -6.7, color: '#FFFFFF' },
  heroUnit: { fontSize: 34, lineHeight: 36, fontWeight: '700', letterSpacing: -0.85, color: '#FFFFFF' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  rewardSmall: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  rewardCond: { fontSize: 13, color: '#C9C6C0' },
  heroFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 4 },
  heroDays: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  heroWho: { fontSize: 13, color: '#C9C6C0' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  buttonText: { fontWeight: '600' },
  emptyHero: { paddingHorizontal: 20, paddingBottom: 30, gap: 8 },
  section: { paddingHorizontal: 20, paddingTop: 40, gap: 20 },
  headText: { gap: 6, paddingBottom: 6 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.1 },
  h2: { fontSize: 28, lineHeight: 31, fontWeight: '600', letterSpacing: -0.56 },
  wide: { height: 470, borderRadius: 28, overflow: 'hidden', backgroundColor: INK },
  wideDays: { position: 'absolute', left: 20, top: 20, fontSize: 13, fontWeight: '600', color: '#E4E2DD' },
  wideBottom: { position: 'absolute', left: 20, right: 20, bottom: 20, gap: 12 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  wideBig: { fontSize: 80, lineHeight: 72, fontWeight: '700', letterSpacing: -4, color: '#FFFFFF', flexShrink: 1 },
  wideUnit: { fontSize: 28, fontWeight: '700', letterSpacing: -0.56, color: '#FFFFFF' },
  wideSub: { fontSize: 20, lineHeight: 24, fontWeight: '600', color: '#FFFFFF' },
  wideDesc: { fontSize: 14, lineHeight: 20, color: '#C9C6C0', maxWidth: 290 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 4 },
  cardWho: { fontSize: 13, color: '#C9C6C0' },
  pairBlock: { gap: 12 },
  pairRow: { flexDirection: 'row', gap: 12, height: 360 },
  pairPhoto: { flex: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: INK },
  pairFigure: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  pairBig: { fontSize: 72, lineHeight: 64, fontWeight: '700', letterSpacing: -3.6, color: '#FFFFFF' },
  pairUnit: { fontSize: 18, fontWeight: '700', letterSpacing: -0.18, color: '#FFFFFF' },
  pairText: { flex: 1, justifyContent: 'space-between', paddingTop: 6, paddingBottom: 4 },
  pairDays: { fontSize: 13, fontWeight: '600' },
  pairSub: { fontSize: 20, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2 },
  pairDesc: { fontSize: 14, lineHeight: 20 },
  pairReward: { gap: 6 },
  pairRewardText: { fontSize: 12, fontWeight: '600' },
  pairWho: { fontSize: 12 },
  carousel: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  next: { width: 248, height: 372, borderRadius: 26, overflow: 'hidden', backgroundColor: INK },
  nextDate: { position: 'absolute', left: 18, top: 18 },
  nextMon: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: '#C9C6C0' },
  nextDay: { fontSize: 44, lineHeight: 46, fontWeight: '700', letterSpacing: -1.7, color: '#FFFFFF' },
  nextBottom: { position: 'absolute', left: 18, right: 18, bottom: 18, gap: 6 },
  nextTitle: { fontSize: 20, lineHeight: 24, fontWeight: '600', color: '#FFFFFF' },
  nextDesc: { fontSize: 13, color: '#C9C6C0' },
  nextFoot: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 },
  back: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20,19,18,.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
