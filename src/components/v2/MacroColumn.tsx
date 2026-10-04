import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type MacroColumnProps = {
  label: string;
  value: number;
  goal: number;
  pct: number; // 0–100
};

// Macro column (Nutrición): a 120 pt box that fills from the bottom with the
// share of the goal, the percentage inside and the figure under it.
export function MacroColumn({ label, value, goal, pct }: MacroColumnProps) {
  const { colors } = useThemeV2();
  const height = useSharedValue(0);

  useEffect(() => {
    height.value = withTiming(Math.min(100, Math.max(0, pct)), {
      duration: 600,
    });
  }, [height, pct]);

  const fill = useAnimatedStyle(() => ({ height: `${height.value}%` }));

  return (
    <View
      style={styles.column}
      accessible
      accessibilityLabel={`${label}: ${value} de ${goal} gramos, ${pct} por ciento`}
    >
      <View style={[styles.box, { backgroundColor: colors.surface.muted }]}>
        <Animated.View style={[styles.fill, fill]}>
          <View style={[StyleSheet.absoluteFill, styles.ink]} />
        </Animated.View>
        <TextV2
          variant="metaStrong"
          color={pct > 80 ? '#FFFFFF' : colors.text.secondary}
          style={styles.pct}
        >
          {`${pct} %`}
        </TextV2>
      </View>
      <View>
        <View style={styles.figure}>
          <TextV2 variant="title22" style={styles.value}>
            {value}
          </TextV2>
          <TextV2
            variant="caption"
            color={colors.text.secondary}
          >{`/ ${goal} g`}</TextV2>
        </View>
        <TextV2 variant="meta" color={colors.text.secondary} numberOfLines={1}>
          {label}
        </TextV2>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1, gap: 10 },
  box: { height: 120, borderRadius: 20, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  ink: { backgroundColor: '#1C1A18' },
  pct: { position: 'absolute', left: 12, top: 10 },
  figure: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  value: { fontWeight: '600' },
});
