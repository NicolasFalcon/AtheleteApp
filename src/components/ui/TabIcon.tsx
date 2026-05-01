import type {ReactNode} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type TabIconProps = {
  focused: boolean;
  label?: string;
  icon?: ReactNode;
  isAccent?: boolean;
};

export function TabIcon({label, focused, icon, isAccent = false}: TabIconProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    badge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        isAccent || focused ? theme.colors.accent : theme.colors.surfaceMuted,
    },
    text: {
      color:
        isAccent || focused
          ? theme.colors.accentContrast
          : theme.colors.textSecondary,
      fontFamily: theme.typography.monoFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.bold,
    },
  });

  return (
    <View style={styles.badge}>
      {icon ?? (label ? <Text style={styles.text}>{label}</Text> : null)}
    </View>
  );
}
