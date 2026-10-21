import { useCallback, useEffect, type ReactNode, type RefObject } from 'react';
import { View, type ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { guideStore } from '@app/features/guides/guideStore';
import type { GuideTour } from '@app/features/guides/guideTours';

// A stable anchor for a guide step (25.10.9: never found by text). It only
// wraps: layout and touches go to the children as before; a touch that ends
// inside tells the guide (for "Toca lo iluminado").
export function GuideAnchor({
  id,
  style,
  pointerEvents,
  children,
}: {
  id: string;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
  children: ReactNode;
}) {
  const register = useCallback((view: View | null) => guideStore.registerAnchor(id, view), [id]);
  useEffect(() => () => guideStore.registerAnchor(id, null), [id]);
  return (
    <View
      ref={register}
      collapsable={false}
      style={style}
      pointerEvents={pointerEvents}
      onTouchEnd={() => guideStore.anchorTapped(id)}
    >
      {children}
    </View>
  );
}

const SHOW_AFTER_MS = 900;

// The tour of a screen: ~0.9 s after the screen gains focus, once per user.
// `scrollRef` lets the guide bring an element into view before its step.
// Leaving the screen closes it.
export function useGuide(
  tour: GuideTour,
  options: { enabled?: boolean; scrollRef?: RefObject<ScrollView | null> } = {},
) {
  const enabled = options.enabled ?? true;
  const scrollRef = options.scrollRef;
  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return undefined;
      }
      guideStore.registerScroll(tour, scrollRef?.current ?? null);
      const timer = setTimeout(() => guideStore.maybeStart(tour), SHOW_AFTER_MS);
      return () => {
        clearTimeout(timer);
        guideStore.closeIf(tour);
        guideStore.registerScroll(tour, null);
      };
    }, [enabled, scrollRef, tour]),
  );
}
