import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScreenContainer } from '@app/components/ScreenContainer';
import { useAppTheme } from '@app/hooks/useAppTheme';

type AuthScreenLayoutProps = PropsWithChildren<{
  header: ReactNode;
  backLabel?: string;
  onBack?: () => void;
  footer?: ReactNode;
}>;

export function AuthScreenLayout({
  children,
  header,
  backLabel = 'Volver',
  onBack,
  footer,
}: AuthScreenLayoutProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxxl,
    },
    keyboard: {
      flex: 1,
      justifyContent: 'center',
    },
    inner: {
      width: '100%',
      maxWidth: 380,
      alignSelf: 'center',
      gap: theme.spacing.xxl,
    },
    backButton: {
      alignSelf: 'flex-start',
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
    },
    backLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.medium,
    },
    form: {
      gap: theme.spacing.lg,
    },
  });

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.content}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}>
        <View style={styles.inner}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.backButton}>
              <Text style={styles.backLabel}>← {backLabel}</Text>
            </Pressable>
          ) : null}
          {header}
          <View style={styles.form}>{children}</View>
          {footer}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
