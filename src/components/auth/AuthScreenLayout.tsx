import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackIcon } from '@app/assets/icons';
import { useAppTheme } from '@app/hooks/useAppTheme';

type AuthScreenLayoutProps = PropsWithChildren<{
  header: ReactNode;
  backLabel?: string;
  onBack?: () => void;
  footer?: ReactNode;
  centered?: boolean;
  topActions?: ReactNode;
}>;

export function AuthScreenLayout({
  children,
  header,
  backLabel = 'Volver',
  onBack,
  footer,
  centered = false,
  topActions,
}: AuthScreenLayoutProps) {
  const { theme, mode } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar
        backgroundColor={theme.colors.background}
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View style={styles.topBar}>
          <View style={styles.topBarSlot}>
            {topActions ??
              (onBack ? (
                <Pressable
                  accessibilityLabel={backLabel}
                  hitSlop={10}
                  onPress={onBack}
                  style={styles.backButton}
                >
                  <BackIcon color={theme.colors.textPrimary} />
                </Pressable>
              ) : null)}
          </View>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={[styles.inner, centered ? styles.innerCentered : null]}>
            {header}
            <View style={styles.form}>{children}</View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboard: {
      flex: 1,
    },
    topBar: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
    },
    topBarSlot: {
      height: 44,
      justifyContent: 'center',
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xxxl,
    },
    inner: {
      flex: 1,
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
    },
    innerCentered: {
      justifyContent: 'center',
      paddingBottom: 56,
    },
    form: {
      gap: theme.spacing.md,
    },
    footer: {
      marginTop: theme.spacing.xl,
    },
  });
}
