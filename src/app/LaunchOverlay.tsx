import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFirstScreenReady } from '@app/app/launchGate';
import { Isologo } from '@app/components/v2/Isologo';
import { LaunchWordmark } from '@app/components/v2/LaunchWordmark';
import { useThemeContext } from '@app/providers/ThemeProvider';
import { palette } from '@app/theme/v2/palette';
import { darkColorsV2, lightColorsV2 } from '@app/theme/v2/colors';

// Same measures as LaunchScreen.storyboard (design/launch-screen/INTEGRACION.md).
const LOGO_SIZE = 96;
const WORDMARK_WIDTH = 112;
const WORDMARK_BOTTOM = 44;
const BREATH_SCALE = 1.02;
const BREATH_MS = 2400;
const FADE_MS = 250;
// If something never reports ready, do not trap the user behind the logo.
const MAX_WAIT_MS = 10000;

// Repeats the native launch screen (same background per system appearance,
// isologo and wordmark in the same place) until session, theme and first
// screen are ready, then fades out. The isologo breathes softly while it
// waits. Reduce Motion: no breathing and a straight cut.
export function LaunchOverlay() {
  // The system appearance is what the native screen used; the stored theme
  // preference may differ, so it is not applied until the overlay is gone.
  const dark = useColorScheme() === 'dark';
  const colors = dark ? darkColorsV2 : lightColorsV2;
  const wordmarkColor = dark ? palette.ivorySecondary : palette.onDarkTertiary;
  const insets = useSafeAreaInsets();
  const { isReady: themeReady } = useThemeContext();
  const firstScreenReady = useFirstScreenReady();
  const [timedOut, setTimedOut] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const ready = (themeReady && firstScreenReady) || timedOut;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(value => {
        if (!cancelled) {
          setReduceMotion(value);
        }
      });
    const timer = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion !== false || ready) {
      return;
    }
    const half = {
      duration: BREATH_MS / 2,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    };
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: BREATH_SCALE, ...half }),
        Animated.timing(scale, { toValue: 1, ...half }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ready, reduceMotion, scale]);

  useEffect(() => {
    if (!ready || reduceMotion === null) {
      return;
    }
    if (reduceMotion) {
      setVisible(false);
      return;
    }
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [opacity, ready, reduceMotion]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="auto"
      style={[styles.root, { backgroundColor: colors.bg, opacity }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Isologo size={LOGO_SIZE} color={colors.text.primary} />
      </Animated.View>
      <View
        style={[styles.wordmark, { bottom: insets.bottom + WORDMARK_BOTTOM }]}>
        <LaunchWordmark width={WORDMARK_WIDTH} color={wordmarkColor} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    position: 'absolute',
    alignSelf: 'center',
  },
});
