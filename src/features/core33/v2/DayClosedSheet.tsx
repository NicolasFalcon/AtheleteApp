import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  Keyframe,
  ReduceMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { dayClosedCopy } from '@app/features/core33/core33Model';
import { CORE33_TOTAL_DAYS } from '@app/shared/domain/core33';
import { alpha, palette } from '@app/theme/v2/palette';
import { em } from '@app/theme/v2/typography';

// Values of §27.2 without a token of their own.
const SCRIM = 'rgba(10,10,10,.45)';
const HANDLE = 'rgba(255,255,255,.18)';
const CAPSULE_OPEN = 'rgba(255,255,255,.08)';
const NEXT_RING = 'rgba(255,255,255,.5)';

const COLUMNS = 11;
const CAPSULE = { width: 14, height: 22, radius: 7, gap: 6 };
const BURST = 120;

// athUp: 10 pt up + fade.
const up = (delay: number, duration = 450) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 10 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }] },
  })
    .duration(duration)
    .delay(delay)
    .reduceMotion(ReduceMotion.Never);

// athSheet 0.42 s cubic-bezier(.2,.9,.25,1).
const sheetIn = new Keyframe({
  0: { transform: [{ translateY: 600 }] },
  100: {
    transform: [{ translateY: 0 }],
    easing: Easing.bezier(0.2, 0.9, 0.25, 1),
  },
})
  .duration(420)
  .reduceMotion(ReduceMotion.Never);

// athPop 0.55 s from 0.25 s: the capsule of the day just closed.
const pop = new Keyframe({
  0: { transform: [{ scale: 0.6 }] },
  60: { transform: [{ scale: 1.12 }] },
  100: { transform: [{ scale: 1 }] },
})
  .duration(550)
  .delay(250)
  .reduceMotion(ReduceMotion.Never);

// athBurst 1.2 s from 0.35 s: an Ember ring that grows and fades.
const burst = new Keyframe({
  0: { opacity: 0.9, transform: [{ scale: 0.3 }] },
  100: { opacity: 0, transform: [{ scale: 2.4 }] },
})
  .duration(1200)
  .delay(350)
  .reduceMotion(ReduceMotion.Never);

// Reducir movimiento: short fades only.
const fade = FadeIn.duration(200).reduceMotion(ReduceMotion.Never);

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (alive) {
          setReduce(value);
        }
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduce,
    );
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return reduce;
}

export type DayClosedSheetProps = {
  // Closed days including the one just closed (1–32); null: hidden.
  day: number | null;
  onClose: () => void;
};

// CORE33_07 / CORE33_08 · Día cerrado (handoff v2.17 §27): a dark bottom
// sheet, the same in light and dark (Core 33 behind is a dark scene in
// both). Capsules, eyebrow, the day "de 33", the line, the milestone pill on
// days 7/14/21/28 and "Seguir". Tapping outside or "Seguir" closes it.
export function DayClosedSheet({ day, onClose }: DayClosedSheetProps) {
  return (
    <Modal
      visible={day !== null}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {day !== null ? <SheetContent day={day} onClose={onClose} /> : null}
    </Modal>
  );
}

