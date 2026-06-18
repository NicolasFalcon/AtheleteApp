import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MoonIcon, SunIcon } from '@app/assets/icons';
import { useAppTheme } from '@app/hooks/useAppTheme';

export function AuthTopActions({ children }: PropsWithChildren) {
  return (
    <View accessibilityRole="toolbar" style={styles.actions}>
      {children}
    </View>
  );
}

export function AuthThemeToggle() {
  const { mode, setPreferredMode, theme } = useAppTheme();
  const nextMode = mode === 'dark' ? 'light' : 'dark';
  const iconColor = theme.colors.textPrimary;

  return (
    <AuthTopActions>
      <Pressable
        accessibilityLabel={
          nextMode === 'dark' ? 'Usar tema oscuro' : 'Usar tema claro'
        }
        accessibilityRole="button"
        hitSlop={6}
        onPress={() => setPreferredMode(nextMode)}
        style={({ pressed }) => [
          styles.actionButton,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
          },
          pressed ? styles.pressed : null,
        ]}
      >
        {nextMode === 'dark' ? (
          <MoonIcon color={iconColor} />
        ) : (
          <SunIcon color={iconColor} />
        )}
      </Pressable>
    </AuthTopActions>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
