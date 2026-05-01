import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import {Home, Dumbbell, Sparkles, TrendingUp, User} from 'lucide-react-native';
import {StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { TAB_ROUTES } from '@app/constants/routes';
import { TabIcon } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';
import {EllieStackNavigator} from '@app/navigation/EllieStackNavigator';
import {HomeStackNavigator} from '@app/navigation/HomeStackNavigator';
import {ProfileStackNavigator} from '@app/navigation/ProfileStackNavigator';
import {ProgressStackNavigator} from '@app/navigation/ProgressStackNavigator';
import {WorkoutsStackNavigator} from '@app/navigation/WorkoutsStackNavigator';
import type {AppTheme} from '@app/theme/theme';
import type { MainTabParamList } from '@app/types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_LABELS = {
  Home: 'Inicio',
  Workouts: 'Entrenos',
  Ellie: 'ELLIE',
  Progress: 'Progreso',
  Profile: 'Perfil',
} as const;

function renderTabIcon(
  routeName: keyof MainTabParamList,
  focused: boolean,
  theme: AppTheme,
) {
  if (routeName === TAB_ROUTES.Ellie) {
    return (
      <TabIcon
        focused={focused}
        isAccent={focused}
        icon={
          <Sparkles
            color={
              focused ? theme.colors.accentContrast : theme.colors.textSecondary
            }
            size={16}
            strokeWidth={focused ? 2.4 : 2}
          />
        }
      />
    );
  }

  const color = focused ? theme.colors.textPrimary : theme.colors.textSecondary;
  const strokeWidth = focused ? 2.4 : 1.9;

  if (routeName === TAB_ROUTES.Home) {
    return <Home color={color} size={19} strokeWidth={strokeWidth} />;
  }

  if (routeName === TAB_ROUTES.Workouts) {
    return <Dumbbell color={color} size={19} strokeWidth={strokeWidth} />;
  }

  if (routeName === TAB_ROUTES.Progress) {
    return <TrendingUp color={color} size={19} strokeWidth={strokeWidth} />;
  }

  return <User color={color} size={19} strokeWidth={strokeWidth} />;
}

export function MainTabNavigator() {
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    tabBar: {
      height: 62 + insets.bottom,
      paddingBottom: Math.max(insets.bottom, 8),
      paddingTop: 6,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    tabLabel: {
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.medium,
    },
  });

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({focused}) =>
          renderTabIcon(route.name as keyof MainTabParamList, focused, theme),
      })}>
      <Tab.Screen
        name={TAB_ROUTES.Home}
        component={HomeStackNavigator}
        options={{tabBarLabel: TAB_LABELS.Home}}
      />
      <Tab.Screen
        name={TAB_ROUTES.Workouts}
        component={WorkoutsStackNavigator}
        options={{tabBarLabel: TAB_LABELS.Workouts}}
      />
      <Tab.Screen
        name={TAB_ROUTES.Ellie}
        component={EllieStackNavigator}
        options={{tabBarLabel: TAB_LABELS.Ellie}}
      />
      <Tab.Screen
        name={TAB_ROUTES.Progress}
        component={ProgressStackNavigator}
        options={{tabBarLabel: TAB_LABELS.Progress}}
      />
      <Tab.Screen
        name={TAB_ROUTES.Profile}
        component={ProfileStackNavigator}
        options={{tabBarLabel: TAB_LABELS.Profile}}
      />
    </Tab.Navigator>
  );
}
