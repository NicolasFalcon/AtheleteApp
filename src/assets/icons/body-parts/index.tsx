import type { ComponentProps } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type BodyPartIconProps = Omit<ComponentProps<typeof Svg>, 'viewBox'> & {
  color?: string;
};

type BodyPart =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'glutes';

const highlights: Record<BodyPart, string[]> = {
  chest: ['M9 10.5c1.1-.7 2-.9 3-.9s1.9.2 3 .9', 'M12 9.6v3.2'],
  back: ['M9 9.8c.8 1.1 1.8 1.7 3 1.7s2.2-.6 3-1.7', 'M12 7.8v6'],
  legs: ['M10.3 15.3 9.4 22', 'M13.7 15.3l.9 6.7'],
  shoulders: ['M6.8 9.8c1.2-1.3 2.2-1.8 3.2-1.8', 'M17.2 9.8C16 8.5 15 8 14 8'],
  arms: ['M7.3 10.1 5.7 16', 'M16.7 10.1l1.6 5.9'],
  core: ['M10 12h4', 'M10.2 14.2h3.6', 'M12 11.4v4.8'],
  glutes: ['M9.2 15.1c.6 1 1.5 1.5 2.8 1.5s2.2-.5 2.8-1.5', 'M12 14.7v2'],
};

function BodyPartIcon({
  part,
  color = '#6F6C64',
  width = 24,
  height = 24,
  ...props
}: BodyPartIconProps & { part: BodyPart }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" {...props}>
      <Circle
        cx="12"
        cy="4.2"
        r="2.1"
        fill="none"
        stroke={color}
        strokeWidth={1.55}
      />
      <Path
        d="M9.4 7.1 7 9.3 5.2 15.8M14.6 7.1 17 9.3l1.8 6.5M9.4 7.1c.6.5 1.5.8 2.6.8s2-.3 2.6-.8l.9 7.1-1.8 7.1M9.4 7.1l-.9 7.1 1.8 7.1M8.5 14.2c2.3.8 4.7.8 7 0"
        fill="none"
        stroke={color}
        strokeWidth={1.45}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {highlights[part].map(path => (
        <Path
          key={path}
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export function ChestBodyPartIcon(props: BodyPartIconProps) {
  return <BodyPartIcon {...props} part="chest" />;
}

export function BackBodyPartIcon(props: BodyPartIconProps) {
  return <BodyPartIcon {...props} part="back" />;
}

export function LegsBodyPartIcon(props: BodyPartIconProps) {
  return <BodyPartIcon {...props} part="legs" />;
}

export function ShouldersBodyPartIcon(props: BodyPartIconProps) {
  return <BodyPartIcon {...props} part="shoulders" />;
}

export function ArmsBodyPartIcon(props: BodyPartIconProps) {
  return <BodyPartIcon {...props} part="arms" />;
}

export function CoreBodyPartIcon(props: BodyPartIconProps) {
  return <BodyPartIcon {...props} part="core" />;
}

export function GlutesBodyPartIcon(props: BodyPartIconProps) {
  return <BodyPartIcon {...props} part="glutes" />;
}
