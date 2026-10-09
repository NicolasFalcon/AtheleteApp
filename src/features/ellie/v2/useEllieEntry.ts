import { useCallback, useRef } from 'react';
import { useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeV2 } from '@app/components/v2';
import {
  ELLIE_ENTRY,
  blockFrame,
  haloFrame,
  tabIconCenterY,
} from '@app/features/ellie/v2/ellieEntryModel';
import { tabBarBottomOffset } from '@app/navigation/TabBarV2';

type TabNavigation = {
  addListener: (event: 'tabPress' | 'blur', callback: () => void) => () => void;
};

// Plays the entry of the ELLIE cover every time the tab is opened (the
// prototype re-renders the screen each time): the halo grows from the tab
// icon (only when it comes from the tab bar, not when coming back from the
// chat), then label, voice and answers rise as one block. "Reducir
// movimiento": everything appears at once. All on the UI thread.
export function useEllieEntry(navigation: TabNavigation, onTabEntry: () => void) {
  const reduceMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { layout } = useThemeV2();
  const flip = useSharedValue(1);
  const block = useSharedValue(1);
  const sourceY = useSharedValue(0);
  const targetY = useSharedValue(0);
  const contentTop = useRef(0);
  const fromTab = useRef(false);

  // Pressing the tab marks the next focus as "coming from the tab bar".
  useFocusEffect(
    useCallback(() => {
      const offTab = navigation.addListener('tabPress', () => {
        fromTab.current = true;
      });
      const offBlur = navigation.addListener('blur', () => {
        fromTab.current = false;
      });
      return () => {
        offTab();
        offBlur();
      };
    }, [navigation]),
  );

  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) {
        flip.value = 1;
        block.value = 1;
        return;
      }
      const viaTab = fromTab.current;
      fromTab.current = false;
      if (viaTab) {
        onTabEntry(); // back to the top, as a fresh screen
      }
      sourceY.value = tabIconCenterY(height, tabBarBottomOffset(insets.bottom), layout.tabBarHeight);
      flip.value = viaTab ? 0 : 1;
      block.value = 0;
      if (viaTab) {
        flip.value = withTiming(1, {
          duration: ELLIE_ENTRY.halo.duration,
          easing: Easing.bezier(...ELLIE_ENTRY.halo.bezier),
        });
      }
      block.value = withDelay(
        ELLIE_ENTRY.block.delay,
        withTiming(1, {
          duration: ELLIE_ENTRY.block.duration,
          easing: Easing.bezier(...ELLIE_ENTRY.block.bezier),
        }),
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reduceMotion, height, insets.bottom]),
  );

  // Position of the halo wrapper inside the opening block; `top` is where the
  // opening block starts in the scroll content.
  const onHaloLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y, height: h } = event.nativeEvent.layout;
      targetY.value = contentTop.current + y + h / 2;
    },
    [targetY],
  );

  const haloStyle = useAnimatedStyle(() => {
    const frame = haloFrame(flip.value, sourceY.value, targetY.value);
    return {
      opacity: frame.opacity,
      transform: [{ translateY: frame.translateY }, { scale: frame.scale }],
    };
  });
  const blockStyle = useAnimatedStyle(() => {
    const frame = blockFrame(block.value);
    return { opacity: frame.opacity, transform: [{ translateY: frame.translateY }] };
  });

  return {
    haloStyle,
    blockStyle,
    onHaloLayout,
    setContentTop: (value: number) => {
      contentTop.current = value;
    },
  };
}
