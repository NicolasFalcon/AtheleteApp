import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layoutV2 } from '@app/theme/v2';
import { tabBarBottomOffset } from '@app/navigation/TabBarV2';

// Geometry of the v2 floating tab bar. Pure layout maths (no navigator
// hooks), so it never throws on a screen outside the tabs.
export function useTabBarMetrics() {
  const insets = useSafeAreaInsets();
  // Space the bar takes from the bottom edge of the screen.
  const height = layoutV2.tabBarHeight + tabBarBottomOffset(insets.bottom);

  return {
    height,
    bottomClearance: Math.max(layoutV2.tabBarClearance, height + 16),
  };
}