function SheetContent({ day, onClose }: { day: number; onClose: () => void }) {
  const { colors, scene, type } = useThemeV2();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const copy = dayClosedCopy(day);
  const at = (delay: number, duration?: number) =>
    reduce ? fade : up(delay, duration);

  return (
    <View style={styles.fill}>
      <Animated.View
        entering={reduce ? fade : FadeIn.duration(250).reduceMotion(ReduceMotion.Never)}
        style={StyleSheet.absoluteFill}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM }]}
        />
      </Animated.View>

      <Animated.View
        entering={reduce ? fade : sheetIn}
        accessibilityViewIsModal
        style={[
          styles.sheet,
          {
            backgroundColor: scene.celebration,
            paddingBottom: Math.max(40, insets.bottom + 16),
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: HANDLE }]} />

        {!reduce ? (
          <Animated.View
            entering={burst}
            pointerEvents="none"
            style={[styles.burst, { borderColor: colors.ember.base }]}
          />
        ) : null}

        <View
          accessible
          accessibilityLabel={`${day} de ${CORE33_TOTAL_DAYS} días cerrados`}
          style={styles.capsules}
        >
          {Array.from({ length: CORE33_TOTAL_DAYS }, (_, index) => {
            const closed = index < day;
            const capsule = (
              <View
                style={[
                  styles.capsule,
                  {
                    backgroundColor: closed ? colors.ember.base : CAPSULE_OPEN,
                    boxShadow:
                      index === day
                        ? `inset 0 0 0 1.5px ${NEXT_RING}`
                        : undefined,
                  },
                ]}
              />
            );
            return index === day - 1 && !reduce ? (
              <Animated.View key={index} entering={pop}>
                {capsule}
              </Animated.View>
            ) : (
              <View key={index}>{capsule}</View>
            );
          })}
        </View>

        <View style={styles.texts}>
          <Animated.View entering={at(300, 400)}>
            <TextV2
              variant="eyebrow"
              color={colors.ember.textOnDark}
              align="center"
              style={{ letterSpacing: em(0.08, type.eyebrow.fontSize) }}
            >
              Core 33 · Día cerrado
            </TextV2>
          </Animated.View>
          <Animated.View entering={at(400)} style={styles.figure}>
            <TextV2 color={palette.white} style={styles.day}>
              {day}
            </TextV2>
            <TextV2 color={palette.onDarkMeta} style={styles.of}>
              {`de ${CORE33_TOTAL_DAYS}`}
            </TextV2>
          </Animated.View>
          <Animated.View entering={at(500)}>
            <TextV2
              color={palette.onDarkSecondary}
              align="center"
              style={styles.line}
            >
              {copy.line}
            </TextV2>
          </Animated.View>
          {copy.milestone ? (
            <Animated.View entering={at(600)} style={styles.milestoneWrap}>
              <View
                style={[
                  styles.milestone,
                  { backgroundColor: alpha.emberGlow[1] },
                ]}
              >
                <TextV2 variant="metaStrong" color={colors.ember.textOnDark}>
                  {copy.milestone}
                </TextV2>
              </View>
            </Animated.View>
          ) : null}
        </View>

        <Animated.View entering={at(700)} style={styles.ctaWrap}>
          <PressableScale
            accessibilityRole="button"
            onPress={onClose}
            style={[styles.cta, { backgroundColor: palette.white }]}
          >
            <TextV2 variant="cta" color={palette.ink} style={styles.ctaText}>
              Seguir
            </TextV2>
          </PressableScale>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    alignItems: 'center',
    gap: 18,
    paddingTop: 10,
    paddingHorizontal: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    boxShadow: '0 -12px 32px rgba(0,0,0,.25)',
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  burst: {
    position: 'absolute',
    left: '50%',
    top: 118 - BURST / 2,
    width: BURST,
    height: BURST,
    marginLeft: -BURST / 2,
    borderRadius: BURST / 2,
    borderWidth: 2,
    // Final state of athBurst (the keyframe ends here).
    opacity: 0,
  },
  capsules: {
    width: COLUMNS * CAPSULE.width + (COLUMNS - 1) * CAPSULE.gap,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CAPSULE.gap,
    marginTop: 14,
  },
  capsule: {
    width: CAPSULE.width,
    height: CAPSULE.height,
    borderRadius: CAPSULE.radius,
  },
  texts: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  figure: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  day: {
    fontSize: 56,
    fontWeight: '600',
    letterSpacing: em(-0.03, 56),
    lineHeight: 64,
  },
  of: {
    fontSize: 20,
  },
  line: {
    fontSize: 16,
    lineHeight: Math.round(16 * 1.45),
  },
  milestoneWrap: {
    marginTop: 6,
  },
  milestone: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  ctaWrap: {
    alignSelf: 'stretch',
    marginTop: 4,
  },
  cta: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
  },
});
