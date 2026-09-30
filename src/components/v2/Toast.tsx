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
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type ToastOptions = {
  // Screens with the floating tab bar show the toast above it (D-27).
  withTabBar?: boolean;
};

type ToastState = { id: number; message: string; withTabBar: boolean };

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
      {toast ? <ToastPill key={toast.id} toast={toast} /> : null}
    </ToastContext.Provider>
  );
}

function ToastPill({ toast }: { toast: ToastState }) {
  const { colors, layout, shadow, radius, motion } = useThemeV2();
  const insets = useSafeAreaInsets();
  const bottom = toast.withTabBar
    ? layout.tabBarBottom + layout.tabBarHeight + 12
    : insets.bottom + 16;

  return (
    <View pointerEvents="none" style={[styles.host, { bottom }]}>
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
        <View style={[styles.check, { backgroundColor: colors.ember.base }]}>
          <Check color={colors.ember.onText} size={15} strokeWidth={2.5} />
        </View>
        <TextV2
          variant="label"
          color={colors.cta.primaryText}
          numberOfLines={1}
        >
          {toast.message}
        </TextV2>
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
    maxWidth: '90%',
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
