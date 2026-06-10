import {Sparkles} from 'lucide-react-native';
import {StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

export function NotificationsEmptyState() {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 56,
      gap: 12,
    },
    iconWrap: {
      width: 58,
      height: 58,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.semibold,
      marginTop: 4,
    },
    copy: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Sparkles color={theme.colors.textPrimary} size={22} strokeWidth={2.1} />
      </View>
      <Text style={styles.title}>Todo al día</Text>
      <Text style={styles.copy}>
        No tienes recordatorios pendientes. Cuando ELLIE detecte algo útil para
        entreno, nutrición o progreso, aparecerá aquí.
      </Text>
    </View>
  );
}
