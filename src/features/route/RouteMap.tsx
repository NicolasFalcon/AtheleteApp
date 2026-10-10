import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type LngLatBounds,
  type PressEvent,
} from '@maplibre/maplibre-react-native';
import type { NativeSyntheticEvent } from 'react-native';
import { useThemeV2 } from '@app/components/v2';
import { routeMapStyle, ROUTE_EMBER, type RouteMapMode } from '@app/features/route/mapStyle';
import { boundsOf } from '@app/features/route/routeGeo';
import {
  circlePolygon,
  lineFeature,
  type LineFC,
} from '@app/features/route/routeGeoJson';
import type { LatLng } from '@app/features/route/routeTypes';

export type RouteMapPoint = { id: string; point: LatLng; selected?: boolean; label?: string };

export type RouteMapProps = {
  // 'auto' follows the theme; the live and share scenes force 'dark'.
  mode?: RouteMapMode | 'auto';
  // The route in Ember, with its soft halo.
  route?: readonly LatLng[];
  // Parts of the track hidden from others (the owner sees them dotted grey).
  hiddenParts?: ReadonlyArray<readonly LatLng[]>;
  // The planned route (dotted, faint) and the guide back to it (dotted Ember).
  plan?: readonly LatLng[];
  // The planned route dotted in neutral grey (default) or Ember.
  planStyle?: 'grey' | 'ember';
  guide?: readonly LatLng[];
  // Current position (Ember dot with white ring) and its precision halo.
  here?: LatLng | null;
  // Hollow start and solid end dots of a finished route.
  endpoints?: boolean;
  // Hand-drawn points (first hollow, last solid; the selected one has a halo).
  points?: readonly RouteMapPoint[];
  onPointPress?: (id: string) => void;
  // Dashed target ring around a centre (Planear ruta · configuración).
  ring?: { center: LatLng; radiusM: number } | null;
  // Camera: fit these points with padding, or centre on one point.
  fit?: readonly LatLng[];
  padding?: { top: number; right: number; bottom: number; left: number };
  center?: LatLng;
  zoom?: number;
  interactive?: boolean;
  onPress?: (point: LatLng) => void;
  onLoadFailed?: () => void;
  onLoaded?: () => void;
  // 0–1 opacity of the whole map (the pause dims it to 50 %).
  dim?: number;
  style?: StyleProp<ViewStyle>;
};

const PADDING = { top: 0, right: 0, bottom: 0, left: 0 };

