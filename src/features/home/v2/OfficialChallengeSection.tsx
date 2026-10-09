import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { ArrowRight, ChevronsUp } from 'lucide-react-native';
import { HexMedal, PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { formatThousands } from '@app/features/home/homePriority';
import type { HomeChallengeCard } from '@app/features/home/homeChallengeSection';

// Cover of the official challenge: an app photo while the real `cover_path`
// is not wired. TODO(fase-4): `social_challenges.cover_path` and the final
// artwork of the badges (placeholder hexagon with chevrons).
const COVER = require('@app/assets/v2/photos/overhead.jpg');

const INK = '#141312';

export type OfficialChallengeSectionProps = {
  card: HomeChallengeCard;
  joining: boolean;
  onPress: () => void;
  onJoin: () => void;
};

// Inicio · "Reto de la semana" (v2.12 §22.3): full width, 420 pt, no radius
// or border. Joined: progress as the protagonist. Not joined: invitation to
// the featured official challenge. Dark in both themes.
export function OfficialChallengeSection({
  card,
  joining,
  onPress,
  onJoin,
}: OfficialChallengeSectionProps) {
  const { colors } = useThemeV2();
  const joined = card.state === 'joined';
  const reward = card.reward;
  const athletes =
    card.participants !== null && card.participants > 0
      ? `${formatThousands(card.participants)} atletas dentro`
      : null;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Reto oficial. ${card.title}. ${
        joined ? `${card.progress} de ${card.goal}` : 'Ver reto'
      }`}
      onPress={onPress}
      style={styles.section}
    >
      <Image source={COVER} resizeMode="cover" style={StyleSheet.absoluteFill} />
      {/* Black and white photo: iOS has no grayscale filter (D-29), so a dark
          layer stands in for "brightness .66". */}
      <View style={[StyleSheet.absoluteFill, styles.dim]} />
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(20,19,18,.55)',
          'rgba(20,19,18,.05)',
          'rgba(20,19,18,.35)',
          'rgba(20,19,18,.92)',
        ]}
        locations={[0, 0.32, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="retoGlow" cx="100%" cy="82%" r="62%">
            <Stop offset="0" stopColor="#FF5B1F" stopOpacity={0.3} />
            <Stop offset="1" stopColor="#FF5B1F" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="100%" cy="82%" r="100%" fill="url(#retoGlow)" />
      </Svg>

      <View style={styles.top}>
        <View style={styles.eyebrowRow}>
          <View style={[styles.dot, { backgroundColor: colors.ember.base }]} />
          <TextV2 style={styles.eyebrow}>
            {joined ? 'RETO DE LA SEMANA' : 'RETO OFICIAL'}
          </TextV2>
        </View>
        <TextV2 variant="body" color="#E4E2DD" style={styles.days}>
          {card.daysLabel}
        </TextV2>
      </View>

      {reward ? (
        <View style={styles.reward}>
          {reward.badgeId ? (
            <HexMedal icon={ChevronsUp} size={56} accessibilityLabel="Badge del reto" />
          ) : null}
          {reward.points ? (
            <TextV2 style={styles.rewardPoints}>{`+${reward.points} pts`}</TextV2>
          ) : null}
          {reward.badgeId ? (
            <TextV2 style={styles.rewardBadge}>
              {reward.badgeName ? `Badge ${reward.badgeName}` : 'Badge'}
            </TextV2>
          ) : null}
        </View>
      ) : null}

      <View style={styles.bottom}>
        <View style={styles.figureRow}>
          <View style={styles.figureText}>
            <View style={styles.numberRow}>
              <TextV2 style={styles.number}>
                {String(joined ? card.progress : card.goal)}
              </TextV2>
              {joined ? (
                <TextV2 style={styles.goal}>{`/ ${card.goal}`}</TextV2>
              ) : null}
            </View>
            <TextV2 style={styles.title} numberOfLines={2}>
              {card.label}
            </TextV2>
          </View>
          <View style={[styles.cta, { backgroundColor: colors.ember.base }]}>
            <ArrowRight size={22} color="#FFFFFF" strokeWidth={2} />
          </View>
        </View>

        {joined ? (
          <>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${card.pct}%`, backgroundColor: colors.ember.base },
                ]}
              />
            </View>
            <TextV2 variant="body" color="#E4E2DD">
              {card.line}
            </TextV2>
          </>
        ) : (
          <View style={styles.joinRow}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Unirme al reto"
              disabled={joining}
              onPress={onJoin}
              hitSlop={4}
              style={[styles.join, joining && styles.joining]}
            >
              <TextV2 variant="bodyStrong" color="#121212">
                {joining ? 'Uniéndome…' : 'Unirme'}
              </TextV2>
            </PressableScale>
            {athletes ? (
              <TextV2 variant="body" color="#E4E2DD" style={styles.athletes}>
                {athletes}
              </TextV2>
            ) : null}
          </View>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Breaks out of the sheet's side padding (full bleed).
  section: {
    height: 420,
    marginHorizontal: -20,
    overflow: 'hidden',
    backgroundColor: INK,
  },
  dim: { backgroundColor: 'rgba(20,19,18,.34)' },
  top: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4, color: '#FFFFFF' },
  days: { fontWeight: '500' },
  reward: { position: 'absolute', right: 24, top: 118, alignItems: 'center', gap: 6 },
  rewardPoints: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  rewardBadge: {
    fontSize: 11,
    lineHeight: 14,
    color: '#C9C6C0',
    textAlign: 'center',
    maxWidth: 84,
  },
  bottom: { position: 'absolute', left: 24, right: 24, bottom: 26, gap: 14 },
  figureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
  },
  figureText: { flex: 1, minWidth: 0 },
  numberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  number: {
    fontSize: 76,
    lineHeight: 70,
    fontWeight: '700',
    letterSpacing: -3.8,
    color: '#FFFFFF',
  },
  goal: { fontSize: 24, fontWeight: '500', color: '#C9C6C0' },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: '#FFFFFF',
  },
  cta: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(255,91,31,.35)',
  },
  track: {
    height: 6,
    borderRadius: 3,
    marginRight: 72,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,.2)',
  },
  fill: { height: '100%', borderRadius: 3 },
  joinRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  join: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joining: { opacity: 0.7 },
  athletes: { flex: 1 },
});
