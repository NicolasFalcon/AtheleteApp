import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type WaterTankProps = {
  glasses: number;
  goal: number;
  progress: number; // 0–1
  onAdd: () => void;
  disabled?: boolean;
};

// Water tank (Nutrición): the level rises with every glass, with the count
// at the bottom left and the "+1 vaso" action at the right. Recovery Blue.
export function WaterTank({
  glasses,
  goal,
  progress,
  onAdd,
  disabled = false,
}: WaterTankProps) {
  const { colors, mode } = useThemeV2();
  const level = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    level.value = withSpring(Math.min(1, Math.max(0, progress)) * 100, {
      damping: 14,
      stiffness: 120,
    });
    pop.value = 1.08;
    pop.value = withSpring(1, { damping: 8, stiffness: 200 });
  }, [glasses, level, pop, progress]);

  const fill = useAnimatedStyle(() => ({ height: `${level.value}%` }));
  const count = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  // Recovery Blue: #A9BFD8 → #6E8FB3 (prototype), in both modes.
  const [top, bottom] = ['#A9BFD8', '#6E8FB3'];
  const dark = mode === 'dark';

  return (
    <View style={[styles.tank, { backgroundColor: colors.recovery.tintBg }]}>
      <Animated.View style={[styles.fill, fill]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: bottom }]} />
        <View style={[styles.sheen, { backgroundColor: top }]} />
        <View
          style={[styles.surface, { backgroundColor: colors.recovery.light }]}
        />
      </Animated.View>
      <View style={styles.ticks} pointerEvents="none">
        {Array.from({ length: Math.min(goal, 20) }, (_, index) => (
          <View
            key={index}
            style={[
              styles.tick,
              index > 0
                ? { borderTopColor: 'rgba(46,72,104,.08)', borderTopWidth: 1 }
                : null,
            ]}
          />
        ))}
      </View>
      <Animated.View style={[styles.count, count]}>
        <TextV2
          variant="title28"
          color={colors.text.primary}
          style={styles.number}
        >
          {glasses}
        </TextV2>
        <TextV2
          variant="bodyL"
          color={dark ? '#D8E4F2' : '#1E2E42'}
        >{`de ${goal} vasos`}</TextV2>
      </Animated.View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Sumar un vaso de agua"
        disabled={disabled}
        onPress={onAdd}
        style={[
          styles.add,
          dark
            ? { backgroundColor: 'rgba(255,255,255,.2)' }
            : { backgroundColor: colors.cta.primary },
        ]}
      >
        <Plus
          size={18}
          color={dark ? '#FFFFFF' : colors.cta.primaryText}
          strokeWidth={2.2}
        />
        <TextV2
          variant="bodyStrong"
          color={dark ? '#FFFFFF' : colors.cta.primaryText}
        >
          1 vaso
        </TextV2>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  tank: { height: 190, borderRadius: 28, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '35%',
    opacity: 0.55,
  },
  surface: {
    position: 'absolute',
    left: '-10%',
    right: '-10%',
    top: -8,
    height: 16,
    borderRadius: 8,
    opacity: 0.8,
  },
  ticks: { ...StyleSheet.absoluteFill },
  tick: { flex: 1 },
  count: {
    position: 'absolute',
    left: 20,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  number: {
    fontSize: 48,
    lineHeight: 50,
    fontWeight: '600',
    letterSpacing: -1.9,
  },
  add: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
