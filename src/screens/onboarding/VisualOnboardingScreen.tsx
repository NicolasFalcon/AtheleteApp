import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BrandLockup,
  Button,
  MonoPhoto,
  PosterTitle,
  PressableScale,
  Scrim,
  StatusBarV2,
  TextV2,
  TopSafeBar,
  TopSafeBarContent,
  useThemeV2,
} from '@app/components/v2';
import { SceneScope } from '@app/providers/ThemeProvider';
import { em } from '@app/theme/v2/typography';

type VisualOnboardingScreenProps = {
  onComplete: () => Promise<void> | void;
};

type IntroSlide = {
  key: string;
  eyebrow: string;
  headline: string[];
  accent: string[];
  subtitle?: string[];
  photo: ImageSourcePropType;
};

// TODO(intro-assets): placeholders from the existing photos until
// assets/images/intro/intro-1…5.jpg exist.
const SLIDES: IntroSlide[] = [
  {
    key: 'ellie',
    eyebrow: 'ATHELETE INTELLIGENCE',
    headline: ['UN COACH QUE'],
    accent: ['TE CONOCE.'],
    subtitle: ['ELLIE LEE TUS DATOS REALES.', 'Y AJUSTA TU DÍA.'],
    photo: require('@app/assets/v2/photos/home/reto-overhead.jpg'),
  },
  {
    key: 'core33',
    eyebrow: 'CORE 33 · RETO',
    headline: ['33 DÍAS.'],
    accent: ['SIN EXCUSAS.'],
    subtitle: ['UN BLOQUE CORTO CADA DÍA.', 'UN CAMBIO QUE SE NOTA.'],
    photo: require('@app/assets/v2/photos/home/athlete-2.jpg'),
  },
  {
    key: 'ruta',
    eyebrow: 'RUTA',
    headline: ['SAL A'],
    accent: ['LA CALLE.'],
    subtitle: ['CORRE O PEDALEA.', 'CADA KILÓMETRO CUENTA.'],
    photo: require('@app/assets/v2/photos/barra-mujer.jpg'),
  },
  {
    key: 'comunidad',
    eyebrow: 'COMUNIDAD · RETOS',
    headline: ['NUNCA', 'ENTRENAS'],
    accent: ['SOLO.'],
    subtitle: ['RETA A TUS AMIGOS.', 'SUPERA TU MARCA.'],
    photo: require('@app/assets/v2/photos/home/hero-entreno.jpg'),
  },
  {
    key: 'descubre',
    eyebrow: 'DESCUBRE',
    headline: ['ALIVE'],
    accent: ['PERFORMANCE.'],
    photo: require('@app/assets/v2/photos/cuerdas.jpg'),
  },
];

// Slide 5: informative only, no actions.
const DISCOVER = [
  { title: 'Respira', detail: 'Un minuto para ti' },
  { title: 'Quiz', detail: 'Aprende jugando' },
  { title: 'Wear', detail: 'Ropa para el trabajo real' },
  { title: 'Y más', detail: 'Descúbrelo dentro' },
];

const LAST = SLIDES.length - 1;
const GUTTER = 24;
const PROGRESS_ROW = 16;
const CONTROLS_GAP = 24;
const CTA_HEIGHT = 56;
const COPY_GAP = 28;
// iPhone SE and other short phones: the headline goes one step down.
const COMPACT_HEIGHT = 700;

const pad = (value: number) => String(value).padStart(2, '0');

// ONB_01 · Intro (5 slides) before the login, always dark: black-and-white
// photo under the TopSafeBar, brand, Ember eyebrow + caps headline, progress
// and the CTA. Swipe or "Siguiente"; "Saltar" and "Empezar" end it
// (onComplete marks it as seen); on the last slide "Atrás" returns to the 4th.
export function VisualOnboardingScreen({
  onComplete,
}: VisualOnboardingScreenProps) {
  const { scene } = useThemeV2();

  // Rendered outside the stacks: the bar and the inset scope are set here.
  return (
    <SceneScope>
      <View style={[styles.fill, { backgroundColor: scene.plate }]}>
        <TopSafeBar variant="scene" />
        <TopSafeBarContent barShown>
          <IntroSlides onComplete={onComplete} />
        </TopSafeBarContent>
      </View>
    </SceneScope>
  );
}

