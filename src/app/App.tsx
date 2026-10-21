import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GuideOverlay } from '@app/features/guides/GuideOverlay';
import { guideStore } from '@app/features/guides/guideStore';
import { useAuth } from '@app/hooks/useAuth';
import { LaunchOverlay } from '@app/app/LaunchOverlay';
import { AppProviders } from '@app/app/AppProviders';
import { RouteRecoveryGate } from '@app/features/route/v2/RouteRecoveryGate';
import { useTimezoneSync } from '@app/features/profile/useTimezoneSync';
import { useHealthSync } from '@app/features/health/healthStore';
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
  // Apple Health → sleep of the last 14 nights (launch and foreground).
  useHealthSync();
  // Guías: what this person has already seen on this device.
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  useEffect(() => {
    guideStore.setUser(userId).catch(() => undefined);
  }, [userId]);
  // catalog_version() at launch; the saved catalog and signed URLs load.
  useCatalogBoot();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <RootNavigator />
      {/* Guías (25.4): above the screens, below the launch overlay. */}
      <GuideOverlay />
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
