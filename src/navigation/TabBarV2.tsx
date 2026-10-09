import { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EllieOrb,
  GlassSurface,
  PressableScale,
  TextV2,
  haptics,
  useThemeV2,
} from '@app/components/v2';
import { TabIcon, type TabIconName } from '@app/navigation/tabIcons';
import { TAB_ROUTES } from '@app/constants/routes';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import type { MainTabParamList } from '@app/types/navigation';

type TabName = keyof MainTabParamList;

// `icon: null` = ELLIE, drawn with its orb instead of an SVG.
const TAB_ITEMS: Record<TabName, { label: string; icon: TabIconName | null }> = {
  [TAB_ROUTES.Home]: { label: 'Inicio', icon: 'home' },
  [TAB_ROUTES.Workouts]: { label: 'Entrenos', icon: 'workouts' },
  [TAB_ROUTES.Ellie]: { label: 'ELLIE', icon: null },
  [TAB_ROUTES.Progress]: { label: 'Progreso', icon: 'progress' },
  [TAB_ROUTES.Community]: { label: 'Comunidad', icon: 'community' },
};

// Distance from the screen bottom to the floating bar (shell: 24, or the
// home indicator inset minus 10 when that is larger).
export function tabBarBottomOffset(insetBottom: number) {
  return Math.max(24, insetBottom - 10);
}

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}

type TabItemProps = {
  name: TabName;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

function TabItem({ name, focused, onPress, onLongPress }: TabItemProps) {
  const { colors, radius } = useThemeV2();
  const { label, icon } = TAB_ITEMS[name];
  // Active: no background, Ember icon and label. Inactive: icon at 50 %.
  const labelColor = focused ? colors.ember.base : colors.text.secondary;

  return (
    <PressableScale
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.item, { borderRadius: radius.tabItem }]}
    >
      <View style={styles.itemContent}>
        <View style={[styles.icon, !focused && styles.inactiveIcon]}>
          {icon ? (
            <TabIcon
              name={icon}
              active={focused}
              color={colors.text.primary}
              ember={colors.ember.base}
            />
          ) : (
            <EllieOrb size={24} />
          )}
        </View>
        <TextV2
          variant="micro"
          color={labelColor}
          style={focused ? styles.labelActive : styles.label}
          numberOfLines={1}
        >
          {label}
        </TextV2>
      </View>
    </PressableScale>
  );
}

// v2 floating tab bar (shell): glass pill 68 pt, 16 from the sides, items
// 62×56 with the active one in Ember (no pill). Hidden while
// the keyboard is open and while a screen asks for it (ELLIE chat).
export function TabBarV2({ state, navigation }: BottomTabBarProps) {
  const { radius, shadow, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { tabBarVisible } = useTabBarMotion();
  const keyboardVisible = useKeyboardVisible();

  if (!tabBarVisible || keyboardVisible) {
    return null;
  }

  return (
    <View
      style={[
        styles.shell,
        {
          height: layout.tabBarHeight,
          left: layout.floatingGutter,
          right: layout.floatingGutter,
          bottom: tabBarBottomOffset(insets.bottom),
          borderRadius: radius.tabBar,
          boxShadow: shadow.floatTab,
        },
      ]}
    >
      <GlassSurface
        kind="tab"
        style={[styles.glass, { borderRadius: radius.tabBar }]}
      >
        <View accessibilityRole="tablist" style={styles.row}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const name = route.name as TabName;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                haptics.selection();
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            return (
              <TabItem
                key={route.key}
                name={name}
                focused={focused}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
  },
  glass: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 3,
  },
  item: {
    width: 62,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  icon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIcon: {
    opacity: 0.5,
  },
  label: {
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '600',
  },
});
