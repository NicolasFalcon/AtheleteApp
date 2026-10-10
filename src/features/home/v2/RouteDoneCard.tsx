import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowRight, Check } from 'lucide-react-native';
import { PressableScale, TextV2 } from '@app/components/v2';
import { RouteMap } from '@app/features/route/RouteMap';
import { formatDuration, formatKm, formatPace, formatSpeed } from '@app/features/route/routeFormat';
import { paceSecPerKm, speedKmh } from '@app/features/route/routeGeo';
import type { RouteActivity } from '@app/features/route/routeTypes';

// Inicio · "Tu ruta" card, real state (HOME_16/17): today's route on the dark
// map, distance, time and pace, and "Ver actividad". Dark in both themes.
// TODO(route-wire): a static map snapshot from the server instead of a live
// map instance inside the scroll.
export function RouteDoneCard({
  activity,
  ago,
  onOpen,
  onOther,
}: {
  activity: RouteActivity;
  ago: string;
  onOpen: () => void;
  onOther: () => void;
}) {
  const running = activity.sport === 'running';
  const pace = running
    ? `${formatPace(paceSecPerKm(activity.distanceM, activity.movingSec))} /km`
    : `${formatSpeed(speedKmh(activity.distanceM, activity.movingSec))} km/h`;
  return (
    <View style={styles.card}>
      <RouteMap
        style={StyleSheet.absoluteFill}
        mode="dark"
        fit={activity.points}
        padding={{ top: 24, bottom: 150, left: 40, right: 40 }}
        route={activity.points}
        interactive={false}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(20,19,18,.1)', 'rgba(20,19,18,0)', 'rgba(20,19,18,.86)', '#141312']}
        locations={[0, 0.3, 0.62, 0.9]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.bottom} pointerEvents="box-none">
        <TextV2 variant="eyebrow" color="#A8A6A1">
          TU RUTA · HOY
        </TextV2>
        <View style={styles.figure}>
          <TextV2 style={styles.big}>{formatKm(activity.distanceM)}</TextV2>
          <TextV2 style={styles.unit}>km</TextV2>
        </View>
        <TextV2 variant="body" color="#D8D6D1">
          {formatDuration(activity.movingSec)} · {pace}
        </TextV2>
        <View style={styles.doneRow}>
          <View style={styles.check}>
            <Check size={11} color="#FFFFFF" strokeWidth={3} />
          </View>
          <TextV2 variant="meta" color="#A8A6A1">
            {running ? 'Running' : 'Ciclismo'} · completada · {ago}
          </TextV2>
        </View>
        <View style={styles.actions}>
          <PressableScale accessibilityRole="button" onPress={onOpen} style={styles.cta}>
            <TextV2 variant="bodyStrong" color="#121212">
              Ver actividad
            </TextV2>
            <ArrowRight size={16} color="#121212" strokeWidth={2} />
          </PressableScale>
          <PressableScale accessibilityRole="button" onPress={onOther} style={styles.other}>
            <TextV2 variant="bodyStrong" color="#D8D6D1">
              Otra actividad
            </TextV2>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: 316, borderRadius: 24, overflow: 'hidden', backgroundColor: '#141312' },
  bottom: { position: 'absolute', left: 20, right: 20, bottom: 20, gap: 4 },
  figure: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  big: { fontSize: 56, lineHeight: 60, fontWeight: '800', letterSpacing: -2, color: '#FFFFFF' },
  unit: { fontSize: 18, fontWeight: '600', color: '#A8A6A1' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  check: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FF5A1F', alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  cta: { height: 48, paddingHorizontal: 20, borderRadius: 24, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6 },
  other: { height: 48, paddingHorizontal: 8, justifyContent: 'center' },
});
