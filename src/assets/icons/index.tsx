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

export function SunIcon({
  color = '#BDBDBD',
  width = 20,
  height = 20,
  ...props
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" {...props}>
      <Circle
        cx="12"
        cy="12"
        r="3.5"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MoonIcon({
  color = '#BDBDBD',
  width = 20,
  height = 20,
  ...props
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" {...props}>
      <Path
        d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MaleIcon({
  color = '#BDBDBD',
  width = 52,
  height = 52,
  ...props
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 80 80" {...props}>
      <Path
        d="M45 10v5h16.465L42.245 34.223a20.1 20.1 0 1 0 3.535 3.535L65 18.535V35h5V10H45ZM30 65a15 15 0 1 1 0-30 15 15 0 0 1 0 30Z"
        fill={color}
      />
    </Svg>
  );
}

export function FemaleIcon({
  color = '#BDBDBD',
  width = 52,
  height = 52,
  ...props
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 80 80" {...props}>
      <Path
        d="M42.5 49.843A20 20 0 1 0 37.5 49.843v5.175H25v5h12.5v10h5v-10H55v-5H42.5v-5.175ZM25 30.018a15 15 0 1 1 30 0 15 15 0 0 1-30 0Z"
        fill={color}
      />
    </Svg>
  );
}

export function WeightIcon({
  color = '#BDBDBD',
  width = 24,
  height = 24,
  ...props
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" {...props}>
      <Path
        d="M18.436 0H5.564C2.76 0 .572 2.425.862 5.211l1.514 14.554A4.73 4.73 0 0 0 7.078 24h9.844a4.73 4.73 0 0 0 4.702-4.235l1.514-14.554C23.428 2.425 21.24 0 18.436 0Zm1.54 7.696-3.831 4.4a.7.7 0 0 1-.53.241h-7.23a.7.7 0 0 1-.53-.241l-3.831-4.4a.7.7 0 0 1 0-.922C6.148 4.335 8.981 2.991 12 2.991s5.852 1.344 7.976 3.783a.7.7 0 0 1 0 .922Z"
        fill={color}
      />
    </Svg>
  );
}

export function HeightIcon({
  color = '#BDBDBD',
  width = 24,
  height = 24,
  ...props
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" {...props}>
      <Path
        d="M12 1.2v2.4h4.8V6H12v2.4h2.4v2.4H12v2.4h4.8v2.4H12V18h2.4v2.4H12v2.4c0 .662.538 1.2 1.2 1.2h7.2c.662 0 1.2-.538 1.2-1.2V1.2c0-.662-.538-1.2-1.2-1.2h-7.2c-.662 0-1.2.538-1.2 1.2ZM3.505 4.8c-.43 0-.66-.507-.375-.83l2.495-2.84a.5.5 0 0 1 .751 0l2.495 2.84c.284.323.054.83-.376.83H7.2v18.7a.5.5 0 0 1-.5.5H5.3a.5.5 0 0 1-.5-.5V4.8H3.505Z"
        fill={color}
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
