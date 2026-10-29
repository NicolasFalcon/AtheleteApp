import { useState, type ReactNode } from 'react';
import {
  createNativeBottomTabNavigator,
  type NativeBottomTabIcon,
} from '@react-navigation/bottom-tabs/unstable';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useThemeV2 } from '@app/components/v2';
import { TAB_ROUTES } from '@app/constants/routes';
import { useUnreadNotifications } from '@app/features/social/useSocial';
import { consumePostOnboardingTab } from '@app/lib/postOnboarding';
import { CommunityScreen } from '@app/screens/tabs/CommunityScreen';
import { EllieScreen } from '@app/screens/tabs/EllieScreen';
import { HomeScreen } from '@app/screens/tabs/HomeScreen';
import { ProgressScreen } from '@app/screens/tabs/ProgressScreen';
import { WorkoutsScreen } from '@app/screens/tabs/WorkoutsScreen';
import type { MainTabParamList } from '@app/types/navigation';

const Tab = createNativeBottomTabNavigator<MainTabParamList>();

// Our own line icons (handoff v2.12 `icons/tab-*.svg`, 24 pt, 1.6 stroke, no
// fill) as template PNGs on iOS and Android: the active one only changes
// colour through the Ember tint.
const HOME_ICON: NativeBottomTabIcon = {
  type: 'image',
  source: require('@app/assets/tab-icons/tab-home.png'),
};
const WORKOUTS_ICON: NativeBottomTabIcon = {
  type: 'image',
  source: require('@app/assets/tab-icons/tab-workouts.png'),
};
const PROGRESS_ICON: NativeBottomTabIcon = {
  type: 'image',
  source: require('@app/assets/tab-icons/tab-progress.png'),
};
const COMMUNITY_ICON: NativeBottomTabIcon = {
  type: 'image',
  source: require('@app/assets/tab-icons/tab-community.png'),
};
// ELLIE: static AURA small at rest (§28.2), untinted so the arc stays Ember.
const ELLIE_IMAGES = {
  light: require('@app/assets/v2/tabs/tab-ellie-light.png'),
  dark: require('@app/assets/v2/tabs/tab-ellie-dark.png'),
};

// Each tab gets its own safe-area provider: it measures the tab's native
// view, so `useSafeAreaInsets().bottom` includes the system tab bar and the
// screens pad only the bottom edge (no automatic top inset under TopSafeBar).
function renderTabLayout({ children }: { children: ReactNode }) {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}

// The 5 v2 tabs on the system tab bar (Liquid Glass on iOS 26, the standard
// bar on iOS ≤ 18 and Android). They render their root screens directly;
// detail and immersive screens (session, focus, route, ELLIE chat) live in
// the root stack above them, so the bar hides on its own.
export function MainTabNavigator() {
  const { colors, mode } = useThemeV2();
  const unread = useUnreadNotifications();
  // Right after the onboarding the user may have chosen "Hablar con ELLIE".
  const [initialTab] = useState(
    () => consumePostOnboardingTab() ?? TAB_ROUTES.Home,
  );

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      screenLayout={renderTabLayout}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ember.base,
        tabBarBadgeStyle: { backgroundColor: colors.ember.base, color: '#FFFFFF' },
        overrideScrollViewContentInsetAdjustmentBehavior: false,
      }}
    >
      <Tab.Screen
        name={TAB_ROUTES.Home}
        component={HomeScreen}
        options={{ tabBarLabel: 'Inicio', tabBarIcon: HOME_ICON }}
      />
      <Tab.Screen
        name={TAB_ROUTES.Workouts}
        component={WorkoutsScreen}
        options={{ tabBarLabel: 'Entrenos', tabBarIcon: WORKOUTS_ICON }}
      />
      <Tab.Screen
        name={TAB_ROUTES.Ellie}
        component={EllieScreen}
        options={{
          tabBarLabel: 'ELLIE',
          tabBarIcon: {
            type: 'image',
            source: ELLIE_IMAGES[mode === 'light' ? 'light' : 'dark'],
            tinted: false,
          },
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.Progress}
        component={ProgressScreen}
        options={{ tabBarLabel: 'Progreso', tabBarIcon: PROGRESS_ICON }}
      />
      <Tab.Screen
        name={TAB_ROUTES.Community}
        component={CommunityScreen}
        options={{
          tabBarLabel: 'Comunidad',
          tabBarIcon: COMMUNITY_ICON,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
    </Tab.Navigator>
  );
}
