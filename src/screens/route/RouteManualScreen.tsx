import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react-native';
import { Button, PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { SAMPLE_ORIGIN, SAMPLE_TRACKS } from '@app/dev/routeFixtures';
import { RouteMap, type RouteMapPoint } from '@app/features/route/RouteMap';
import { formatKm } from '@app/features/route/routeFormat';
import { polylineDistance } from '@app/features/route/routeGeo';
import { routeStore, useRouteSession } from '@app/features/route/routeStore';
import type { LatLng, PlannedRoute } from '@app/features/route/routeTypes';
import { BigFigure, BottomPanel, RoundButton, TopPill } from '@app/features/route/v2/RouteUi';
import type { AppScreenProps } from '@app/types/navigation';

// Crear a mano (ROUTE_18–19): tap the map to add points, undo, edit points
// (select one and tap the map to move it, or delete it). The distance is
// computed here. MapLibre markers are not draggable, so "moving" is select +
// tap (D in MIGRATION_PROGRESS).
// TODO(route-wire): snap the segments to roads/paths and compute elevation on
// the server; here they are straight lines and the gain is 0.
export function manualToPlan(points: LatLng[], sport: PlannedRoute['sport']): PlannedRoute {
  return {
    id: `manual-${points.length}`,
    name: 'Ruta a mano',
    sport,
    points,
    distanceM: polylineDistance(points),
    elevationGainM: 0,
    kind: 'point_to_point',
    surface: 'mixed',
    origin: 'manual',
  };
}

export function RouteManualScreen({ navigation, route }: AppScreenProps<'RouteManual'>) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const session = useRouteSession();
  const { manualPoints: points, manualSelected: selected, manualEditing: editing } = session;
  const dev = __DEV__ ? route?.params?.dev : undefined;

  useEffect(() => {
    if (dev === 'drawing' || dev === 'editing') {
      const track = SAMPLE_TRACKS.manual;
      const step = Math.max(1, Math.floor(track.length / 6));
      const picked = track.filter((_, index) => index % step === 0).slice(0, 7);
      routeStore.patch({
        manualPoints: picked,
        manualEditing: dev === 'editing',
        manualSelected: dev === 'editing' ? 2 : null,
      });
    }
  }, [dev]);

  const distanceM = useMemo(() => polylineDistance(points), [points]);
  const markers: RouteMapPoint[] = points.map((point, index) => ({
    id: `p${index}`,
    point,
    selected: editing && index === selected,
  }));

  const onMapPress = (point: LatLng) => {
    if (editing) {
      if (selected !== null) {
        routeStore.patch({ manualPoints: points.map((item, index) => (index === selected ? point : item)) });
      }
      return;
    }
    routeStore.patch({ manualPoints: [...points, point] });
  };

  const hint =
    points.length === 0
      ? 'Toca el mapa para fijar el inicio'
      : points.length === 1
        ? 'Toca para añadir el siguiente punto'
        : 'Sigue tocando para alargar la ruta';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <RouteMap
        style={StyleSheet.absoluteFill}
        center={points[0] ?? SAMPLE_ORIGIN}
        zoom={15}
        fit={points.length > 1 && dev ? points : undefined}
        padding={{ top: insets.top + 80, bottom: 300, left: 50, right: 50 }}
        route={points.length > 1 ? points : undefined}
        points={markers}
        onPointPress={id => editing && routeStore.patch({ manualSelected: Number(id.slice(1)) })}
        onPress={onMapPress}
      />
      <View style={[styles.top, { top: insets.top + 8 }]}>
        <RoundButton icon={ArrowLeft} label="Atrás" onPress={() => navigation.goBack()} />
        <TopPill label={editing ? 'Editar puntos' : 'Crear ruta'} />
        <RoundButton
          icon={RotateCcw}
          label="Deshacer"
          disabled={points.length === 0}
          onPress={() =>
            routeStore.patch({ manualPoints: points.slice(0, -1), manualSelected: null })
          }
        />
      </View>

      <BottomPanel floating style={{ bottom: Math.max(insets.bottom, 16) + 4 }}>
        <View style={styles.body}>
          <View style={styles.hintRow}>
            <View style={[styles.hintDot, { backgroundColor: colors.ember.base }]} />
            <TextV2 variant="body" tone="secondary" style={styles.flex}>
              {editing
                ? 'Toca un punto para elegirlo y mueve con un toque en el mapa'
                : hint}
            </TextV2>
          </View>
          <View style={styles.statsRow}>
            <BigFigure value={formatKm(distanceM)} unit="km" size={40} />
            <View style={[styles.statCell, { borderLeftColor: colors.divider }]}>
              <TextV2 style={styles.statValue}>—</TextV2>
              <TextV2 variant="meta" tone="secondary">
                Desnivel
              </TextV2>
            </View>
            <View style={[styles.statCell, { borderLeftColor: colors.divider }]}>
              <TextV2 style={styles.statValue}>{points.length}</TextV2>
              <TextV2 variant="meta" tone="secondary">
                Puntos
              </TextV2>
            </View>
          </View>
          {editing && selected !== null ? (
            <View style={[styles.editRow, { backgroundColor: colors.surface.muted }]}>
              <View style={[styles.hintDot, { backgroundColor: colors.ember.base }]} />
              <View style={styles.flex}>
                <TextV2 variant="bodyStrong">Punto {selected + 1}</TextV2>
                <TextV2 variant="meta" tone="secondary">
                  Toca el mapa para moverlo
                </TextV2>
              </View>
              <PressableScale
                accessibilityRole="button"
                onPress={() =>
                  routeStore.patch({
                    manualPoints: points.filter((_, index) => index !== selected),
                    manualSelected: null,
                  })
                }
                style={styles.delete}
              >
                <Trash2 size={15} color={colors.ember.strong} strokeWidth={2} />
                <TextV2 variant="metaStrong" color={colors.ember.strong}>
                  Eliminar
                </TextV2>
              </PressableScale>
            </View>
          ) : null}
          <View style={styles.actions}>
            <Button
              label={editing ? 'Añadir puntos' : 'Editar puntos'}
              variant="outline"
              disabled={points.length < 2 && !editing}
              style={styles.flex}
              onPress={() => routeStore.patch({ manualEditing: !editing, manualSelected: null })}
            />
            <Button
              label="Listo"
              variant="primary"
              disabled={points.length < 2}
              style={styles.flex}
              onPress={() => {
                routeStore.patch({ draft: manualToPlan(points, session.sport), manualEditing: false });
                navigation.navigate(APP_ROUTES.RoutePreview);
              }}
            />
          </View>
        </View>
      </BottomPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  body: { gap: 10 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hintDot: { width: 8, height: 8, borderRadius: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statCell: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 14, gap: 1 },
  statValue: { fontSize: 20, lineHeight: 24, fontWeight: '700' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, padding: 12 },
  delete: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actions: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
