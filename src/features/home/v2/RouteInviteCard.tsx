import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ArrowRight } from 'lucide-react-native';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import {
  ROUTE_MAP_BG,
  ROUTE_MAP_BLOCKS,
  ROUTE_MAP_CROP,
  ROUTE_MAP_HERE,
  ROUTE_MAP_STROKES,
} from '@app/features/home/v2/routeMapData';

// Inicio · "Tu ruta" card, invitation state (v2.12 §11B, HOME_15): dark map
// plate of 316 pt between Tu día and Core 33 / ELLIE, dark in both themes.
// The "tu ruta real" state (map with today's activity) is Fase 5.
// TODO(ruta): the map is a placeholder; the SDK map comes with Ruta.
export function RouteInviteCard({ onPress }: { onPress: () => void }) {
  const { colors, shadow } = useThemeV2();
  const crop = ROUTE_MAP_CROP;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Tu ruta. Sal a moverte. Iniciar actividad"
      onPress={onPress}
      style={[styles.card, { boxShadow: shadow.subtle }]}
    >
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <Rect x={-200} y={0} width={900} height={1200} fill={ROUTE_MAP_BG} />
        {ROUTE_MAP_BLOCKS.map((d, i) => (
          <Path key={`b${i}`} d={d} fill="#1B1E1A" />
        ))}
        {ROUTE_MAP_STROKES.map((s, i) => (
          <Path
            key={`s${i}`}
            d={s.d}
            stroke={s.stroke}
            strokeWidth={s.width}
            strokeLinecap={s.round ? 'round' : undefined}
            fill="none"
          />
        ))}
        <Circle
          cx={ROUTE_MAP_HERE.x}
          cy={ROUTE_MAP_HERE.y}
          r={30}
          fill={colors.ember.base}
          fillOpacity={0.1}
          stroke={colors.ember.base}
          strokeOpacity={0.35}
          strokeWidth={1}
        />
        <Circle
          cx={ROUTE_MAP_HERE.x}
          cy={ROUTE_MAP_HERE.y}
          r={9}
          fill={colors.ember.base}
          stroke="#FFFFFF"
          strokeWidth={3.5}
        />
      </Svg>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(20,19,18,.1)', 'rgba(20,19,18,0)', 'rgba(20,19,18,.86)', '#141312']}
        locations={[0, 0.3, 0.68, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.bottom}>
        <View style={styles.texts}>
          <TextV2 variant="eyebrow" color="#A8A6A1">
            Tu ruta
          </TextV2>
          <TextV2 style={styles.title}>Sal a moverte.</TextV2>
          <TextV2 variant="body" color="#D8D6D1">
            Running · Ciclismo
          </TextV2>
        </View>
        <View style={styles.cta}>
          <TextV2 variant="bodyStrong" color="#121212">
            Iniciar actividad
          </TextV2>
          <ArrowRight size={16} color="#121212" strokeWidth={2} />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 316,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#141312',
  },
  bottom: { position: 'absolute', left: 20, right: 20, bottom: 20, gap: 14 },
  texts: { gap: 6 },
  title: {
    fontSize: 28,
    lineHeight: 29,
    fontWeight: '600',
    letterSpacing: -0.56,
    color: '#FFFFFF',
  },
  cta: {
    alignSelf: 'flex-start',
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
