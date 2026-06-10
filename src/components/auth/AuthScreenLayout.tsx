import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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
}>;

export function AuthScreenLayout({
  children,
  header,
  backLabel = 'Volver',
  onBack,
  footer,
  centered = false,
}: AuthScreenLayoutProps) {
  const { theme, mode, setPreferredMode } = useAppTheme();
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
            {onBack ? (
              <Pressable
                accessibilityLabel={backLabel}
                hitSlop={10}
                onPress={onBack}
                style={styles.backButton}
              >
                <BackIcon color={theme.colors.textPrimary} />
              </Pressable>
            ) : null}
          </View>
          <View
            accessibilityLabel="Tema de la aplicación"
            accessibilityRole="tablist"
            style={styles.themeControl}
          >
            {(['dark', 'light'] as const).map(option => {
              const active = mode === option;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  key={option}
                  onPress={() => setPreferredMode(option)}
                  style={[
                    styles.themeOption,
                    active ? styles.themeOptionActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      active ? styles.themeOptionTextActive : null,
                    ]}
                  >
                    {option === 'dark' ? 'Oscuro' : 'Claro'}
                  </Text>
                </Pressable>
              );
            })}
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
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
    },
    topBarSlot: {
      width: 44,
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
    themeControl: {
      minHeight: 34,
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      flexDirection: 'row',
      padding: 3,
    },
    themeOption: {
      minWidth: 62,
      minHeight: 28,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
    },
    themeOptionActive: {
      backgroundColor: theme.colors.accent,
    },
    themeOptionText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
    },
    themeOptionTextActive: {
      color: theme.colors.accentContrast,
      fontWeight: theme.typography.weights.semibold,
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
