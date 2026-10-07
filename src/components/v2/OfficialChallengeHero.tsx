import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import { formatThousands } from '@app/features/social/postModel';
import { progressPct } from '@app/features/social/challengeModel';

// Cover of the official challenge: an app asset (the real `cover_path` comes
// with the challenge). TODO(social-wire): `social_challenges.cover_path`.
const COVER = require('@app/assets/v2/photos/overhead.jpg');

// "Λ OFICIAL ATHELETE": glass pill with the brand mark.
export function OfficialBadge({ label = 'OFICIAL ATHELETE' }: { label?: string }) {
  const { scene } = useThemeV2();

  return (
    <View style={[styles.badge, { backgroundColor: scene.glass.onPhoto }]}>
      <View style={[styles.mark, { borderColor: scene.onDark.primary }]}>
        <TextV2 variant="eyebrow" color={scene.onDark.primary} style={styles.markText}>
          Λ
        </TextV2>
      </View>
      <TextV2 variant="eyebrow" color={scene.onDark.primary}>
        {label}
      </TextV2>
    </View>
  );
}

export type OfficialChallengeHeroProps = {
  title: string;
  days: string;
  // Not joined: athletes and points. Joined: your progress.
  joined: boolean;
  progress: number;
  goal: number;
  leftLine: string;
  participants: number | null;
  points: number;
  onPress: () => void;
};

// Official challenge as a dark photographic event (SOCIAL_07): never the same
// as "Reto de la semana" of Inicio, which is a compact clear card.
export function OfficialChallengeHero({
  title,
  days,
  joined,
  progress,
  goal,
  leftLine,
  participants,
  points,
  onPress,
}: OfficialChallengeHeroProps) {
  const { scene, colors } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Reto oficial. ${title}. ${joined ? `${progress} de ${goal}` : 'Unirme'}`}
      onPress={onPress}
      style={[styles.card, { backgroundColor: scene.plate }]}
    >
      <Image source={COVER} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(20,19,18,.55)', 'rgba(20,19,18,.3)', 'rgba(20,19,18,.94)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.top}>
        <OfficialBadge />
        <TextV2 variant="meta" color={scene.onDark.secondary}>
          {days}
        </TextV2>
      </View>
      <View style={styles.bottom}>
        <TextV2 variant="eyebrow" color={scene.onDark.meta}>
          Reto de la semana
        </TextV2>
        <TextV2 style={[styles.title, { color: scene.onDark.primary }]}>{title}</TextV2>
        {joined ? (
          <View style={styles.progress}>
            <View style={styles.figures}>
              <View style={styles.figure}>
                <TextV2 variant="title24" color={scene.onDark.primary}>
                  {String(progress)}
                </TextV2>
                <TextV2 variant="body" color={scene.onDark.meta}>{` / ${goal}`}</TextV2>
              </View>
              <TextV2 variant="meta" color={scene.onDark.meta} style={styles.left}>
                {leftLine}
              </TextV2>
            </View>
            <View style={[styles.track, { backgroundColor: 'rgba(255,255,255,.16)' }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${progressPct(progress, goal)}%`, backgroundColor: colors.ember.base },
                ]}
              />
            </View>
          </View>
        ) : (
          <View style={styles.join}>
            <TextV2 variant="meta" color={scene.onDark.secondary} style={styles.left}>
              {`${participants ? `${formatThousands(participants)} atletas · ` : ''}+${points} puntos`}
            </TextV2>
            <View style={[styles.joinButton, { backgroundColor: scene.cta.onScene }]}>
              <TextV2 variant="metaStrong" color={scene.cta.onSceneText}>
                Unirme
              </TextV2>
            </View>
          </View>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { height: 330, borderRadius: 30, overflow: 'hidden' },
  top: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottom: { position: 'absolute', left: 20, right: 20, bottom: 20, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4, lineHeight: 30 },
  badge: {
    height: 26,
    paddingLeft: 6,
    paddingRight: 10,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mark: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  markText: { fontSize: 8, lineHeight: 10, letterSpacing: 0 },
  progress: { gap: 8 },
  figures: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  figure: { flexDirection: 'row', alignItems: 'baseline' },
  left: { flexShrink: 1, textAlign: 'right' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  join: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  joinButton: { height: 40, paddingHorizontal: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
