import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type ToastOptions = {
  // Screens with the floating tab bar show the toast above it (D-27).
  withTabBar?: boolean;
  // 'error': a failed action (X instead of the Ember check).
  tone?: 'success' | 'error';
  // Distance from the bottom of the screen, for screens with a fixed footer
  // (Compartir): the toast sits above its buttons instead of covering them.
  bottomOffset?: number;
  // A tappable word after the message ("Ver semana"); it closes the toast.
  action?: { label: string; onPress: () => void };
};

type ToastState = {
  id: number;
  message: string;
  withTabBar: boolean;
  tone: 'success' | 'error';
  bottomOffset: number | null;
  action: ToastOptions['action'] | null;
};

type ToastContextValue = {
  show: (message: string, options?: ToastOptions) => void;
  hide: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// Functional confirmation ("Publicado para tus amigos"): dark pill with an
// Ember check, ~2.2 s, one at a time (a new toast replaces the current one).
export function ToastProvider({ children }: PropsWithChildren) {
  const { motion } = useThemeV2();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const hide = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setToast(null);
  }, []);

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      nextId.current += 1;
      setToast({
        id: nextId.current,
        message,
        withTabBar: options?.withTabBar ?? false,
        tone: options?.tone ?? 'success',
        bottomOffset: options?.bottomOffset ?? null,
        action: options?.action ?? null,
      });
      timer.current = setTimeout(() => {
        timer.current = null;
        setToast(null);
      }, motion.toast.visible);
    },
    [motion.toast.visible],
  );

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const value = useMemo(() => ({ show, hide }), [hide, show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastPill key={toast.id} toast={toast} onAction={hide} /> : null}
    </ToastContext.Provider>
  );
}

function ToastPill({ toast, onAction }: { toast: ToastState; onAction: () => void }) {
  const { colors, layout, shadow, radius, motion } = useThemeV2();
  const insets = useSafeAreaInsets();
  const bottom =
    toast.bottomOffset !== null
      ? toast.bottomOffset
      : toast.withTabBar
      ? layout.tabBarBottom + layout.tabBarHeight + 12
      : insets.bottom + 16;

  return (
    <View pointerEvents={toast.action ? 'box-none' : 'none'} style={[styles.host, { bottom }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        entering={FadeInDown.duration(motion.toast.enter)}
        exiting={FadeOut.duration(200)}
        style={[
          styles.pill,
          {
            borderRadius: radius.circle44,
            backgroundColor: colors.cta.primary,
            boxShadow: shadow.toast,
          },
        ]}
      >
        {toast.tone === 'error' ? (
          <View style={[styles.check, { backgroundColor: colors.ember.deep }]}>
            <X color={colors.ember.onText} size={15} strokeWidth={2.5} />
          </View>
        ) : (
          <View style={[styles.check, { backgroundColor: colors.ember.base }]}>
            <Check color={colors.ember.onText} size={15} strokeWidth={2.5} />
          </View>
        )}
        <TextV2
          variant="label"
          color={colors.cta.primaryText}
          numberOfLines={1}
          style={styles.message}
        >
          {toast.message}
        </TextV2>
        {toast.action ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              onAction();
              toast.action?.onPress();
            }}
          >
            <TextV2 variant="label" color={colors.ember.base}>
              {toast.action.label}
            </TextV2>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider.');
  }

  return context;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    height: 44,
    paddingLeft: 8,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '92%',
  },
  message: { flexShrink: 1 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
