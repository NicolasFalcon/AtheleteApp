import { ArrowLeft } from 'lucide-react-native';
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
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      gap: theme.spacing.xs,
    },
    backButton: {
      alignSelf: 'flex-start',
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceMuted,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.title,
      fontWeight: theme.typography.weights.bold,
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
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft
            color={theme.colors.textPrimary}
            size={20}
            strokeWidth={2}
          />
        </Pressable>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
