import { useEffect, useRef, type PropsWithChildren } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@app/components/v2/IconButton';
import { StatusBarV2 } from '@app/components/v2/StatusBarV2';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type AuthFormLayoutProps = PropsWithChildren<{
  // Small centred title of the top bar ("Recuperar contraseña").
  barTitle?: string;
  onBack?: () => void;
  // Changes the enter animation when the screen swaps state (sent, done…).
  stateKey?: string;
  centered?: boolean;
}>;

// Single-purpose Auth screens without a photo (Recuperar, Restablecer and
// their confirmations): 44 pt back button + 15/600 title on the bar, content
// on the plain background. Field and CTA stay above the keyboard.
export function AuthFormLayout({
  barTitle,
  onBack,
  stateKey = 'default',
  centered = false,
  children,
}: AuthFormLayoutProps) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
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
      <StatusBarV2 />
      <View style={[styles.bar, { paddingTop: insets.top }]}>
        <View style={styles.side}>
          {onBack ? <BackButton onPress={onBack} /> : null}
        </View>
        <TextV2
          variant="bodyStrong"
          tone="secondary"
          align="center"
          numberOfLines={1}
          style={styles.barTitle}
        >
          {barTitle}
        </TextV2>
        <View style={styles.side} />
      </View>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(40, insets.bottom + 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          key={stateKey}
          entering={FadeInDown.duration(350)}
          style={[styles.body, centered ? styles.centered : null]}
        >
          {children}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  side: {
    width: 44,
  },
  barTitle: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    // The prototype content starts ~130 pt from the top (incl. 54 status
    // bar + 52 bar), i.e. ~24 pt below the bar.
    paddingTop: 24,
  },
  body: {
    gap: 18,
  },
  centered: {
    alignItems: 'center',
  },
});
