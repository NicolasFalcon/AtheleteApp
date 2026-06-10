import { Image, StyleSheet, Text, View } from 'react-native';
import { logoWhite } from '@app/assets/images';
import { useAppTheme } from '@app/hooks/useAppTheme';

type BrandHeaderProps = {
  title: string;
  subtitle: string;
  compact?: boolean;
  showLogo?: boolean;
};

export function BrandHeader({
  title,
  subtitle,
  compact: _compact = false,
  showLogo = false,
}: BrandHeaderProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {showLogo ? <Image source={logoWhite} style={styles.logo} /> : null}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    logo: {
      width: 72,
      height: 72,
      borderRadius: 36,
      marginBottom: theme.spacing.lg,
    },
    copy: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    title: {
      maxWidth: 310,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.titleSm,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 27,
      textAlign: 'center',
    },
    subtitle: {
      maxWidth: 320,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 21,
      textAlign: 'center',
    },
  });
}
