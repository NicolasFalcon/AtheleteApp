import { Image, StyleSheet, Text, View } from 'react-native';
import { logoAthelete } from '@app/assets/images';
import { useAppTheme } from '@app/hooks/useAppTheme';

type BrandHeaderProps = {
  title: string;
  subtitle: string;
  compact?: boolean;
};

export function BrandHeader({
  title,
  subtitle,
  compact = false,
}: BrandHeaderProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: compact ? theme.spacing.md : theme.spacing.lg,
    },
    logo: {
      width: compact ? 64 : 80,
      height: compact ? 64 : 80,
      borderRadius: compact ? 24 : 28,
    },
    copy: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: compact ? theme.typography.sizes.titleSm : theme.typography.sizes.title,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.6,
      textAlign: 'center',
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 20,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <Image source={logoAthelete} style={styles.logo} />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}