// The map of Ruta: one MapLibre map with the project style and the Ember
// route layers. No labels, no logo; the attribution button stays (OpenFreeMap
// and OpenStreetMap require it).
export function RouteMap({
  mode = 'auto',
  route,
  hiddenParts,
  plan,
  planStyle = 'grey',
  guide,
  here,
  endpoints = false,
  points,
  onPointPress,
  ring,
  fit,
  padding = PADDING,
  center,
  zoom,
  interactive = true,
  onPress,
  onLoadFailed,
  onLoaded,
  dim = 1,
  style,
}: RouteMapProps) {
  const theme = useThemeV2();
  const resolved: RouteMapMode = mode === 'auto' ? (theme.mode === 'dark' ? 'dark' : 'light') : mode;
  const mapStyle = useMemo(() => routeMapStyle(resolved), [resolved]);

  const routeData = useMemo(() => lineFeature(route ?? []), [route]);
  const planData = useMemo(() => lineFeature(plan ?? []), [plan]);
  const guideData = useMemo(() => lineFeature(guide ?? []), [guide]);
  const hiddenData = useMemo<LineFC>(
    () => ({
      type: 'FeatureCollection',
      features: (hiddenParts ?? []).flatMap(part => lineFeature(part).features),
    }),
    [hiddenParts],
  );
  const manualData = useMemo(() => lineFeature((points ?? []).map(p => p.point)), [points]);
  const ringData = useMemo(() => (ring ? circlePolygon(ring.center, ring.radiusM) : null), [ring]);

  const camera = useMemo(() => {
    const bounds = fit && fit.length > 1 ? boundsOf(fit) : null;
    if (bounds) {
      const b: LngLatBounds = [bounds.sw.lon, bounds.sw.lat, bounds.ne.lon, bounds.ne.lat];
      return { bounds: b, padding, duration: 0 };
    }
    const c = center ?? fit?.[0];
    return c
      ? { center: [c.lon, c.lat] as [number, number], zoom: zoom ?? 15.5, padding, duration: 0 }
      : { center: [-58.4208, -34.581] as [number, number], zoom: 14, padding, duration: 0 };
  }, [center, fit, padding, zoom]);

  const planOn = resolved === 'dark' ? 'rgba(255,255,255,.5)' : 'rgba(18,18,18,.35)';
  const handlePress = (event: NativeSyntheticEvent<PressEvent>) => {
    const [lon, lat] = event.nativeEvent.lngLat;
    onPress?.({ lat, lon });
  };

  return (
    <View style={[styles.fill, { opacity: dim }, style]}>
      <Map
        style={styles.fill}
        mapStyle={mapStyle}
        logo={false}
        compass={false}
        scaleBar={false}
        attributionPosition={{ bottom: 6, right: 6 }}
        dragPan={interactive}
        touchZoom={interactive}
        doubleTapZoom={interactive}
        touchRotate={false}
        touchPitch={false}
        onPress={onPress ? handlePress : undefined}
        onDidFailLoadingMap={onLoadFailed}
        onDidFinishLoadingMap={onLoaded}
      >
        <Camera {...camera} />

        {ringData ? (
          <GeoJSONSource id="ring" data={ringData}>
            <Layer
              id="ring-fill"
              type="fill"
              paint={{ 'fill-color': ROUTE_EMBER, 'fill-opacity': 0.1 }}
            />
            <Layer
              id="ring-line"
              type="line"
              layout={{ 'line-cap': 'round' }}
              paint={{
                'line-color': resolved === 'dark' ? '#FFFFFF' : '#121212',
                'line-opacity': 0.5,
                'line-width': 1.2,
                'line-dasharray': [2, 2],
              }}
            />
          </GeoJSONSource>
        ) : null}

        {plan && plan.length > 1 ? (
          <GeoJSONSource id="plan" data={planData}>
            <Layer
              id="plan-dots"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': planStyle === 'ember' ? ROUTE_EMBER : planOn, 'line-width': 4, 'line-dasharray': [0.01, 2.4] }}
            />
          </GeoJSONSource>
        ) : null}

        {hiddenParts && hiddenParts.length > 0 ? (
          <GeoJSONSource id="hidden" data={hiddenData}>
            <Layer
              id="hidden-dots"
              type="line"
              layout={{ 'line-cap': 'round' }}
              paint={{
                'line-color': resolved === 'dark' ? '#8C8A85' : '#A8A6A1',
                'line-width': 3,
                'line-dasharray': [0.01, 2],
              }}
            />
          </GeoJSONSource>
        ) : null}

        {route && route.length > 1 ? (
          <GeoJSONSource id="route" data={routeData}>
            <Layer
              id="route-halo"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': ROUTE_EMBER, 'line-opacity': 0.22, 'line-width': 13 }}
            />
            <Layer
              id="route-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': ROUTE_EMBER, 'line-width': 4.5 }}
            />
          </GeoJSONSource>
        ) : null}

        {points && points.length > 1 ? (
          <GeoJSONSource id="manual" data={manualData}>
            <Layer
              id="manual-halo"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': ROUTE_EMBER, 'line-opacity': 0.22, 'line-width': 13 }}
            />
            <Layer
              id="manual-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': ROUTE_EMBER, 'line-width': 4.5 }}
            />
          </GeoJSONSource>
        ) : null}

        {guide && guide.length > 1 ? (
          <GeoJSONSource id="guide" data={guideData}>
            <Layer
              id="guide-dots"
              type="line"
              layout={{ 'line-cap': 'round' }}
              paint={{ 'line-color': ROUTE_EMBER, 'line-width': 4, 'line-dasharray': [0.01, 2.2] }}
            />
          </GeoJSONSource>
        ) : null}

        {endpoints && route && route.length > 1 ? (
          <>
            <Marker id="start" lngLat={[route[0].lon, route[0].lat]}>
              <View style={[styles.endHollow, { backgroundColor: theme.colors.bg }]} />
            </Marker>
            <Marker id="end" lngLat={[route[route.length - 1].lon, route[route.length - 1].lat]}>
              <View style={[styles.endSolid, { borderColor: theme.colors.bg }]} />
            </Marker>
          </>
        ) : null}

        {points?.map((item, index) => {
          const first = index === 0;
          const last = index === points.length - 1 && points.length > 1;
          return (
            <Marker
              key={item.id}
              id={`pt-${item.id}`}
              lngLat={[item.point.lon, item.point.lat]}
              onPress={() => onPointPress?.(item.id)}
            >
              <View
                style={[
                  styles.manual,
                  first ? styles.manualFirst : last ? styles.manualLast : styles.manualMid,
                  item.selected ? styles.manualSelected : null,
                ]}
              />
            </Marker>
          );
        })}

        {here ? (
          <Marker id="here" lngLat={[here.lon, here.lat]}>
            <View style={styles.hereHalo}>
              <View style={styles.hereDot} />
            </View>
          </Marker>
        ) : null}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  endHollow: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: ROUTE_EMBER,
  },
  endSolid: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    backgroundColor: ROUTE_EMBER,
  },
  hereHalo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,91,31,.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,91,31,.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hereDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ROUTE_EMBER,
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
  },
  manual: { width: 22, height: 22, borderRadius: 11, borderWidth: 3 },
  manualFirst: { backgroundColor: '#FFFFFF', borderColor: '#121212' },
  manualMid: { backgroundColor: '#FFFFFF', borderColor: ROUTE_EMBER },
  manualLast: { backgroundColor: '#FFFFFF', borderColor: ROUTE_EMBER },
  manualSelected: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ROUTE_EMBER,
    borderColor: '#FFFFFF',
    boxShadow: '0 0 0 8px rgba(255,91,31,.22)',
  },
});
