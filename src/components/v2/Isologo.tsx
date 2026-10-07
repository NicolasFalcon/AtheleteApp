import Svg, { Path, Polygon } from 'react-native-svg';

type IsologoProps = {
  size: number;
  color: string;
};

// Geometry of design/launch-screen/.../svg/athelete-isologo-*.svg (viewBox 480):
// the same drawing as the app icon and the native launch screen.
export function Isologo({ size, color }: IsologoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 480 480">
      <Path
        fill={color}
        fillRule="evenodd"
        d="M0.25,240a239.75,239.75 0 1,0 479.5,0a239.75,239.75 0 1,0 -479.5,0ZM29.090000000000003,240a210.91,210.91 0 1,0 421.82,0a210.91,210.91 0 1,0 -421.82,0Z"
      />
      <Polygon fill={color} points="186.5,206.5 107.5,324.5 145.5,324.5 203.5,234.5" />
      <Polygon fill={color} points="239.5,123.5 223.5,150.5 335.5,324.5 372.5,324.5" />
    </Svg>
  );
}
