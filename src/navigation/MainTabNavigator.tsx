import { useState } from 'react';
import {
  BottomTabBar,
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import {
  Home,
  Dumbbell,
  Sparkles,
  TrendingUp,
  User,
} from 'lucide-react-native';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_ROUTES } from '@app/constants/routes';
import { TabIcon } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import { EllieStackNavigator } from '@app/navigation/EllieStackNavigator';
import { HomeStackNavigator } from '@app/navigation/HomeStackNavigator';
import { ProfileStackNavigator } from '@app/navigation/ProfileStackNavigator';
import { ProgressStackNavigator } from '@app/navigation/ProgressStackNavigator';
import { WorkoutsStackNavigator } from '@app/navigation/WorkoutsStackNavigator';
import { TabBarMotionProvider } from '@app/providers/TabBarMotionProvider';
import type { AppTheme } from '@app/theme/theme';
import type { MainTabParamList } from '@app/types/navigation';
import { consumePostOnboardingTab } from '@app/lib/postOnboarding';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ROOT_ROUTES: Record<keyof MainTabParamList, string> = {
  [TAB_ROUTES.Home]: 'HomeRoot',
  [TAB_ROUTES.Workouts]: 'WorkoutsRoot',
  [TAB_ROUTES.Ellie]: 'EllieRoot',
  [TAB_ROUTES.Progress]: 'ProgressRoot',
  [TAB_ROUTES.Profile]: 'ProfileRoot',
};

function isTabRootRoute(
  tabName: keyof MainTabParamList,
  focusedRouteName?: string,
) {
  return (
    (focusedRouteName ?? TAB_ROOT_ROUTES[tabName]) === TAB_ROOT_ROUTES[tabName]
  );
}

function FloatingTabBar(props: BottomTabBarProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { compactProgress, tabBarVisible } = useTabBarMotion();
  const activeRoute = props.state.routes[props.state.index];
  const nestedRouteName = activeRoute
    ? getFocusedRouteNameFromRoute(activeRoute)
    : undefined;
  const visible =
    activeRoute &&
    isTabRootRoute(activeRoute.name as keyof MainTabParamList, nestedRouteName);

  if (!visible || !tabBarVisible) {
    return null;
  }

  const styles = StyleSheet.create({
    shell: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: Math.max(insets.bottom, 8),
      borderRadius: 25,
      shadowColor: '#000000',
      ...(theme.mode === 'dark'
        ? {
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 24,
            elevation: 8,
          }
        : theme.elevations.floating),
    },
  });

  const animatedStyle = {
    opacity: compactProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.94],
    }),
    transform: [
      {
        translateY: compactProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 5],
        }),
      },
      {
        scaleX: compactProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.94],
        }),
      },
      {
        scaleY: compactProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.84],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.shell, animatedStyle]}>
      <BottomTabBar {...props} />
    </Animated.View>
  );
}

function renderFloatingTabBar(props: BottomTabBarProps) {
  return <FloatingTabBar {...props} />;
}

function renderTabIcon(
  routeName: keyof MainTabParamList,
  focused: boolean,
  theme: AppTheme,
) {
  const color = focused
    ? theme.colors.accentContrast
    : theme.colors.textSecondary;
  const strokeWidth = focused ? 2.4 : 1.9;
  let icon;

  if (routeName === TAB_ROUTES.Home) {
    icon = <Home color={color} size={19} strokeWidth={strokeWidth} />;
  } else if (routeName === TAB_ROUTES.Workouts) {
    icon = <Dumbbell color={color} size={19} strokeWidth={strokeWidth} />;
  } else if (routeName === TAB_ROUTES.Ellie) {
    icon = <Sparkles color={color} size={18} strokeWidth={strokeWidth} />;
  } else if (routeName === TAB_ROUTES.Progress) {
    icon = <TrendingUp color={color} size={19} strokeWidth={strokeWidth} />;
  } else {
    icon = <User color={color} size={19} strokeWidth={strokeWidth} />;
  }

  return <TabIcon focused={focused} isAccent={focused} icon={icon} />;
}

export function MainTabNavigator() {
  // Right after the onboarding the user may have chosen "Hablar con ELLIE".
  const [initialTab] = useState(
    () => consumePostOnboardingTab() ?? TAB_ROUTES.Home,
  );
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    tabBar: {
      height: 58,
      paddingHorizontal: 10,
      paddingVertical: 0,
      borderTopWidth: 0,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor:
        theme.mode === 'dark'
          ? 'rgba(246,244,238,0.12)'
          : 'rgba(17,17,17,0.08)',
      borderRadius: 25,
      backgroundColor:
        theme.mode === 'dark'
          ? 'rgba(18,18,18,0.92)'
          : 'rgba(255,255,255,0.92)',
      overflow: 'hidden',
    },
    tabBarHidden: {
      display: 'none',
    },
    tabItem: {
      height: 58,
    },
    tabIcon: {
      width: 40,
      height: 40,
      marginTop: 2,
    },
  });

  return (
    <TabBarMotionProvider>
      <Tab.Navigator
        initialRouteName={initialTab}
        tabBar={renderFloatingTabBar}
        screenOptions={({ route }) => {
          const tabName = route.name as keyof MainTabParamList;
          const focusedRouteName = getFocusedRouteNameFromRoute(route);
          const showTabBar = isTabRootRoute(tabName, focusedRouteName);

          return {
            headerShown: false,
            tabBarShowLabel: false,
            tabBarActiveTintColor: theme.colors.textPrimary,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarStyle: [
              styles.tabBar,
              !showTabBar ? styles.tabBarHidden : null,
            ],
            tabBarItemStyle: styles.tabItem,
            tabBarIconStyle: styles.tabIcon,
            tabBarHideOnKeyboard: true,
            tabBarIcon: ({ focused }) => renderTabIcon(tabName, focused, theme),
          };
        }}
      >
        <Tab.Screen name={TAB_ROUTES.Home} component={HomeStackNavigator} />
        <Tab.Screen
          name={TAB_ROUTES.Workouts}
          component={WorkoutsStackNavigator}
        />
        <Tab.Screen name={TAB_ROUTES.Ellie} component={EllieStackNavigator} />
        <Tab.Screen
          name={TAB_ROUTES.Progress}
          component={ProgressStackNavigator}
        />
        <Tab.Screen
          name={TAB_ROUTES.Profile}
          component={ProfileStackNavigator}
        />
      </Tab.Navigator>
    </TabBarMotionProvider>
  );
}
