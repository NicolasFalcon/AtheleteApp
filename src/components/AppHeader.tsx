import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
};

export function AppHeader({
  title,
  subtitle,
  showBackButton = false,
}: AppHeaderProps) {
  const navigation = useNavigation();
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
    },
    backButton: {
      alignSelf: 'flex-start',
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
    },
    backLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.medium,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.display,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -1,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      lineHeight: 24,
    },
  });

  return (
    <View style={styles.container}>
      {showBackButton && navigation.canGoBack() ? (
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backLabel}>Volver</Text>
        </Pressable>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
