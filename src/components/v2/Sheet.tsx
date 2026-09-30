import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { GlassSurface } from '@app/components/v2/GlassSurface';
import { IconButton } from '@app/components/v2/IconButton';
import { Eyebrow, TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  // Fixed glass footer (cancel + primary 1:2, or only primary).
  footer?: ReactNode;
  scrollable?: boolean;
  // Sheets without the standard header (e.g. Apple Health invitation).
  hideHeader?: boolean;
};

const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 900;

// Shared bottom sheet (handoff §5): radius 28, grabber 36×5, overlay backdrop
// that closes on tap, drag down to close, max ~88 % of the screen.
// Built on React Native's Modal (not a portal) so it keeps the theme,
// SceneScope/ThemeV2ModeScope, auth and navigation context of its caller.
export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  scrollable = false,
  hideHeader = false,
}: SheetProps) {
  const { colors, radius, shadow, layout, mode, motion, easing } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  const progress = useSharedValue(0); // 0 hidden → 1 shown
  const drag = useSharedValue(0);
  const isLight = mode === 'light';

  useEffect(() => {
    if (open) {
      setMounted(true);
      drag.value = 0;
      progress.value = withTiming(1, {
        duration: motion.sheet.duration,
        easing: Easing.bezier(...easing.sheet),
      });
    } else {
      progress.value = withTiming(
        0,
        { duration: motion.backdrop.duration },
        finished => {
          if (finished) {
            runOnJS(setMounted)(false);
          }
        },
      );
    }
  }, [
    drag,
    easing.sheet,
    motion.backdrop.duration,
    motion.sheet.duration,
    open,
    progress,
  ]);

  const pan = Gesture.Pan()
    .onUpdate(event => {
      drag.value = Math.max(0, event.translationY);
    })
    .onEnd(event => {
      if (
        event.translationY > CLOSE_DISTANCE ||
        event.velocityY > CLOSE_VELOCITY
      ) {
        runOnJS(onClose)();
      } else {
        drag.value = withSpring(0, { damping: 20, stiffness: 240 });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (1 - progress.value) * screenHeight + drag.value },
    ],
  }));

  const Body = scrollable ? ScrollView : View;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.overlay },
            backdropStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar hoja"
            style={styles.fill}
            onPress={onClose}
          />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={styles.bottom}
        >
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.panel,
              {
                maxHeight: Math.round(screenHeight * 0.88),
                backgroundColor: isLight ? colors.bg : colors.surface.raised,
                borderTopLeftRadius: radius.sheet,
                borderTopRightRadius: radius.sheet,
                boxShadow: shadow.sheet,
              },
              panelStyle,
            ]}
          >
            <GestureDetector gesture={pan}>
              <View>
                <View style={styles.grabberArea}>
                  <View
                    style={[
                      styles.grabber,
                      { backgroundColor: colors.outline.strong },
                    ]}
                  />
                </View>
                {!hideHeader ? (
                  <View
                    style={[
                      styles.header,
                      { paddingHorizontal: layout.gutter },
                    ]}
                  >
                    <View style={styles.headerTexts}>
                      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
                      {title ? (
                        <TextV2 variant="section" accessibilityRole="header">
                          {title}
                        </TextV2>
                      ) : null}
                    </View>
                    <IconButton
                      icon={X}
                      size={36}
                      accessibilityLabel="Cerrar"
                      onPress={onClose}
                    />
                  </View>
                ) : null}
              </View>
            </GestureDetector>
            <Body style={[styles.body, { paddingHorizontal: layout.gutter }]}>
              {children}
            </Body>
            {footer ? (
              <GlassSurface
                kind="nav"
                style={[
                  styles.footer,
                  {
                    paddingHorizontal: layout.gutter,
                    paddingBottom: Math.max(insets.bottom, 16),
                  },
                ]}
              >
                {footer}
              </GlassSurface>
            ) : (
              <View style={{ height: Math.max(insets.bottom, 16) }} />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  bottom: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
  },
  panel: {
    overflow: 'hidden',
  },
  grabberArea: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 16,
  },
  headerTexts: {
    flex: 1,
    gap: 4,
  },
  body: {
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    marginTop: 12,
  },
});
