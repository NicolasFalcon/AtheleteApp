import { ArrowLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '@app/hooks/useAppTheme';
import {safeGoBack, type BackFallback} from '@app/navigation/safeGoBack';

type AppHeaderProps = {
  title: string;
  showBackButton?: boolean;
  backFallbacks?: readonly BackFallback[];
  onBack?: () => void;
};

export function AppHeader({
  title,
  showBackButton = false,
  backFallbacks = [],
  onBack,
}: AppHeaderProps) {
  const navigation = useNavigation();
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceMuted,
    },
    title: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 18,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 22,
      textAlign: showBackButton ? 'center' : 'left',
    },
    spacer: {
      width: 40,
    },
  });

  return (
    <View style={styles.container}>
      {showBackButton ? (
        <Pressable
          onPress={() =>
            onBack ? onBack() : safeGoBack(navigation, backFallbacks)
          }
          style={styles.backButton}
        >
          <ArrowLeft
            color={theme.colors.textPrimary}
            size={20}
            strokeWidth={2}
          />
        </Pressable>
      ) : null}
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      {showBackButton ? <View style={styles.spacer} /> : null}
    </View>
  );
}
