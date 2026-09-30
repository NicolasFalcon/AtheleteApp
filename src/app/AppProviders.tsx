import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@app/app/queryClient';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { AuthProvider } from '@app/providers/AuthProvider';
import { ThemeProvider } from '@app/providers/ThemeProvider';

function AppNavigation({children}: PropsWithChildren) {
  const {isDark, theme} = useAppTheme();

  const navigationTheme = {
    ...(isDark ? NavigationDarkTheme : NavigationDefaultTheme),
    colors: {
      ...(isDark ? NavigationDarkTheme.colors : NavigationDefaultTheme.colors),
      background: theme.colors.background,
      border: theme.colors.border,
      card: theme.colors.surface,
      notification: theme.colors.accent,
      primary: theme.colors.accent,
      text: theme.colors.textPrimary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      {/* v2 sheets render here, so they keep theme, auth and navigation context. */}
      <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
    </NavigationContainer>
  );
}

export function AppProviders({children}: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AppNavigation>{children}</AppNavigation>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
