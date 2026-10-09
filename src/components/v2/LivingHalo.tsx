import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type EllieOrbState = 'breathing' | 'thinking' | 'offline';

export type EllieOrbProps = {
  size?: number; // 36–120
  state?: EllieOrbState;
  style?: StyleProp<ViewStyle>;
};

// Warm ivory → peach → sand, light from the top-left (handoff §3.4).
const ORB_STOPS = [
  { offset: 0, color: '#FFFFFF' },
  { offset: 0.3, color: '#F8EDE3' },
  { offset: 0.68, color: '#E9D1BE' },
  { offset: 1, color: '#CFAC92' },
];
// Offline: the same sphere, desaturated and switched off.
const OFFLINE_STOPS = [
  { offset: 0, color: '#F4F3F1' },
  { offset: 0.3, color: '#E6E4E0' },
  { offset: 0.68, color: '#CFCCC6' },
  { offset: 1, color: '#AEAAA4' },
];

// react-native-svg ignores the alpha of rgba() in stopColor, so the halo
// token is split into an opaque colour plus stopOpacity.
function splitRgba(value: string): { color: string; alpha: number } {
  const match = value.match(/rgba\(([^)]+)\)/);

  if (!match) {
    return { color: value, alpha: 1 };
  }

  const [r, g, b, a = '1'] = match[1].split(',').map(part => part.trim());
  return { color: `rgb(${r},${g},${b})`, alpha: Number(a) };
}

// ELLIE's presence: a breathing orb with a warm halo. Never a card.
export function EllieOrb({
  size = 64,
  state = 'breathing',
  style,
}: EllieOrbProps) {
  const { motion, colors } = useThemeV2();
  const breath = useSharedValue(0);
  const offline = state === 'offline';
  const duration =
    state === 'thinking' ? motion.orb.thinkingDuration : motion.orb.duration;

  useEffect(() => {
    if (offline) {
      cancelAnimation(breath);
      breath.value = 0;
      return;
    }

    breath.value = 0;
    breath.value = withRepeat(
      withTiming(1, {
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );

    return () => cancelAnimation(breath);
  }, [breath, duration, offline]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (motion.orb.scale - 1) * breath.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity:
      motion.halo.from + (motion.halo.to - motion.halo.from) * breath.value,
    transform: [{ scale: 1 + (motion.halo.scale - 1) * breath.value }],
  }));

  const haloSize = size * 1.9;
  const halo = splitRgba(colors.ellie.halo);
  const stops = offline ? OFFLINE_STOPS : ORB_STOPS;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={
        offline
          ? 'ELLIE sin conexión'
          : state === 'thinking'
          ? 'ELLIE pensando'
          : 'ELLIE'
      }
      style={[styles.box, { width: size, height: size }, style]}
    >
      {!offline ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              width: haloSize,
              height: haloSize,
              left: (size - haloSize) / 2,
              top: (size - haloSize) / 2,
            },
            haloStyle,
          ]}
        >
          <Svg width={haloSize} height={haloSize}>
            <Defs>
              <RadialGradient id="ellieHalo" cx="50%" cy="50%" r="50%">
                <Stop
                  offset="0"
                  stopColor={halo.color}
                  stopOpacity={halo.alpha}
                />
                <Stop offset="1" stopColor={halo.color} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle
              cx={haloSize / 2}
              cy={haloSize / 2}
              r={haloSize / 2}
              fill="url(#ellieHalo)"
            />
          </Svg>
        </Animated.View>
      ) : null}
      <Animated.View style={[orbStyle, { opacity: offline ? 0.75 : 1 }]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient
              id={offline ? 'ellieOrbOff' : 'ellieOrb'}
              cx="34%"
              cy="28%"
              r="78%"
              fx="34%"
              fy="28%"
            >
              {stops.map(stop => (
                <Stop
                  key={stop.offset}
                  offset={stop.offset}
                  stopColor={stop.color}
                />
              ))}
            </RadialGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2}
            fill={`url(#${offline ? 'ellieOrbOff' : 'ellieOrb'})`}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
  },
});
