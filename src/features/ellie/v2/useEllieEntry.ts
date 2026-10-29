import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { ELLIE_ENTRY, blockFrame } from '@app/features/ellie/v2/ellieEntryModel';

type TabNavigation = {
  addListener: (event: 'tabPress' | 'blur', callback: () => void) => () => void;
};

// Plays the entry of the ELLIE cover every time the tab is opened (the
// prototype re-renders the screen each time): label, voice and answers rise
// as one block. Coming from the tab bar it also starts again from the top.
// AURA itself enters with the normal screen transition (§28.2: the v2.11
// growth from the tab is not implemented). "Reducir movimiento": everything
// appears at once. All on the UI thread.
export function useEllieEntry(navigation: TabNavigation, onTabEntry: () => void) {
  const reduceMotion = useReducedMotion();
  const block = useSharedValue(1);
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
        block.value = 1;
        return;
      }
      const viaTab = fromTab.current;
      fromTab.current = false;
      if (viaTab) {
        onTabEntry(); // back to the top, as a fresh screen
      }
      block.value = 0;
      block.value = withDelay(
        ELLIE_ENTRY.block.delay,
        withTiming(1, {
          duration: ELLIE_ENTRY.block.duration,
          easing: Easing.bezier(...ELLIE_ENTRY.block.bezier),
        }),
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reduceMotion]),
  );

  const blockStyle = useAnimatedStyle(() => {
    const frame = blockFrame(block.value);
    return { opacity: frame.opacity, transform: [{ translateY: frame.translateY }] };
  });

  return { blockStyle };
}
