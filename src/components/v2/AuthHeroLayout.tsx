import {
  useEffect,
  useRef,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Scrim, type ScrimVariant } from '@app/components/v2/Scrim';
import { StatusBarV2 } from '@app/components/v2/StatusBarV2';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import { Wordmark } from '@app/components/v2/Wordmark';

export type AuthHeroLayoutProps = PropsWithChildren<{
  photo: ImageSourcePropType;
  title: string;
  heroHeight?: number; // 420 Login, 230 Crear cuenta
  // 'wordmark' (Login): Λ mark + name; 'eyebrow' (Crear cuenta): small name.
  brand?: 'wordmark' | 'eyebrow';
  scrim?: ScrimVariant;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  footer?: ReactNode;
}>;

const SURFACE_OVERLAP = 28;

// Auth composition (handoff §7): editorial photo with the brand, and the form
// on a light (or dark) surface that rises over the image with radius 28.
// The scroll view keeps the focused field and the CTA above the keyboard.
export function AuthHeroLayout({
  photo,
  title,
  heroHeight = 420,
  brand = 'wordmark',
  scrim = 'auth',
  topLeft,
  topRight,
  footer,
  children,
}: AuthHeroLayoutProps) {
  const { colors, scene, radius, type } = useThemeV2();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // With the keyboard up, the form (and its CTA) sits right above it: the
  // hero scrolls away so the focused field and the CTA stay visible.
  useEffect(() => {
    // didShow: the KeyboardAvoidingView has already shrunk the scroll view.
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({ animated: true }),
      );
    });
    return () => subscription.remove();
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: colors.bg }]}
    >
      <StatusBarV2 style="light" />
      <ScrollView
        ref={scrollRef}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.grow}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            { height: heroHeight, backgroundColor: scene.plate },
          ]}
        >
          <Animated.View
            entering={FadeIn.duration(800)}
            style={StyleSheet.absoluteFill}
          >
            <Image source={photo} resizeMode="cover" style={styles.photo} />
          </Animated.View>
          <Scrim variant={scrim} />
          <View style={[styles.topBar, { top: insets.top + 4 }]}>
            <View>{topLeft}</View>
            <View>{topRight}</View>
          </View>
          <Animated.View
            entering={FadeInDown.duration(500).delay(100)}
            style={[
              styles.brand,
              brand === 'eyebrow' ? styles.brandCompact : null,
              { bottom: SURFACE_OVERLAP + (brand === 'eyebrow' ? 20 : 28) },
            ]}
          >
            {brand === 'eyebrow' ? (
              <TextV2
                variant="micro"
                color={scene.onDark.secondary}
                style={styles.eyebrow}
              >
                ATHELETE
              </TextV2>
            ) : (
              <Wordmark />
            )}
            <TextV2
              accessibilityRole="header"
              color={scene.onDark.primary}
              style={[
                styles.title,
                { fontSize: type.title24.fontSize, lineHeight: 30 },
              ]}
            >
              {title}
            </TextV2>
          </Animated.View>
        </View>
        <View
          style={[
            styles.surface,
            {
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              paddingBottom: Math.max(36, insets.bottom + 16),
            },
          ]}
        >
          {children}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  grow: {
    flexGrow: 1,
  },
  hero: {
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: {
    position: 'absolute',
    left: 24,
    right: 24,
    gap: 14,
  },
  brandCompact: {
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.28 * 11,
  },
  title: {
    fontWeight: '600',
    maxWidth: 280,
  },
  surface: {
    flexGrow: 1,
    marginTop: -SURFACE_OVERLAP,
    paddingTop: 26,
    paddingHorizontal: 24,
    gap: 14,
  },
  footer: {
    marginTop: 6,
  },
});
