import { Fragment } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type StepProgressProps = {
  // Block index of every step, e.g. [0,0,0,1,1,2,2,2] for the onboarding.
  blocks: number[];
  current: number;
  style?: StyleProp<ViewStyle>;
};

// Segmented bar of a guided flow (onboarding · 8 steps in 3 blocks): one
// 4 pt segment per step, an extra 8 pt gap between blocks, filled up to the
// current step.
export function StepProgress({ blocks, current, style }: StepProgressProps) {
  const { colors } = useThemeV2();

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: blocks.length, now: current + 1 }}
      style={[styles.row, style]}
    >
      {blocks.map((block, index) => (
        <Fragment key={index}>
          {index > 0 && blocks[index - 1] !== block ? (
            <View style={styles.blockGap} />
          ) : null}
          <View
            style={[
              styles.segment,
              {
                backgroundColor:
                  index <= current ? colors.text.primary : colors.divider,
              },
            ]}
          />
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  blockGap: {
    width: 4,
  },
});
