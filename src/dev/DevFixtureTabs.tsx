import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { TAB_ROUTES } from '@app/constants/routes';
import { TabBarV2 } from '@app/navigation/TabBarV2';
import { TabBarMotionProvider } from '@app/providers/TabBarMotionProvider';
import { CommunityScreen } from '@app/screens/tabs/CommunityScreen';
import type { MainTabParamList } from '@app/types/navigation';

// Development only (never mounted in a release build: RootNavigator renders
// it under `__DEV__`). The five tabs with the real bar, but only Comunidad
// has content: it lets the fixture-only screens open without a session. The
// other tabs read the database, so they stay empty here.
const Tab = createBottomTabNavigator<MainTabParamList>();

function renderTabBar(props: BottomTabBarProps) {
  return <TabBarV2 {...props} />;
}

function EmptyTab() {
  return <View />;
}

export function DevFixtureTabs() {
  return (
    <TabBarMotionProvider>
      <Tab.Navigator
        initialRouteName={TAB_ROUTES.Community}
        tabBar={renderTabBar}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name={TAB_ROUTES.Home} component={EmptyTab} />
        <Tab.Screen name={TAB_ROUTES.Workouts} component={EmptyTab} />
        <Tab.Screen name={TAB_ROUTES.Ellie} component={EmptyTab} />
        <Tab.Screen name={TAB_ROUTES.Progress} component={EmptyTab} />
        <Tab.Screen name={TAB_ROUTES.Community} component={CommunityScreen} />
      </Tab.Navigator>
    </TabBarMotionProvider>
  );
}
