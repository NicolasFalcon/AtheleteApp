import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type TabBarMotionContextValue = {
  compactProgress: Animated.Value;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  tabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
};

export const TabBarMotionContext =
  createContext<TabBarMotionContextValue | null>(null);

export function TabBarMotionProvider({ children }: PropsWithChildren) {
  const compactProgress = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);
  const compact = useRef(false);
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tabBarVisible, setTabBarVisible] = useState(true);

  const animateTo = useCallback(
    (nextCompact: boolean) => {
      if (compact.current === nextCompact) {
        return;
      }

      compact.current = nextCompact;
      Animated.spring(compactProgress, {
        toValue: nextCompact ? 1 : 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 2,
      }).start();
    },
    [compactProgress],
  );

  const scheduleRestore = useCallback(() => {
    if (restoreTimer.current) {
      clearTimeout(restoreTimer.current);
    }

    restoreTimer.current = setTimeout(() => {
      animateTo(false);
    }, 650);
  }, [animateTo]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = Math.max(event.nativeEvent.contentOffset.y, 0);
      const delta = offset - lastOffset.current;

      if (offset < 18 || delta < -5) {
        animateTo(false);
      } else if (offset > 32 && delta > 5) {
        animateTo(true);
      }

      lastOffset.current = offset;
      scheduleRestore();
    },
    [animateTo, scheduleRestore],
  );

  const value = useMemo(
    () => ({ compactProgress, onScroll, tabBarVisible, setTabBarVisible }),
    [compactProgress, onScroll, tabBarVisible],
  );

  useEffect(
    () => () => {
      if (restoreTimer.current) {
        clearTimeout(restoreTimer.current);
      }
    },
    [],
  );

  return (
    <TabBarMotionContext.Provider value={value}>
      {children}
    </TabBarMotionContext.Provider>
  );
}
