import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, TextV2 } from '@app/components/v2';
import { guideStore, useGuideState } from '@app/features/guides/guideStore';
import { GUIDE_COPY, GUIDE_TOURS, type GuideLanguage } from '@app/features/guides/guideTours';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';

// Guías · overlay (handoff v2.15 §25.4, COACH_01): a veil in four panels
// around the element (6 pt margin, its radius + 6), an Ember ring of 2 pt
// with an 8 pt halo at 22 %, and the dark card (16 pt from the sides, radius
// 22) under the element when it is in the upper half and above it otherwise
// (at 330 pt when the step has no element), with a 14 pt arrow. Transitions
// of 0.35 s; none under "Reducir movimiento". The same in both themes.
type Rect = { x: number; y: number; w: number; h: number };

const VEIL = 'rgba(10,9,8,.64)';
const MARGIN = 6;
const SIDE = 16;
const NO_ANCHOR_TOP = 330;
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
const MOVE_MS = 350;

function measure(view: { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void }): Promise<Rect | null> {
  return new Promise(resolve => {
    try {
      view.measureInWindow((x, y, w, h) => resolve(w > 0 && h > 0 ? { x, y, w, h } : null));
    } catch {
      resolve(null);
    }
  });
}

export function GuideOverlay() {
  const state = useGuideState();
  const active = state.active;
  const language: GuideLanguage = useProfileLanguage() === 'en' ? 'en' : 'es';
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);

  const step = active ? GUIDE_TOURS[active.tour][active.step] : null;
  const total = active ? GUIDE_TOURS[active.tour].length : 0;

  // Where the element is: brought into view first if needed, then followed
  // while the step is on screen (layout or scroll may move it).
  useEffect(() => {
    if (!active || !step) {
      setRect(null);
      setReady(false);
      return undefined;
    }
    let cancelled = false;
    setReady(false);
    const locate = async (allowScroll: boolean) => {
      const view = step.anchor ? guideStore.anchor(step.anchor) : null;
      if (!view) {
        return null;
      }
      let found = await measure(view);
      const scroll = guideStore.scroll(active.tour);
      const comfortable = found && found.y > insets.top + 56 && found.y + found.h < H - 140;
      if (allowScroll && scroll && found && !comfortable) {
        const inner = scroll.getInnerViewNode?.();
        const frameRef = scroll.getNativeScrollRef?.();
        if (inner && frameRef) {
          const contentY = await new Promise<number | null>(resolve => {
            try {
              (view as unknown as { measureLayout: (r: unknown, ok: (x: number, y: number) => void, fail: () => void) => void }).measureLayout(
                inner,
                (_x, y) => resolve(y),
                () => resolve(null),
              );
            } catch {
              resolve(null);
            }
          });
          const frame = await measure(frameRef as never);
          if (contentY !== null && frame) {
            const target = Math.max(0, contentY + found.h / 2 - (H * 0.42 - frame.y));
            scroll.scrollTo({ y: target, animated: !reduceMotion });
            await new Promise<void>(resolve => setTimeout(() => resolve(), reduceMotion ? 50 : 400));
            found = await measure(view);
          }
        }
      }
      return found;
    };
    locate(true).then(found => {
      if (!cancelled) {
        setRect(found);
        setReady(true);
      }
    });
    const follow = setInterval(() => {
      locate(false).then(found => {
        if (!cancelled && found) {
          setRect(current =>
            current &&
            Math.round(current.x) === Math.round(found.x) &&
            Math.round(current.y) === Math.round(found.y) &&
            Math.round(current.w) === Math.round(found.w) &&
            Math.round(current.h) === Math.round(found.h)
              ? current
              : found,
          );
        }
      });
    }, 300);
    return () => {
      cancelled = true;
      clearInterval(follow);
    };
    // A new step or tour re-locates; the rest is read inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.tour, active?.step]);

  // Hole of the veil (animated).
  const hx = useSharedValue(0);
  const hy = useSharedValue(0);
  const hw = useSharedValue(0);
  const hh = useSharedValue(0);
  useEffect(() => {
    const config = { duration: reduceMotion ? 0 : MOVE_MS, easing: EASE };
    const hole = rect
      ? { x: rect.x - MARGIN, y: rect.y - MARGIN, w: rect.w + MARGIN * 2, h: rect.h + MARGIN * 2 }
      : { x: W / 2, y: NO_ANCHOR_TOP, w: 0, h: 0 };
    hx.value = withTiming(hole.x, config);
    hy.value = withTiming(hole.y, config);
    hw.value = withTiming(hole.w, config);
    hh.value = withTiming(hole.h, config);
  }, [W, hh, hw, hx, hy, rect, reduceMotion]);

  const topStyle = useAnimatedStyle(() => ({ height: Math.max(0, hy.value) }));
  const bottomStyle = useAnimatedStyle(() => ({ top: hy.value + hh.value }));
  const leftStyle = useAnimatedStyle(() => ({ top: hy.value, height: hh.value, width: Math.max(0, hx.value) }));
  const rightStyle = useAnimatedStyle(() => ({ top: hy.value, height: hh.value, left: hx.value + hw.value }));
  const ringStyle = useAnimatedStyle(() => ({ left: hx.value, top: hy.value, width: hw.value, height: hh.value }));

  if (!active || !step || !ready) {
    return null;
  }

  const copy = GUIDE_COPY[language];
  const last = active.step >= total - 1;
  const below = rect ? rect.y + rect.h / 2 < H / 2 : true;
  const cardPosition = rect
    ? below
      ? { top: rect.y + rect.h + MARGIN + 16 }
      : { bottom: H - (rect.y - MARGIN) + 16 }
    : { top: NO_ANCHOR_TOP };
  const cardWidth = W - SIDE * 2;
  const arrowLeft = rect ? Math.min(cardWidth - 30, Math.max(16, rect.x + rect.w / 2 - SIDE - 7)) : 0;
  const radius = rect ? Math.min(rect.h / 2, 24) + MARGIN : 0;
  const entering = reduceMotion ? undefined : FadeIn.duration(250);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" accessibilityViewIsModal>
      {/* The veil takes the touches around the element; the hole lets them
          through to the element itself. */}
      <Animated.View style={[styles.panel, styles.top, topStyle]}>
        <Pressable style={StyleSheet.absoluteFill} accessible={false} />
      </Animated.View>
      <Animated.View style={[styles.panel, styles.bottom, bottomStyle]}>
        <Pressable style={StyleSheet.absoluteFill} accessible={false} />
      </Animated.View>
      <Animated.View style={[styles.panel, styles.left, leftStyle]}>
        <Pressable style={StyleSheet.absoluteFill} accessible={false} />
      </Animated.View>
      <Animated.View style={[styles.panel, styles.right, rightStyle]}>
        <Pressable style={StyleSheet.absoluteFill} accessible={false} />
      </Animated.View>
      {rect ? (
        <Animated.View pointerEvents="none" style={[styles.ring, { borderRadius: radius }, ringStyle]} />
      ) : null}

      <Animated.View
        key={`${active.tour}-${active.step}`}
        entering={entering}
        style={[styles.card, cardPosition, { left: SIDE, right: SIDE }]}
        accessibilityLiveRegion="polite"
      >
        {rect ? (
          <View style={[styles.arrow, below ? styles.arrowUp : styles.arrowDown, { left: arrowLeft }]} />
        ) : null}
        <View style={styles.head}>
          <View style={styles.counter}>
            <View style={styles.counterDot} />
            <TextV2 variant="eyebrow" color="#A8A6A1">
              {copy.counter(active.step + 1, total)}
            </TextV2>
          </View>
          <PressableScale accessibilityRole="button" onPress={() => guideStore.close()} style={styles.skip}>
            <TextV2 variant="captionStrong" color="#A8A6A1" style={styles.fs13}>
              {copy.skip}
            </TextV2>
          </PressableScale>
        </View>
        <View style={styles.texts}>
          <TextV2 color="#FFFFFF" style={styles.title} accessibilityRole="header">
            {step.title[language]}
          </TextV2>
          <TextV2 color="#D8D6D1" style={styles.body}>
            {step.body[language]}
          </TextV2>
        </View>
        <View style={styles.foot}>
          <View style={styles.dots}>
            {GUIDE_TOURS[active.tour].map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === active.step ? styles.dotOn : styles.dotOff]}
              />
            ))}
          </View>
          {step.tap && rect ? (
            <View style={styles.tapHint}>
              <BreathingDot still={reduceMotion} />
              <TextV2 variant="captionStrong" color="#FF8A5C" style={styles.fs13}>
                {copy.tap}
              </TextV2>
            </View>
          ) : (
            <PressableScale accessibilityRole="button" onPress={() => guideStore.next()} style={styles.next}>
              <TextV2 variant="bodyStrong" color="#121212" style={styles.fs14}>
                {last ? copy.done : copy.next}
              </TextV2>
            </PressableScale>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

function BreathingDot({ still }: { still: boolean }) {
  const breath = useSharedValue(1);
  useEffect(() => {
    if (still) {
      breath.value = 1;
      return undefined;
    }
    breath.value = withRepeat(withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(breath);
  }, [breath, still]);
  const style = useAnimatedStyle(() => ({ opacity: breath.value }));
  return <Animated.View style={[styles.breathDot, style]} />;
}

const styles = StyleSheet.create({
  panel: { position: 'absolute', backgroundColor: VEIL },
  top: { left: 0, right: 0, top: 0 },
  bottom: { left: 0, right: 0, bottom: 0 },
  left: { left: 0 },
  right: { right: 0 },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FF5B1F',
    boxShadow: '0 0 0 8px rgba(255,91,31,.22)',
  },
  card: {
    position: 'absolute',
    borderRadius: 22,
    backgroundColor: '#141312',
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 18,
    gap: 10,
    boxShadow: '0 0 0 0.5px rgba(255,255,255,.1), 0 18px 40px rgba(0,0,0,.45)',
  },
  arrow: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#141312',
    transform: [{ rotate: '45deg' }],
  },
  arrowUp: { top: -7 },
  arrowDown: { bottom: -7 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: -6, marginRight: -8 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  counterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF5B1F' },
  skip: { height: 44, paddingHorizontal: 8, justifyContent: 'center' },
  texts: { gap: 4 },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.17 },
  body: { fontSize: 14, lineHeight: 20 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { height: 4, borderRadius: 2 },
  dotOn: { width: 16, backgroundColor: '#FF5B1F' },
  dotOff: { width: 4, backgroundColor: 'rgba(255,255,255,.24)' },
  next: { height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  tapHint: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  breathDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5B1F' },
  fs13: { fontSize: 13 },
  fs14: { fontSize: 14 },
});