function IntroSlides({ onComplete }: VisualOnboardingScreenProps) {
  const { colors, scene, radius, type } = useThemeV2();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<IntroSlide>>(null);
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const scrollX = useSharedValue(0);
  const shownIndex = useSharedValue(0);
  const isLast = index === LAST;
  const compact = height < COMPACT_HEIGHT;

  const finish = useCallback(async () => {
    if (finishing) {
      return;
    }
    setFinishing(true);
    try {
      await onComplete();
    } finally {
      setFinishing(false);
    }
  }, [finishing, onComplete]);

  const goTo = (target: number) => {
    listRef.current?.scrollToIndex({ index: target, animated: true });
  };

  const handleNext = () => {
    if (isLast) {
      finish();
      return;
    }
    goTo(index + 1);
  };

  // The page follows the scroll (swipe or button), so the counter and the
  // header pill change as soon as the next slide takes over.
  const onScroll = useAnimatedScrollHandler(event => {
    scrollX.value = event.contentOffset.x;
    const next = Math.min(Math.max(Math.round(event.contentOffset.x / width), 0), LAST);
    if (next !== shownIndex.value) {
      shownIndex.value = next;
      runOnJS(setIndex)(next);
    }
  });

  const bottom = Math.max(24, insets.bottom + 8);
  const copyBottom = bottom + CTA_HEIGHT + CONTROLS_GAP + PROGRESS_ROW + COPY_GAP;

  return (
    <View style={styles.fill}>
      <StatusBarV2 />
      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={slide => slide.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, itemIndex) => ({
          length: width,
          offset: width * itemIndex,
          index: itemIndex,
        })}
        renderItem={({ item, index: slideIndex }) => (
          <View style={[styles.slide, { width }]}>
            <MonoPhoto
              source={item.photo}
              style={[StyleSheet.absoluteFill, { backgroundColor: scene.plate }]}
            >
              <Scrim variant="intro" />
            </MonoPhoto>
            <View style={[styles.copy, { bottom: copyBottom }]}>
              <PosterTitle
                display="displayL"
                eyebrow={item.eyebrow}
                headline={item.headline}
                accent={item.accent}
                subtitle={item.subtitle}
                size={compact ? 'compact' : 'regular'}
              />
              {slideIndex === LAST ? (
                <View style={styles.discover}>
                  {DISCOVER.map((row, rowIndex) => (
                    <View
                      key={row.title}
                      accessible
                      style={[
                        styles.discoverRow,
                        {
                          borderBottomColor: colors.divider,
                          paddingVertical: compact ? 8 : 10,
                        },
                      ]}
                    >
                      <TextV2
                        variant="micro"
                        color={colors.text.tertiary}
                        style={[
                          styles.discoverNumber,
                          { letterSpacing: em(0.2, type.micro.fontSize) },
                        ]}
                      >
                        {pad(rowIndex + 1)}
                      </TextV2>
                      <TextV2
                        variant="bodyL"
                        color={colors.text.primary}
                        style={styles.discoverTitle}
                      >
                        {row.title}
                      </TextV2>
                      <TextV2
                        variant="meta"
                        tone="secondary"
                        numberOfLines={1}
                        style={styles.discoverDetail}
                      >
                        {row.detail}
                      </TextV2>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        )}
      />

      <View style={styles.header} pointerEvents="box-none">
        <BrandLockup />
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Atrás' : 'Saltar la intro'}
          hitSlop={8}
          onPress={() => (isLast ? goTo(LAST - 1) : finish())}
          style={[
            styles.pill,
            { backgroundColor: scene.glass.onPhoto, borderRadius: radius.pill },
          ]}
        >
          <TextV2 variant="label" color={scene.onDark.primary}>
            {isLast ? 'Atrás' : 'Saltar'}
          </TextV2>
        </PressableScale>
      </View>

      <View style={[styles.controls, { bottom }]} pointerEvents="box-none">
        <View
          style={styles.progressRow}
          accessible
          accessibilityLabel={`Página ${index + 1} de ${SLIDES.length}`}
        >
          <View style={styles.segments}>
            {SLIDES.map((slide, segment) => (
              <ProgressSegment
                key={slide.key}
                segment={segment}
                scrollX={scrollX}
                width={width}
                colors={{
                  done: scene.onDark.secondary,
                  current: colors.ember.base,
                  pending: scene.glass.onPhoto,
                }}
              />
            ))}
          </View>
          <TextV2
            variant="micro"
            color={colors.text.secondary}
            style={{ letterSpacing: em(0.2, type.micro.fontSize) }}
          >
            {`${pad(index + 1)} / ${pad(SLIDES.length)}`}
          </TextV2>
        </View>
        <Button
          variant={isLast ? 'commit' : 'onScene'}
          label={isLast ? 'Empezar' : 'Siguiente'}
          loading={finishing}
          onPress={handleNext}
        />
      </View>
    </View>
  );
}

// Pending (dark) → current (Ember) → done (light grey), following the scroll
// so the change is gradual while swiping.
function ProgressSegment({
  segment,
  scrollX,
  width,
  colors,
}: {
  segment: number;
  scrollX: SharedValue<number>;
  width: number;
  colors: { done: string; current: string; pending: string };
}) {
  const style = useAnimatedStyle(() => {
    const page = scrollX.value / width;
    return {
      backgroundColor: interpolateColor(
        Math.min(Math.max(page, segment - 1), segment + 1),
        [segment - 1, segment, segment + 1],
        [colors.pending, colors.current, colors.done],
      ),
    };
  });

  return <Animated.View style={[styles.segment, style]} />;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  slide: {
    flex: 1,
  },
  copy: {
    position: 'absolute',
    left: GUTTER,
    right: GUTTER,
  },
  discover: {
    marginTop: 16,
  },
  discoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  discoverNumber: {
    width: 34,
  },
  discoverTitle: {
    fontWeight: '500',
  },
  discoverDetail: {
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingTop: 16,
  },
  pill: {
    height: 34,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    position: 'absolute',
    left: GUTTER,
    right: GUTTER,
    gap: CONTROLS_GAP,
  },
  progressRow: {
    height: PROGRESS_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
  },
});
