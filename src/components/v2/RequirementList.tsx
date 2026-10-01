import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type Requirement = {
  label: string;
  met: boolean;
};

export type RequirementListProps = {
  requirements: Requirement[];
  style?: StyleProp<ViewStyle>;
};

// Live checklist (passwords): an empty 18 pt ring that turns into an Ember
// check with a pop when the requirement is met (handoff §5 Input, §13).
export function RequirementList({ requirements, style }: RequirementListProps) {
  const { colors } = useThemeV2();

  return (
    <View accessibilityRole="summary" style={[styles.list, style]}>
      {requirements.map(requirement => (
        <View
          key={requirement.label}
          accessible
          accessibilityLabel={`${requirement.label}: ${
            requirement.met ? 'cumplido' : 'pendiente'
          }`}
          style={styles.row}
        >
          {requirement.met ? (
            <Animated.View
              entering={ZoomIn.duration(400)}
              style={[styles.dot, { backgroundColor: colors.ember.base }]}
            >
              <Check color={colors.ember.onText} size={11} strokeWidth={3} />
            </Animated.View>
          ) : (
            <View
              style={[
                styles.dot,
                { borderWidth: 1.5, borderColor: colors.outline.control },
              ]}
            />
          )}
          <TextV2
            variant="meta"
            tone={requirement.met ? 'primary' : 'secondary'}
          >
            {requirement.label}
          </TextV2>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    padding: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
