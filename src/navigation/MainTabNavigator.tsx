import { useState } from 'react';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { TAB_ROUTES } from '@app/constants/routes';
import { consumePostOnboardingTab } from '@app/lib/postOnboarding';
import { TabBarV2 } from '@app/navigation/TabBarV2';
import { TabBarMotionProvider } from '@app/providers/TabBarMotionProvider';
import { CommunityScreen } from '@app/screens/tabs/CommunityScreen';
import { EllieScreen } from '@app/screens/tabs/EllieScreen';
import { HomeScreen } from '@app/screens/tabs/HomeScreen';
import { ProgressScreen } from '@app/screens/tabs/ProgressScreen';
import { WorkoutsScreen } from '@app/screens/tabs/WorkoutsScreen';
import type { MainTabParamList } from '@app/types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

function renderTabBar(props: BottomTabBarProps) {
  return <TabBarV2 {...props} />;
}

// The 5 v2 tabs render their root screens directly; detail and immersive
// screens live in the root stack above them, so the bar hides on its own.
export function MainTabNavigator() {
  // Right after the onboarding the user may have chosen "Hablar con ELLIE".
  const [initialTab] = useState(
    () => consumePostOnboardingTab() ?? TAB_ROUTES.Home,
  );

  return (
    <TabBarMotionProvider>
      <Tab.Navigator
        initialRouteName={initialTab}
        tabBar={renderTabBar}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name={TAB_ROUTES.Home} component={HomeScreen} />
        <Tab.Screen name={TAB_ROUTES.Workouts} component={WorkoutsScreen} />
        <Tab.Screen name={TAB_ROUTES.Ellie} component={EllieScreen} />
        <Tab.Screen name={TAB_ROUTES.Progress} component={ProgressScreen} />
        <Tab.Screen name={TAB_ROUTES.Community} component={CommunityScreen} />
      </Tab.Navigator>
    </TabBarMotionProvider>
  );
}
