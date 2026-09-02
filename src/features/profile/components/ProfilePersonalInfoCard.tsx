import { ChevronRight, UserRound } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

type ProfilePersonalInfoCardProps = {
  ageLabel: string;
  weightLabel: string;
  heightLabel: string;
  onEdit: () => void;
};

function PhysicalRow({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    row: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
    },
  });

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function ProfilePersonalInfoCard({
  ageLabel,
  weightLabel,
  heightLabel,
  onEdit,
}: ProfilePersonalInfoCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      paddingHorizontal: 14,
      paddingVertical: 4,
      borderRadius: theme.radii.md,
    },
    actionRow: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    actionLabel: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [
          styles.actionRow,
          pressed ? { opacity: 0.72 } : null,
        ]}
      >
        <View style={styles.iconWrap}>
          <UserRound
            color={theme.colors.textSecondary}
            size={15}
            strokeWidth={1.9}
          />
        </View>
        <Text style={styles.actionLabel}>Información personal</Text>
        <ChevronRight
          color={theme.colors.textSecondary}
          size={17}
          strokeWidth={1.8}
        />
      </Pressable>
      <PhysicalRow label="Edad" value={`${ageLabel} años`} />
      <PhysicalRow label="Peso" value={`${weightLabel} kg`} />
      <PhysicalRow label="Altura" value={`${heightLabel} cm`} />
    </Card>
  );
}
