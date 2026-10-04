import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ProgressCurve, TextV2, useThemeV2 } from '@app/components/v2';
import { HOME_PHOTOS } from '@app/features/home/v2/homePhotos';
import {
  axisMonths,
  MONTH_ABBR,
  type ProgressHero,
} from '@app/features/progress/progressModel';
import { formatNumber } from '@app/features/progress/recordsModel';
import { tightLine } from '@app/theme/v2/typography';

export const HERO_HEIGHT = 420;
const CURVE_HEIGHT = 150;

// Dark evolution scene of Progreso · Resumen (always a scene, both modes):
// photo, the headline number and the free curve to bleed edges.
export function ProgressHeroView({
  hero,
  top,
  width,
}: {
  hero: ProgressHero;
  top: number; // distance from the top where the headline starts
  width: number;
}) {
  const { scene } = useThemeV2();

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

      {hero.kind === 'empty' ? (
        <>
          <View style={[styles.copy, { top }]}>
            <TextV2 variant="eyebrow" color={scene.onDark.meta}>
              Tu evolución empieza aquí
            </TextV2>
            <TextV2 variant="title22" color="#FFFFFF" style={styles.emptyLine}>
              Tras tu primera sesión verás cómo creces, semana a semana.
            </TextV2>
          </View>
          <View style={styles.curve}>
            <ProgressCurve values={[]} width={width} height={120} placeholder />
          </View>
        </>
      ) : (
        <>
          <View style={[styles.copy, { top }]}>
            <TextV2 variant="eyebrow" color={scene.onDark.meta}>
              {hero.kind === 'strength'
                ? `Fuerza total · desde ${hero.sinceMonth}`
                : `Constancia · desde ${hero.sinceMonth}`}
            </TextV2>
            <View style={styles.big}>
              <TextV2
                variant="displayM"
                color="#FFFFFF"
                style={{ fontSize: 68, ...tightLine(68, 0.95) }}
              >
                {hero.kind === 'strength'
                  ? `${hero.pct >= 0 ? '+' : '−'}${Math.abs(hero.pct)}`
                  : String(hero.sessions)}
              </TextV2>
              <TextV2
                variant="section"
                color="#FFFFFF"
                style={hero.kind === 'strength' ? styles.pct : styles.suffix}
              >
                {hero.kind === 'strength'
                  ? '%'
                  : hero.sessions === 1
                  ? 'sesión'
                  : 'sesiones'}
              </TextV2>
            </View>
            <TextV2 variant="body" color={scene.onDark.secondary}>
              {hero.kind === 'strength'
                ? `Levantas ${formatNumber(Math.abs(hero.deltaKg))} kg ${
                    hero.deltaKg >= 0 ? 'más' : 'menos'
                  } por sesión que en ${hero.sinceMonth}.`
                : `${formatNumber(hero.minutes)} min de entreno activo desde ${
                    hero.sinceMonth
                  }.`}
            </TextV2>
          </View>
          <View style={styles.curve}>
            <ProgressCurve
              values={hero.values}
              width={width}
              height={CURVE_HEIGHT}
              gradientId="progressHeroArea"
            />
          </View>
          <View style={styles.axis}>
            {axisMonths(hero.months).map((month, index, all) => {
              const last = index === all.length - 1;
              return (
                <TextV2
                  key={month}
                  variant="caption"
                  color={last ? '#FFFFFF' : scene.onDark.tertiary}
                  style={last ? styles.axisLast : undefined}
                >
                  {MONTH_ABBR[month]}
                </TextV2>
              );
            })}
          </View>
        </>
      )}
    </View>
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
  copy: { position: 'absolute', left: 20, right: 20, gap: 4 },
  big: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  pct: { fontSize: 24, paddingTop: 6 },
  suffix: { fontSize: 24, paddingTop: 30 },
  emptyLine: { lineHeight: 29, marginTop: 8 },
  curve: { position: 'absolute', left: 0, bottom: 44 },
  axis: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLast: { fontWeight: '600' },
});
