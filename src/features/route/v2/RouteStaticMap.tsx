import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import { ROUTE_EMBER } from '@app/features/route/mapStyle';
import { RouteMap } from '@app/features/route/RouteMap';
import type { LatLng } from '@app/features/route/routeTypes';
import { fitPolyline } from '@app/features/social/routePostGeometry';

// Neutral plates under the route when there is no base map (offline, still
// loading, or `basemap={false}`).
export const STATIC_MAP_BG = { dark: '#181715', light: '#E8E6E1' } as const;

type Padding = { top: number; right: number; bottom: number; left: number };

// The map of a SAVED activity (B-06): one component for the card of Inicio,
// the route post of Comunidad and the preview of Compartir. Dark (or the
// theme's), never interactive, no user location and no GPS: it is fitted to
// the saved polyline and draws it in the brand Ember. The polyline is drawn
// on a neutral plate first; the base map (MapLibre) shows over it once it has
// loaded, and if it cannot load the plate stays. Never "Buscando tu
// ubicación…".
export function RouteStaticMap({
  points,
  mode = 'dark',
  padding = { top: 24, right: 24, bottom: 24, left: 24 },
  basemap = true,
  endpoints = true,
  background,
  style,
}: {
  points: readonly LatLng[];
  mode?: 'dark' | 'auto';
  padding?: Padding;
  // false: only the polyline on the plate (no tiles).
  basemap?: boolean;
  endpoints?: boolean;
  // Plate colour; 'transparent' draws only the route.
  background?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeV2();
  const dark = mode === 'dark' || theme.mode === 'dark';
  const plate = background ?? STATIC_MAP_BG[dark ? 'dark' : 'light'];
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const drawable = points.length > 1;

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (!size || size.width !== width || size.height !== height) {
      setSize({ width, height });
    }
  };

  const fitted =
    drawable && size && size.width > 0 && size.height > 0
      ? fitPolyline(points, {
          width: size.width,
          height: size.height,
          padding: Math.max(padding.left, padding.right, padding.top),
          bottomPadding: padding.bottom,
        })
      : null;
  const showMap = basemap && drawable && !mapFailed;

  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={[styles.fill, { backgroundColor: plate }, style]}
    >
      {fitted && size && !(showMap && mapReady) ? (
        <Svg style={StyleSheet.absoluteFill} width={size.width} height={size.height}>
          <Path
            d={fitted.d}
            stroke={ROUTE_EMBER}
            strokeOpacity={0.22}
            strokeWidth={13}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d={fitted.d}
            stroke={ROUTE_EMBER}
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {endpoints ? (
            <>
              <Circle cx={fitted.start.x} cy={fitted.start.y} r={5.5} fill={plate === 'transparent' ? '#141312' : plate} stroke={ROUTE_EMBER} strokeWidth={2.5} />
              <Circle cx={fitted.end.x} cy={fitted.end.y} r={6.5} fill={ROUTE_EMBER} stroke={plate === 'transparent' ? '#141312' : plate} strokeWidth={2.5} />
            </>
          ) : null}
        </Svg>
      ) : null}
      {showMap ? (
        <View style={[StyleSheet.absoluteFill, mapReady ? null : styles.hidden]}>
          <RouteMap
            style={StyleSheet.absoluteFill}
            mode={dark ? 'dark' : 'light'}
            fit={points}
            route={points}
            endpoints={endpoints}
            padding={padding}
            interactive={false}
            onLoaded={() => setMapReady(true)}
            onLoadFailed={() => setMapFailed(true)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  // The base map waits invisible until it has loaded (the plate shows).
  hidden: { opacity: 0 },
});
