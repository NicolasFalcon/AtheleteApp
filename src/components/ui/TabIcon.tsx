import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type TabIconProps = {
  focused: boolean;
  label?: string;
  icon?: ReactNode;
  isAccent?: boolean;
};

export function TabIcon({
  label,
  focused,
  icon,
  isAccent = false,
}: TabIconProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    badge: {
      width: focused ? 38 : 34,
      height: focused ? 38 : 34,
      borderRadius: focused ? 19 : 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        isAccent || focused ? theme.colors.accent : 'transparent',
    },
    badgeFocused: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.mode === 'dark' ? 0.24 : 0.16,
      shadowRadius: 8,
      elevation: 4,
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
    <View style={[styles.badge, focused ? styles.badgeFocused : null]}>
      {icon ?? (label ? <Text style={styles.text}>{label}</Text> : null)}
    </View>
  );
}
