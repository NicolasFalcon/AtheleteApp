import { useCallback, useRef, useState } from 'react';
import type {
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import {
  FlatList,
  ImageBackground,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  visualOnboardingReachGoals,
  visualOnboardingTrackProgress,
  visualOnboardingTrainAnywhere,
} from '@app/assets/images';
import { VisualOnboardingPagination } from '@app/components/onboarding/VisualOnboardingPagination';
import { useAppTheme } from '@app/hooks/useAppTheme';

type VisualOnboardingScreenProps = {
  onComplete: () => Promise<void> | void;
};

type VisualOnboardingSlide = {
  id: string;
  image: ImageSourcePropType;
  title: string;
  subtitle: string;
};

const SLIDES: VisualOnboardingSlide[] = [
  {
    id: 'train-anywhere',
    image: visualOnboardingTrainAnywhere,
    title: 'Entrena donde quieras',
    subtitle:
      'Convierte cualquier lugar en tu espacio de progreso y empieza a construir tu mejor versión.',
  },
  {
    id: 'track-progress',
    image: visualOnboardingTrackProgress,
    title: 'Sigue tu progreso',
    subtitle:
      'Registra entrenos, hábitos, nutrición y resultados para avanzar con claridad.',
  },
  {
    id: 'reach-goals',
    image: visualOnboardingReachGoals,
    title: 'Cumple tus objetivos',
    subtitle:
      'Organiza tu rutina, mantén el enfoque y deja que Athelete te acompañe cada día.',
  },
];

export function VisualOnboardingScreen({
  onComplete,
}: VisualOnboardingScreenProps) {
  const { theme } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<VisualOnboardingSlide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const onboardingForeground =
    theme.mode === 'dark' ? theme.colors.textPrimary : theme.colors.surface;
  const onboardingContrast =
    theme.mode === 'dark'
      ? theme.colors.accentContrast
      : theme.colors.textPrimary;

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

  const handlePrimaryAction = () => {
    if (activeIndex === SLIDES.length - 1) {
      finish().catch(() => {});
      return;
    }

    const nextIndex = activeIndex + 1;
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setActiveIndex(nextIndex);
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(Math.max(0, Math.min(nextIndex, SLIDES.length - 1)));
  };

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#050505',
    },
    slide: {
      width,
      height,
    },
    image: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    fullOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.24)',
    },
    bottomOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '32%',
      backgroundColor: 'rgba(0,0,0,0.48)',
    },
    skipSafeArea: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      zIndex: 2,
      pointerEvents: 'box-none',
    },
    skipRow: {
      alignItems: 'flex-end',
      paddingHorizontal: 22,
      paddingTop: 10,
    },
    skipButton: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    skipLabel: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.medium,
    },
    bottomContent: {
      paddingHorizontal: 22,
      paddingBottom: Math.max(insets.bottom, 12) + 10,
    },
    paginationWrap: {
      marginBottom: 28,
    },
    copy: {
      alignItems: 'center',
      gap: 10,
      marginBottom: 34,
    },
    title: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: 27,
      lineHeight: 33,
      fontWeight: theme.typography.weights.semibold,
      textAlign: 'center',
    },
    subtitle: {
      maxWidth: 350,
      color: 'rgba(255,255,255,0.72)',
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
    primaryButton: {
      minHeight: 58,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: onboardingForeground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.34)',
      opacity: finishing ? 0.65 : 1,
    },
    primaryLabel: {
      color: onboardingContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <View style={styles.screen}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        bounces={false}
        decelerationRate="fast"
        getItemLayout={(_data, index) => ({
          index,
          length: width,
          offset: width * index,
        })}
        keyExtractor={item => item.id}
        onMomentumScrollEnd={handleScrollEnd}
        pagingEnabled
        renderItem={({ item, index }) => (
          <View style={styles.slide}>
            <ImageBackground
              source={item.image}
              resizeMode="cover"
              style={styles.image}
            >
              <View style={styles.fullOverlay} />
              <View style={styles.bottomOverlay} />

              <View style={styles.bottomContent}>
                <View style={styles.paginationWrap}>
                  <VisualOnboardingPagination
                    activeIndex={activeIndex}
                    activeColor={onboardingForeground}
                    count={SLIDES.length}
                  />
                </View>

                <View style={styles.copy}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.subtitle}>{item.subtitle}</Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={finishing}
                  onPress={handlePrimaryAction}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && !finishing ? { opacity: 0.9 } : null,
                  ]}
                >
                  <Text style={styles.primaryLabel}>
                    {index === SLIDES.length - 1 ? 'Comenzar' : 'Siguiente'}
                  </Text>
                </Pressable>
              </View>
            </ImageBackground>
          </View>
        )}
        showsHorizontalScrollIndicator={false}
      />

      <SafeAreaView edges={['top']} style={styles.skipSafeArea}>
        <View style={styles.skipRow}>
          <Pressable
            accessibilityRole="button"
            disabled={finishing}
            onPress={() => {
              finish().catch(() => {});
            }}
            style={styles.skipButton}
          >
            <Text style={styles.skipLabel}>Saltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
