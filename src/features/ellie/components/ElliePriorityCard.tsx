import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

type ElliePriorityCardProps = {
  icon: ReactNode;
  text: string;
  actionLabel: string;
  onPress: () => void;
};

export function ElliePriorityCard({
  icon,
  text,
  actionLabel,
  onPress,
}: ElliePriorityCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 0,
      borderRadius: theme.radii.md,
      overflow: 'hidden',
    },
    pressable: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    text: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 20,
    },
    hint: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      marginTop: 4,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
    },
  });

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          pressed ? { opacity: 0.86 } : null,
        ]}
      >
        <View style={styles.iconWrap}>{icon}</View>
        <View style={styles.content}>
          <Text style={styles.text}>{text}</Text>
          <Text style={styles.hint}>Acción rápida</Text>
        </View>
        <View style={styles.action}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
          <ChevronRight color={theme.colors.textPrimary} size={16} />
        </View>
      </Pressable>
    </Card>
  );
}
