import { useEffect, type PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@app/app/queryClient';
import { ToastProvider } from '@app/components/v2/Toast';
import { usePlayQueueSync } from '@app/features/play/usePlay';
import { useSessionFeedbackSync } from '@app/features/session/feedbackQueue';
import { useSessionLink } from '@app/features/session/useSessionLink';
import { useOrphanLiveActivityCleanup } from '@app/features/session/useSessionLiveActivity';
import { useSessionOutboxSync } from '@app/features/session/useSessionOutboxSync';
import { loadFeedbackPrefs } from '@app/lib/feedbackPrefs';
import { navigationRef } from '@app/navigation/navigationRef';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { AuthProvider } from '@app/providers/AuthProvider';
import { ThemeProvider } from '@app/providers/ThemeProvider';

function AppNavigation({ children }: PropsWithChildren) {
  const { isDark, theme } = useAppTheme();
  useSessionOutboxSync();
  // Play rounds finished offline.
  usePlayQueueSync();
  // Check-ins, discomforts and ratings answered offline (sfb-1).
  useSessionFeedbackSync();
  // Tapping the workout Live Activity opens the running session.
  useSessionLink();
  // Live Activities and rest notifications with no session open (a killed
  // app…): ended at launch and on every return to the foreground.
  useOrphanLiveActivityCleanup();

  // Ajustes · Sonido y Vibración, once per launch (each screen preloads
  // its own sounds).
  useEffect(() => {
    loadFeedbackPrefs().catch(() => undefined);
  }, []);

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
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </NavigationContainer>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
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
