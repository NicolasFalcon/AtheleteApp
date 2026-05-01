import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader, ScreenContainer } from '@app/components';
import { Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

type PlaceholderScreenProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  eyebrow?: string;
}>;

export function PlaceholderScreen({
  title,
  subtitle,
  eyebrow,
  children,
}: PlaceholderScreenProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    eyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.monoFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.bold,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    stack: {
      gap: theme.spacing.lg,
    },
  });

  return (
    <ScreenContainer scrollable>
      <View style={styles.stack}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <AppHeader title={title} subtitle={subtitle} />
        <Card>{children}</Card>
      </View>
    </ScreenContainer>
  );
}
