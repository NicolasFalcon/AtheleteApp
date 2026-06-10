import type { ComponentProps } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type IconProps = Omit<ComponentProps<typeof Svg>, 'viewBox'> & {
  color?: string;
};

export function ProfileIcon({
  color = '#BDBDBD',
  width = 24,
  height = 24,
  ...props
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" {...props}>
      <Circle cx="12" cy="7" r="5" fill={color} />
      <Path
        d="M5.31 21.633c-1.684-.721-2.367-2.755-1.253-4.21A9.985 9.985 0 0 1 12 13.5a9.985 9.985 0 0 1 7.943 3.923c1.114 1.455.431 3.489-1.253 4.21A16.95 16.95 0 0 1 12 23a16.95 16.95 0 0 1-6.69-1.367Z"
        fill={color}
      />
    </Svg>
  );
}

export function EmailIcon({
  color = '#BDBDBD',
  width = 24,
  height = 24,
  ...props
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" {...props}>
      <Path
        d="M20 4H4a2 2 0 0 0-1.99 2L2 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm-.4 4.25-7.07 4.42a1 1 0 0 1-1.06 0L4.4 8.25a.84.84 0 0 1 .9-1.44L12 11l6.7-4.19a.84.84 0 0 1 .9 1.44Z"
        fill={color}
      />
    </Svg>
  );
}

export function PhoneIcon({
  color = '#BDBDBD',
  width = 24,
  height = 24,
  ...props
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" {...props}>
      <Path
        d="m16.117 15.68-.619.928a.97.97 0 0 1-.502.4c-.705.187-2.577.271-5.425-2.579-2.85-2.849-2.766-4.72-2.58-5.425a.97.97 0 0 1 .401-.502l.928-.619a1.5 1.5 0 0 0 .417-2.085L6.984 3.17a1.5 1.5 0 0 0-1.843-.548l-.79.339a2.92 2.92 0 0 0-1.383 1.303 3.9 3.9 0 0 0-.459 1.548c-.081 1.718.296 5.952 5.012 10.668 4.715 4.715 8.949 5.092 10.667 5.011a3.9 3.9 0 0 0 1.548-.459 2.92 2.92 0 0 0 1.303-1.383l.339-.79a1.5 1.5 0 0 0-.548-1.843l-2.628-1.753a1.5 1.5 0 0 0-2.085.417Z"
        fill={color}
      />
    </Svg>
  );
}

export function PrivacyIcon({
  color = '#BDBDBD',
  width = 24,
  height = 24,
  ...props
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" {...props}>
      <Path
        d="M20 12a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-10 0v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8ZM9 7a3 3 0 0 1 6 0v3H9V7Z"
        fill={color}
      />
    </Svg>
  );
}

export function EyeIcon({
  color = '#BDBDBD',
  width = 22,
  height = 22,
  ...props
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" {...props}>
      <Path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx="12"
        cy="12"
        r="2.8"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
      />
    </Svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  const color = props.color ?? '#BDBDBD';

  return (
    <Svg
      width={props.width ?? 22}
      height={props.height ?? 22}
      viewBox="0 0 24 24"
      {...props}
    >
      <Path
        d="M3 3l18 18M10.6 6.15A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a15.4 15.4 0 0 1-2.35 2.9M6.35 7.35A16.2 16.2 0 0 0 2.5 12s3.5 6 9.5 6a9.6 9.6 0 0 0 3.05-.5M9.88 9.88a3 3 0 0 0 4.24 4.24"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BackIcon({
  color = '#BDBDBD',
  width = 22,
  height = 22,
  ...props
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" {...props}>
      <Path
        d="m15 18-6-6 6-6"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SuccessIcon({
  color = '#F6F4EE',
  width = 88,
  height = 88,
  ...props
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 88 88" {...props}>
      <Circle
        cx="44"
        cy="44"
        r="42"
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="m27 44 11 11 23-24"
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
