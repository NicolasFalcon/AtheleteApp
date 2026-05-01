import type {PropsWithChildren} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type ChipProps = PropsWithChildren<{
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}>;

export function Chip({children, selected = false, onPress, style}: ChipProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    chip: {
      minHeight: 34,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: selected ? theme.colors.accent : theme.colors.border,
      backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    label: {
      color: selected ? theme.colors.accentContrast : theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.medium,
    },
  });

  const content = (
    <View style={[styles.chip, style]}>
      {typeof children === 'string' ? (
        <Text style={styles.label}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        pressed ? {transform: [{scale: 0.98}]} : null,
      ]}>
      {content}
    </Pressable>
  );
}
