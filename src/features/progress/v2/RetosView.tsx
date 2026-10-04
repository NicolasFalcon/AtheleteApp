import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Award, ArrowRight } from 'lucide-react-native';
import {
  Button,
  Eyebrow,
  HexMedal,
  MetricTrio,
  PressableScale,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { HOME_PHOTOS } from '@app/features/home/v2/homePhotos';
import { HERO_HEIGHT } from '@app/features/progress/v2/ProgressHeroView';
import { tightLine } from '@app/theme/v2/typography';
import type { ProgressChallenge } from '@app/services/supabase/progress';

// Progreso · Retos (PROGRESS_03): the Core 33 dots in the dark hero and, in
// the sheet, the streaks and the finished challenges.
export function RetosHero({
  challenge,
  top,
  width,
  onOpen,
  onDiscover,
}: {
  challenge: ProgressChallenge | null;
  top: number;
  width: number;
  onOpen: () => void;
  onDiscover: () => void;
}) {
  const { scene } = useThemeV2();
  // 11 columns across the padded width, 6 pt gaps (prototype grid).
  const dotSize = Math.floor((width - 40 - 10 * 6) / 11);
  const closed = challenge?.completedDays ?? 0;
  const active = challenge?.status === 'active';
  const left = challenge
    ? Math.max(challenge.totalHabits - challenge.completedToday, 0)
    : 0;

  return (
    <View style={[styles.hero, { height: HERO_HEIGHT }]}>
      <Image
        source={HOME_PHOTOS.wear}
        resizeMode="cover"
        style={styles.photo}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(20,19,18,.55)', 'rgba(20,19,18,.75)', '#141312']}
        locations={[0, 0.45, 1]}
        style={styles.fill}
      />
      {challenge ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Core 33, ${closed} de 33 días`}
          onPress={onOpen}
          style={[styles.copy, { top }]}
        >
          <Eyebrow color={scene.onDark.meta}>
            {active ? 'Reto activo · Core 33' : 'Reto completado · Core 33'}
          </Eyebrow>
          <View style={styles.big}>
            <TextV2
              variant="displayM"
              color="#FFFFFF"
              style={{ fontSize: 68, ...tightLine(68, 0.9) }}
            >
              {String(closed)}
            </TextV2>
            <TextV2
              variant="sub"
              color={scene.onDark.tertiary}
              style={styles.bigSuffix}
            >
              / 33 días
            </TextV2>
          </View>
          <View style={styles.dots}>
            {Array.from({ length: 33 }, (_, index) => (
              <View
                key={index}
                style={[
                  {
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotSize / 2,
                  },
                  index < closed
                    ? { backgroundColor: '#FF5B1F' }
                    : { boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.4)' },
                ]}
              />
            ))}
          </View>
          <View style={styles.line}>
            <TextV2 variant="body" color={scene.onDark.secondary}>
              {active
                ? left === 0
                  ? `Día ${challenge.challengeDay} cerrado. Mañana sigue.`
                  : `${left} ${
                      left === 1 ? 'hábito' : 'hábitos'
                    } para cerrar el día ${challenge.challengeDay}.`
                : 'Reto completado. 33 días.'}
            </TextV2>
            <ArrowRight size={15} color="#FFFFFF" strokeWidth={2} />
          </View>
        </PressableScale>
      ) : (
        <View style={[styles.copy, { top }]}>
          <Eyebrow color={scene.onDark.meta}>Retos</Eyebrow>
          <TextV2 variant="title22" color="#FFFFFF" style={styles.noChallenge}>
            33 días. Una intención.
          </TextV2>
          <TextV2 variant="body" color={scene.onDark.secondary}>
            Elige un Core 33 y tu constancia queda visible día a día.
          </TextV2>
          <Button
            label="Descubrir Core 33"
            variant="onScene"
            size="md"
            onPress={onDiscover}
            style={styles.discover}
          />
        </View>
      )}
    </View>
  );
}

export function RetosSheet({
  streak,
  bestStreak,
  challenge,
}: {
  streak: number;
  bestStreak: number;
  challenge: ProgressChallenge | null;
}) {
  const { colors } = useThemeV2();
  const finished = challenge?.status === 'completed' ? challenge : null;

  return (
    <>
      <MetricTrio
        items={[
          { value: String(streak), unit: 'días', label: 'Racha actual' },
          { value: String(bestStreak), unit: 'días', label: 'Mejor racha' },
        ]}
      />
      <View>
        <TextV2 variant="section" style={styles.finishedTitle}>
          Completados
        </TextV2>
        {finished ? (
          <View
            style={[styles.finishedRow, { borderTopColor: colors.divider }]}
          >
            <HexMedal icon={Award} size={48} />
            <View style={styles.flex}>
              <TextV2 variant="cta">Core 33</TextV2>
              <TextV2 variant="meta" tone="secondary">
                {`${finished.completedDays} de 33 días`}
              </TextV2>
            </View>
          </View>
        ) : (
          <TextV2
            variant="body"
            tone="secondary"
            style={[styles.finishedEmpty, { borderTopColor: colors.divider }]}
          >
            Aún no has completado ningún reto.
          </TextV2>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: '#141312', overflow: 'hidden' },
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.55,
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  copy: { position: 'absolute', left: 20, right: 20, gap: 14 },
  big: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bigSuffix: { paddingBottom: 6 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noChallenge: { lineHeight: 29 },
  discover: { alignSelf: 'flex-start', marginTop: 6 },
  finishedTitle: { paddingBottom: 8 },
  finishedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  finishedEmpty: { paddingVertical: 14, borderTopWidth: 1 },
  flex: { flex: 1 },
});
