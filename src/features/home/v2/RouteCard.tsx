import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { ArrowRight, ChevronRight, PersonStanding } from 'lucide-react-native';
import { PressableScale, TextV2 } from '@app/components/v2';
import {
  ROUTE_MAP_BG,
  ROUTE_MAP_BLOCKS,
  ROUTE_MAP_CROP,
  ROUTE_MAP_STROKES,
} from '@app/features/home/v2/routeMapData';
import { agoLabel, formatKm } from '@app/features/route/routeFormat';
import type { RouteActivity } from '@app/features/route/routeTypes';
import { RouteStaticMap } from '@app/features/route/v2/RouteStaticMap';

// Inicio · "Tu ruta" (handoff v2.15 §25.5): 212 pt, the dark map at 70 % with
// the Ember point and its halo; "TU RUTA" with "Sal a moverte." or today's
// km, and under a divider the latest activity with "Ver todas". The map is
// the latest activity's (RouteStaticMap, no GPS) or the plate when there is
// none. Dark in both themes. The Premium (locked) variant is not built.
const SPORT: Record<string, string> = { running: 'Running', cycling: 'Ciclismo', walking: 'Caminata' };

export function RouteCard({
  today,
  latest,
  onPress,
  onSeeAll,
}: {
  today: RouteActivity | null;
  latest: RouteActivity | null;
  onPress: () => void;
  onSeeAll: () => void;
}) {
  const now = Date.now();
  const mapOf = today ?? latest;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={today ? `Tu ruta de hoy: ${formatKm(today.distanceM, 1)} km` : 'Tu ruta. Sal a moverte.'}
      onPress={onPress}
      style={styles.card}
    >
      <View style={[StyleSheet.absoluteFill, styles.map]} pointerEvents="none">
        {mapOf && mapOf.points.length > 1 ? (
          <RouteStaticMap
            style={StyleSheet.absoluteFill}
            mode="dark"
            points={mapOf.points}
            endpoints={false}
            padding={{ top: 20, bottom: 90, left: 30, right: 30 }}
          />
        ) : (
          <Svg
            style={StyleSheet.absoluteFill}
            viewBox={`${ROUTE_MAP_CROP.x} ${ROUTE_MAP_CROP.y} ${ROUTE_MAP_CROP.width} ${ROUTE_MAP_CROP.height}`}
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
          </Svg>
        )}
      </View>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(18,17,16,.92)', 'rgba(18,17,16,.55)', 'rgba(18,17,16,.25)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.3 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(18,17,16,0)', 'rgba(18,17,16,.9)']}
        locations={[0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.here} pointerEvents="none">
        <View style={styles.hereDot} />
      </View>

      <View style={styles.content}>
        <View style={styles.headRow}>
          <View style={styles.gap6}>
            <TextV2 variant="eyebrow" color="#A8A6A1">
              Tu ruta
            </TextV2>
            {today ? (
              <>
                <TextV2 color="#FFFFFF" style={styles.km}>
                  {`${formatKm(today.distanceM, 1)} km`}
                </TextV2>
                <TextV2 variant="body" color="#D8D6D1" style={styles.fs14}>
                  {`Hoy · ${SPORT[today.sport] ?? 'Actividad'}`}
                </TextV2>
              </>
            ) : (
              <>
                <TextV2 color="#FFFFFF" style={styles.title}>
                  Sal a moverte.
                </TextV2>
                <TextV2 variant="body" color="#D8D6D1" style={styles.fs14}>
                  Running · Ciclismo
                </TextV2>
              </>
            )}
          </View>
          <View style={styles.arrow}>
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
          </View>
        </View>
        <View style={styles.footRow}>
          <PersonStanding size={24} color="#D8D6D1" strokeWidth={1.6} />
          {latest ? (
            <>
              <View style={styles.footTexts}>
                <TextV2 variant="captionStrong" color="#F2F0EC" style={styles.fs13}>
                  {`Última · ${formatKm(latest.distanceM, 1)} km`}
                </TextV2>
                <TextV2 variant="caption" color="#A8A6A1">
                  {agoLabel(latest.startedAt, now)}
                </TextV2>
              </View>
              <PressableScale accessibilityRole="button" onPress={onSeeAll} style={styles.seeAll}>
                <TextV2 variant="captionStrong" color="#F2F0EC" style={styles.fs13}>
                  Ver todas
                </TextV2>
                <ChevronRight size={14} color="#FFFFFF" strokeWidth={2} style={styles.dim} />
              </PressableScale>
            </>
          ) : (
            <View style={styles.footTexts}>
              <TextV2 variant="captionStrong" color="#F2F0EC" style={styles.fs13}>
                Sin rutas registradas
              </TextV2>
              <TextV2 variant="caption" color="#A8A6A1">
                Tu primera ruta te está esperando.
              </TextV2>
            </View>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 212,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#121110',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
    boxShadow: '0 12px 28px rgba(0,0,0,.14)',
  },
  map: { opacity: 0.7 },
  dim: { opacity: 0.7 },
  gap6: { gap: 6, flexShrink: 1 },
  fs13: { fontSize: 13 },
  fs14: { fontSize: 14 },
  here: {
    position: 'absolute',
    right: 58,
    top: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,91,31,.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,91,31,.45)',
    boxShadow: '0 0 36px rgba(255,91,31,.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hereDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF5B1F',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    boxShadow: '0 0 12px rgba(255,91,31,.8)',
  },
  content: { position: 'absolute', left: 20, right: 20, top: 20, bottom: 20, justifyContent: 'flex-end', gap: 16 },
  headRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 24, lineHeight: 25, fontWeight: '700', letterSpacing: -0.6 },
  km: { fontSize: 26, lineHeight: 26, fontWeight: '700', letterSpacing: -0.78 },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,.08)',
  },
  footTexts: { flex: 1, minWidth: 0, gap: 2 },
  seeAll: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
});
