import { Fragment } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

export type CurveGeometry = {
  points: { x: number; y: number }[];
  line: string;
  area: string;
};

// Free curve without axes (handoff · Progress Curve): the values are spread
// across `width` and scaled into `height`; a smooth cubic through every point.
export function curveGeometry(
  values: number[],
  width: number,
  height: number,
  options: {
    padX?: number;
    padRight?: number;
    top?: number;
    bottom?: number;
    // Continue the curve to both edges (Récord: the line bleeds).
    bleed?: boolean;
  } = {},
): CurveGeometry {
  const {
    padX = 0,
    padRight = padX,
    top = 20,
    bottom = 12,
    bleed = false,
  } = options;
  if (values.length === 0) {
    return { points: [], line: '', area: '' };
  }
  // A single value is a flat line across the width.
  const series = values.length === 1 ? [values[0], values[0]] : values;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const usable = height - top - bottom;
  const points = series.map((value, index) => ({
    x: padX + (index * (width - padX - padRight)) / (series.length - 1),
    y: top + usable - ((value - min) / span) * usable,
  }));

  // Path points: the marks, plus (bleed) one synthetic point at each edge
  // continuing the trend at half its slope.
  let path = points;
  if (bleed && points.length >= 2) {
    const [p0, p1] = points;
    const pl = points[points.length - 1];
    const pp = points[points.length - 2];
    const clampY = (y: number) =>
      Math.min(height - bottom, Math.max(top - 14, y));
    path = [
      { x: 0, y: clampY(p0.y - ((p1.y - p0.y) * p0.x) / (p1.x - p0.x) / 2) },
      ...points,
      {
        x: width,
        y: clampY(pl.y + ((pl.y - pp.y) * (width - pl.x)) / (pl.x - pp.x) / 2),
      },
    ];
  }

  let line = `M${path[0].x.toFixed(1)},${path[0].y.toFixed(1)}`;
  for (let i = 0; i < path.length - 1; i += 1) {
    const p0 = path[i - 1] ?? path[i];
    const p1 = path[i];
    const p2 = path[i + 1];
    const p3 = path[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    line += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(
      1,
    )},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  const tail = path[path.length - 1];
  const area = `${line} L${tail.x.toFixed(1)},${height} L${path[0].x.toFixed(
    1,
  )},${height} Z`;
  return { points, line, area };
}

export type ProgressCurveProps = {
  values: number[];
  width: number;
  height: number;
  // 'hero': white line, soft white area, dashed drop under the last point
  // (Progreso). 'record': Ember area and a labelled node per mark (Récord).
  variant?: 'hero' | 'record';
  // Labels over the nodes of the 'record' variant (the last one has none).
  labels?: string[];
  // Dashed placeholder for a user without data (Progreso vacío).
  placeholder?: boolean;
  gradientId?: string;
};

const EMBER = '#FF5B1F';

// Always drawn on a dark scene (Progreso hero, Récord plate).
export function ProgressCurve({
  values,
  width,
  height,
  variant = 'hero',
  labels = [],
  placeholder = false,
  gradientId = 'progressCurveArea',
}: ProgressCurveProps) {
  if (placeholder) {
    return (
      <Svg width={width} height={height}>
        <Path
          d={`M0,${height * 0.83} C${width * 0.2},${height * 0.83} ${
            width * 0.38
          },${height * 0.8} ${width * 0.56},${height * 0.67} C${width * 0.74},${
            height * 0.53
          } ${width * 0.86},${height * 0.42} ${width},${height * 0.33}`}
          fill="none"
          stroke="rgba(255,255,255,.18)"
          strokeWidth={2}
          strokeDasharray="4 6"
        />
      </Svg>
    );
  }

  const record = variant === 'record';
  const { points, line, area } = curveGeometry(values, width, height, {
    padX: record ? 28 : 0,
    // The hero's last point sits 21 pt from the edge (prototype: x = 372).
    padRight: record ? 28 : 21,
    top: record ? 40 : 24,
    bottom: record ? 20 : 14,
    bleed: record,
  });
  if (points.length === 0) {
    return <View style={{ width, height }} />;
  }
  const last = points[points.length - 1];

  return (
    <Svg width={width} height={height} style={{ overflow: 'visible' }}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop
            offset="0"
            stopColor={record ? EMBER : '#FFFFFF'}
            stopOpacity={record ? 0.3 : 0.14}
          />
          <Stop
            offset="1"
            stopColor={record ? EMBER : '#FFFFFF'}
            stopOpacity={0}
          />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${gradientId})`} />
      <Path
        d={line}
        fill="none"
        stroke={record ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.7)'}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {!record ? (
        <Line
          x1={last.x}
          y1={last.y}
          x2={last.x}
          y2={height}
          stroke="rgba(255,91,31,.5)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      ) : null}
      {points.map((point, index) => {
        const isLast = index === points.length - 1;
        if (!record && !isLast) {
          return null;
        }
        if (isLast) {
          return (
            <Fragment key={index}>
              <Circle
                cx={point.x}
                cy={point.y}
                r={record ? 13 : 14}
                fill={EMBER}
                opacity={0.22}
              />
              <Circle
                cx={point.x}
                cy={point.y}
                r={record ? 7 : 6}
                fill={EMBER}
              />
            </Fragment>
          );
        }
        return (
          <Fragment key={index}>
            <Circle
              cx={point.x}
              cy={point.y}
              r={4}
              fill="#141312"
              stroke="#FFFFFF"
              strokeWidth={2}
            />
            {labels[index] ? (
              <SvgText
                x={point.x}
                y={point.y - 14}
                fill="#A8A6A1"
                fontSize={13}
                fontWeight="600"
                textAnchor="middle"
              >
                {labels[index]}
              </SvgText>
            ) : null}
          </Fragment>
        );
      })}
    </Svg>
  );
}
