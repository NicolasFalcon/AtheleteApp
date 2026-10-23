import { Fragment } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type StepProgressProps = {
  // Block index of every step, e.g. [0,0,0,1,1,2,2,2] for the onboarding.
  blocks: number[];
  current: number;
  style?: StyleProp<ViewStyle>;
};

// Segmented bar of a guided flow (onboarding · 9 steps in 3 blocks · 4·2·3):
// one 3 pt segment per step and a wider gap between blocks. Done steps in
// the text colour, the current one in Ember, pending ones in the divider.
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
                  index === current
                    ? colors.ember.base
                    : index < current
                    ? colors.text.primary
                    : colors.divider,
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
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
  },
  blockGap: {
    width: 8,
  },
});
