import { StatusBar } from 'react-native';
import { LaunchOverlay } from '@app/app/LaunchOverlay';
import { AppProviders } from '@app/app/AppProviders';
import { RouteRecoveryGate } from '@app/features/route/v2/RouteRecoveryGate';
import { useTimezoneSync } from '@app/features/profile/useTimezoneSync';
import { useRouteQueueFlush } from '@app/features/route/useRouteQueueFlush';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { RootNavigator } from '@app/navigation/RootNavigator';

function AppContent() {
  const {isDark, theme} = useAppTheme();
  useRouteQueueFlush();
  useTimezoneSync();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <RootNavigator />
      <RouteRecoveryGate />
      <LaunchOverlay />
    </>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
