import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useTabBarMetrics() {
  const height = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  return {
    height,
    bottomClearance: height + Math.max(insets.bottom, 8),
  };
}
