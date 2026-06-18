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
import { Button } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

type ProfileSetupLayoutProps = PropsWithChildren<{
  step: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  footerAbove?: ReactNode;
}>;

const TOTAL_STEPS = 6;

export function ProfileSetupLayout({
  children,
  step,
  title,
  subtitle,
  onBack,
  onContinue,
  continueLabel = 'Continuar',
  continueDisabled = false,
  continueLoading = false,
  footerAbove,
}: ProfileSetupLayoutProps) {
  const { mode, theme } = useAppTheme();
  const styles = createStyles(theme);
  const progress = Math.min(1, Math.max(0, step / TOTAL_STEPS));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={theme.colors.background}
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Volver"
            disabled={!onBack}
            hitSlop={10}
            onPress={onBack}
            style={[styles.backButton, !onBack ? styles.hidden : null]}
          >
            <BackIcon color={theme.colors.textPrimary} />
          </Pressable>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(8, progress * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.stepLabel}>Paso {step + 1}/7</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heading}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <View style={styles.body}>{children}</View>
        </ScrollView>

        <View style={styles.footer}>
          {footerAbove}
          <Button
            disabled={continueDisabled || continueLoading}
            label={continueLoading ? 'Guardando…' : continueLabel}
            loading={continueLoading}
            onPress={onContinue}
          />
        </View>
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
      height: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hidden: {
      opacity: 0,
    },
    progressTrack: {
      flex: 1,
      height: 5,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.textPrimary,
    },
    stepLabel: {
      width: 62,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      textAlign: 'right',
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
    },
    heading: {
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xxl,
    },
    title: {
      maxWidth: 330,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.title,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 34,
      textAlign: 'center',
    },
    subtitle: {
      maxWidth: 330,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 21,
      textAlign: 'center',
    },
    body: {
      flex: 1,
      justifyContent: 'center',
    },
    footer: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      backgroundColor: theme.colors.background,
    },
  });
}
