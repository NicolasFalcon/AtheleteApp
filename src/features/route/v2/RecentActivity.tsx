import { StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { formatKm, formatPace, formatSpeed } from '@app/features/route/routeFormat';
import { paceSecPerKm, speedKmh } from '@app/features/route/routeGeo';
import type { RouteActivity } from '@app/features/route/routeTypes';
import { RouteThumb } from '@app/features/route/v2/RouteThumb';
import type { OutdoorMonth } from '@app/services/route/routeService';

// Perfil · "Actividad reciente" (ROUTE_12): last outdoor routes with their
// thumbnail, and the "Al aire libre" month summary. A thumbnail shows the track
// the viewer is allowed to see. TODO(route-wire): activities and the month
// summary come from RouteService.getRecentActivities / getOutdoorMonth.
export function RecentActivity({
  activities,
  month,
  onOpen,
}: {
  activities: RouteActivity[];
  month: OutdoorMonth | null;
  onOpen: (activity: RouteActivity) => void;
}) {
  const { colors } = useThemeV2();
  if (activities.length === 0) {
    return null;
  }
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <TextV2 variant="section">Actividad reciente</TextV2>
        {month ? (
          <TextV2 variant="meta" tone="secondary">
            Al aire libre
          </TextV2>
        ) : null}
      </View>
      {month ? (
        <View style={styles.month}>
          <TextV2 variant="meta" tone="secondary">
            Este mes · {String(month.runKm).replace('.', ',')} km corriendo · {String(month.bikeKm).replace('.', ',')} km en bici
          </TextV2>
        </View>
      ) : null}
      {activities.map(activity => {
        const running = activity.sport === 'running';
        return (
          <PressableScale
            key={activity.id}
            accessibilityRole="button"
            onPress={() => onOpen(activity)}
            style={[styles.row, { borderTopColor: colors.divider }]}
          >
            <RouteThumb points={activity.points} size={56} radius={12} />
            <View style={styles.text}>
              <TextV2 variant="bodyStrong" numberOfLines={1}>
                {activity.title}
              </TextV2>
              <TextV2 variant="meta" tone="secondary">
                {running ? 'Running' : 'Ciclismo'} · {formatKm(activity.distanceM)} km ·{' '}
                {running
                  ? `${formatPace(paceSecPerKm(activity.distanceM, activity.movingSec))} /km`
                  : `${formatSpeed(speedKmh(activity.distanceM, activity.movingSec))} km/h`}
              </TextV2>
            </View>
            <ChevronRight size={18} color={colors.text.secondary} strokeWidth={2} />
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  month: { paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  text: { flex: 1, gap: 2 },
});
