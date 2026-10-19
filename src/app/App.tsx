import { StatusBar } from 'react-native';
import { LaunchOverlay } from '@app/app/LaunchOverlay';
import { AppProviders } from '@app/app/AppProviders';
import { RouteRecoveryGate } from '@app/features/route/v2/RouteRecoveryGate';
import { useTimezoneSync } from '@app/features/profile/useTimezoneSync';
import { PushPermissionHost } from '@app/features/push/PushPermissionHost';
import { useLocalReminders } from '@app/features/push/useLocalReminders';
import { usePushEvents } from '@app/features/push/usePushEvents';
import { usePushRegistration } from '@app/features/push/usePushRegistration';
import { useRouteQueueFlush } from '@app/features/route/useRouteQueueFlush';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useCatalogBoot } from '@app/hooks/useCatalog';
import { RootNavigator } from '@app/navigation/RootNavigator';

function AppContent() {
  const {isDark, theme} = useAppTheme();
  useRouteQueueFlush();
  useTimezoneSync();
  usePushRegistration();
  usePushEvents();
  useLocalReminders();
  // catalog_version() at launch; the saved catalog and signed URLs load.
  useCatalogBoot();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <RootNavigator />
      <RouteRecoveryGate />
      <PushPermissionHost />
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
