import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useThemeV2 } from '@app/components/v2';
import { ROUTE_EMBER } from '@app/features/route/mapStyle';
import { boundsOf } from '@app/features/route/routeGeo';
import type { LatLng } from '@app/features/route/routeTypes';

// A small flat drawing of a route (no basemap): thumbnails of Tus rutas,
// Perfil and the privacy sheet. Cheap: one SVG path, no map instance.
export function RouteThumb({
  points,
  size,
  radius = 16,
  strokeWidth = 2.6,
  dots = false,
  dim = false,
  style,
}: {
  points: readonly LatLng[];
  size: number;
  radius?: number;
  strokeWidth?: number;
  // Start and end dots.
  dots?: boolean;
  dim?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, mode } = useThemeV2();
  const pad = size * 0.14;

  const drawn = useMemo(() => {
    const b = boundsOf(points);
    if (!b || points.length < 2) {
      return null;
    }
    const cos = Math.cos((((b.sw.lat + b.ne.lat) / 2) * Math.PI) / 180);
    const w = Math.max(1e-9, (b.ne.lon - b.sw.lon) * cos);
    const h = Math.max(1e-9, b.ne.lat - b.sw.lat);
    const scale = (size - pad * 2) / Math.max(w, h);
    const offX = (size - w * scale) / 2;
    const offY = (size - h * scale) / 2;
    const xy = (p: LatLng) => ({
      x: offX + (p.lon - b.sw.lon) * cos * scale,
      y: offY + (b.ne.lat - p.lat) * scale,
    });
    const projected = points.map(xy);
    return {
      d: projected.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(''),
      first: projected[0],
      last: projected[projected.length - 1],
    };
  }, [pad, points, size]);

  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: mode === 'dark' ? '#23211F' : '#E8E6E1',
        },
        style,
      ]}
    >
      {drawn ? (
        <Svg width={size} height={size} opacity={dim ? 0.45 : 1}>
          <Path d={drawn.d} stroke={ROUTE_EMBER} strokeOpacity={0.25} strokeWidth={strokeWidth * 3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d={drawn.d} stroke={ROUTE_EMBER} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {dots ? (
            <>
              <Circle cx={drawn.first.x} cy={drawn.first.y} r={size * 0.03 + 1.5} fill={colors.bg} stroke={ROUTE_EMBER} strokeWidth={1.6} />
              <Circle cx={drawn.last.x} cy={drawn.last.y} r={size * 0.035 + 1.5} fill={ROUTE_EMBER} stroke={colors.bg} strokeWidth={1.6} />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ box: { overflow: 'hidden' } });
