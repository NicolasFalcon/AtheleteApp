import {
  useEffect,
  useRef,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BrandLockup,
  MonoPhoto,
  PosterTitle,
} from '@app/components/v2/Poster';
import { Scrim } from '@app/components/v2/Scrim';
import { StatusBarV2 } from '@app/components/v2/StatusBarV2';
import { TextV2 } from '@app/components/v2/TextV2';
import { useTopSafeBarHeight } from '@app/components/v2/TopSafeBar';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import { SceneScope } from '@app/providers/ThemeProvider';
import { em } from '@app/theme/v2/typography';

export type AuthHeroLook = 'scene' | 'theme';

export type AuthHeroLayoutProps = PropsWithChildren<{
  // 'scene' (Login): always dark, full-width photo melting into the plate.
  // 'theme' (Crear cuenta): theme background, photo at the top right that
  // fades into it on the left and at the bottom.
  look: AuthHeroLook;
  photo: ImageSourcePropType;
  // Headline in caps: `headline` lines in the text colour, then `accent`
  // lines in Ember.
  headline: string[];
  accent: string[];
  subtitle: string[];
  // Small caps on the right of the brand (Login).
  tagline?: string[];
  footer?: ReactNode;
}>;

const GUTTER = 24;

// "#F7F6F3" → "rgba(247,246,243,0)": the same colour, transparent, so the
// gradients fade into the background without a grey band on iOS.
function clear(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0)`;
}

// Auth v2 (Login / Crear cuenta): brand row, a black-and-white photo, the
// Ember accent and the caps headline, then the form. The content starts
// below the TopSafeBar; on short phones (SE) it scrolls, and with the
// keyboard up it scrolls to the end so the focused field and the CTA stay
// visible.
export function AuthHeroLayout({ look, ...props }: AuthHeroLayoutProps) {
  return look === 'scene' ? (
    <SceneScope>
      <AuthHeroContent look={look} {...props} />
    </SceneScope>
  ) : (
    <AuthHeroContent look={look} {...props} />
  );
}

function AuthHeroContent({
  look,
  photo,
  headline,
  accent,
  subtitle,
  tagline,
  footer,
  children,
}: AuthHeroLayoutProps) {
  // KeyboardAvoidingView measures itself from its parent, which starts
  // below the TopSafeBar (B-01).
  const topSafeBarHeight = useTopSafeBarHeight();
  const { colors, type } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const isScene = look === 'scene';
  // Inside the SceneScope colors.bg is the scene plate.
  const bg = colors.bg;

  useEffect(() => {
    // didShow: the KeyboardAvoidingView has already shrunk the scroll view.
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({ animated: true }),
      );
    });
    return () => subscription.remove();
  }, []);

  const photoFrame = isScene
    ? { left: 0, right: 0, height: Math.round(height * 0.6) }
    : {
        right: 0,
        width: Math.round(width * 0.7),
        height: Math.round(height * 0.46),
      };

  return (
    <KeyboardAvoidingView
      keyboardVerticalOffset={topSafeBarHeight}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: bg }]}
    >
      <StatusBarV2 />
      <ScrollView
        ref={scrollRef}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[
          styles.grow,
          { paddingBottom: Math.max(24, insets.bottom + 12) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeIn.duration(800)}
          pointerEvents="none"
          style={[styles.photo, photoFrame]}
        >
          <MonoPhoto
            source={photo}
            style={[styles.fill, { backgroundColor: bg }]}
          >
            {isScene ? (
              <Scrim variant="authPoster" />
            ) : (
              <>
                <LinearGradient
                  pointerEvents="none"
                  colors={[bg, clear(bg)]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 0.6, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={[clear(bg), bg]}
                  locations={[0.45, 1]}
                  style={StyleSheet.absoluteFill}
                />
              </>
            )}
          </MonoPhoto>
        </Animated.View>

        <View style={styles.header}>
          <BrandLockup />
          {tagline ? (
            <View>
              {tagline.map(line => (
                <TextV2
                  key={line}
                  variant="micro"
                  align="right"
                  color={colors.text.bodySoft}
                  style={{ letterSpacing: em(0.24, type.micro.fontSize) }}
                >
                  {line}
                </TextV2>
              ))}
            </View>
          ) : null}
        </View>

        <View style={[styles.spacer, { minHeight: isScene ? 120 : 56 }]} />

        <Animated.View
          entering={FadeInDown.duration(500).delay(100)}
          style={styles.titleBlock}
        >
          <PosterTitle
            display={isScene ? 'displayXL' : 'displayM'}
            headline={headline}
            accent={accent}
            subtitle={subtitle}
          />
        </Animated.View>

        <View style={styles.form}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
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
  photo: {
    position: 'absolute',
    top: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: GUTTER,
    paddingTop: 16,
  },
  spacer: {
    flex: 1,
  },
  titleBlock: {
    paddingHorizontal: GUTTER,
  },
  form: {
    marginTop: 24,
    paddingHorizontal: GUTTER,
    gap: 12,
  },
  footer: {
    marginTop: 16,
    paddingHorizontal: GUTTER,
  },
});
