import { createContext, useContext, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

// Air between the status bar and the hairline.
const TOP_SAFE_BAR_GAP = 1;

// Height of the TopSafeBar above the current screen (0: full-screen route).
const TopSafeBarHeightContext = createContext(0);

export function useTopSafeBarHeight(): number {
  return useContext(TopSafeBarHeightContext);
}

function useBarHeight(): number {
  return useSafeAreaInsets().top + TOP_SAFE_BAR_GAP;
}

// B-01 · Solid bar behind the status bar, in the theme background, with a
// hairline. Every stack screen renders it as its header (STACK_SCREEN_OPTIONS)
// so no content ever scrolls under the status bar and iOS 26 never draws its
// scroll edge effect.
// 'scene': the dark plate of a screen that is always dark (Login), without
// the hairline, so the bar melts into the screen.
export function TopSafeBar({ variant = 'theme' }: { variant?: 'theme' | 'scene' }) {
  const { colors, scene } = useThemeV2();
  const height = useBarHeight();

  return (
    <View
      style={
        variant === 'scene'
          ? { height, backgroundColor: scene.plate }
          : [
              styles.bar,
              {
                height,
                backgroundColor: colors.bg,
                borderBottomColor: colors.divider,
              },
            ]
      }
    />
  );
}

export type TopSafeBarContentProps = PropsWithChildren<{
  barShown: boolean;
}>;

// Screen content of every stack route. A nested SafeAreaProvider measures the
// insets of the content itself: below the TopSafeBar insets.top is 0, so the
// screens that add insets.top on their own get no double space; full-screen
// routes (no bar) still get the real status bar inset.
export function TopSafeBarContent({ barShown, children }: TopSafeBarContentProps) {
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  const barHeight = useBarHeight();

  return (
    <TopSafeBarHeightContext.Provider value={barShown ? barHeight : 0}>
      <SafeAreaProvider
        initialMetrics={{
          insets: barShown ? { ...insets, top: 0 } : insets,
          frame,
        }}
      >
        {children}
      </SafeAreaProvider>
    </TopSafeBarHeightContext.Provider>
  );
}

// For content that leaves the screen for the whole window (a full-screen RN
// Modal): real insets again and no bar.
export function WindowSafeArea({ children }: PropsWithChildren) {
  return (
    <TopSafeBarHeightContext.Provider value={0}>
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </TopSafeBarHeightContext.Provider>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
