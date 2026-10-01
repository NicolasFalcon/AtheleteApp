import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, StatusBarV2, TextV2, useThemeV2 } from '@app/components/v2';
import { SceneScope } from '@app/providers/ThemeProvider';

type VisualOnboardingScreenProps = {
  onComplete: () => Promise<void> | void;
};

type IntroSlide = {
  key: string;
  title: string;
  subtitle: string;
  photo: ImageSourcePropType;
};

// Copy from Auth.dc.html (SLIDES). Slide 1 says "técnica en video" instead of
// "técnica en 3D": the 3D model was discarded in favour of MoveKit (D-37).
const SLIDES: IntroSlide[] = [
  {
    key: 'intencion',
    title: 'Entrena con intención.',
    subtitle:
      'Rutinas claras, técnica en video y una sesión que se lee de un vistazo.',
    photo: require('@app/assets/v2/photos/overhead.jpg'),
  },
  {
    key: 'coach',
    title: 'Un coach que te conoce.',
    subtitle: 'ELLIE ajusta tu día con tus datos reales, sin ruido.',
    photo: require('@app/assets/v2/photos/movilidad.jpg'),
  },
  {
    key: 'progreso',
    title: 'Progreso que se nota.',
    subtitle: 'Cada serie, vaso y hábito cuenta. Y se ve.',
    photo: require('@app/assets/v2/photos/esfuerzo.jpg'),
  },
];

// ONB_01 · Intro deslizable. The only place where photography dominates full
// bleed: a dark scene in both modes. Swipe or "Siguiente"; "Empezar" ends it.
export function VisualOnboardingScreen({
  onComplete,
}: VisualOnboardingScreenProps) {
  return (
    <SceneScope>
      <IntroSlides onComplete={onComplete} />
    </SceneScope>
  );
}

function IntroSlides({ onComplete }: VisualOnboardingScreenProps) {
  const { scene } = useThemeV2();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<IntroSlide>>(null);
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const isLast = index === SLIDES.length - 1;

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

  const handleNext = () => {
    if (isLast) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const bottom = Math.max(48, insets.bottom + 24);

  return (
    <View style={[styles.fill, { backgroundColor: scene.celebration }]}>
      <StatusBarV2 />
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={slide => slide.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, itemIndex) => ({
          length: width,
          offset: width * itemIndex,
          index: itemIndex,
        })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Image
              source={item.photo}
              resizeMode="cover"
              style={styles.photo}
              accessibilityIgnoresInvertColors
            />
            {/* #161616 from 35 % (transparent) to 75 % (.92), as the HTML */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(22,22,22,0)', 'rgba(22,22,22,.92)']}
              locations={[0.35, 0.75]}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                styles.copy,
                // Leaves room for the fixed dots (6) + CTA (56) + gaps.
                { bottom: bottom + 56 + 22 + 6 + 22 },
              ]}
            >
              <TextV2
                accessibilityRole="header"
                variant="title28"
                color={scene.onDark.primary}
                style={styles.title}
              >
                {item.title}
              </TextV2>
              <TextV2 variant="voice" color={scene.onDark.secondary}>
                {item.subtitle}
              </TextV2>
            </View>
          </View>
        )}
      />
      <View style={[styles.controls, { bottom }]} pointerEvents="box-none">
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={`Página ${index + 1} de ${SLIDES.length}`}
        >
          {SLIDES.map((slide, dotIndex) => (
            <View
              key={slide.key}
              style={[
                styles.dot,
                {
                  width: dotIndex === index ? 22 : 6,
                  backgroundColor:
                    dotIndex === index
                      ? scene.onDark.primary
                      : 'rgba(255,255,255,.35)',
                },
              ]}
            />
          ))}
        </View>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Button
            variant="onScene"
            label={isLast ? 'Empezar' : 'Siguiente'}
            loading={finishing}
            onPress={handleNext}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  slide: {
    flex: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  copy: {
    position: 'absolute',
    left: 24,
    right: 24,
    gap: 10,
  },
  title: {
    letterSpacing: -0.28,
  },
  controls: {
    position: 'absolute',
    left: 24,
    right: 24,
    gap: 22,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
