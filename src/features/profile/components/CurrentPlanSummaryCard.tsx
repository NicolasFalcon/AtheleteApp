import type {LucideIcon} from 'lucide-react-native';
import {Dumbbell, Flame, Sparkles, Target} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';

type CurrentPlanSummaryCardProps = {
  goalLabel: string;
  trainingLabel: string;
  nutritionLabel: string;
  challengeLabel: string;
  onEdit: () => void;
  onOpenNutrition?: () => void;
  onOpenChallenge?: () => void;
};

function SetupItem({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    item: {
      width: '48%',
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      gap: 8,
    },
    iconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.medium,
      lineHeight: 20,
    },
  });

  const content = (
    <View style={styles.item}>
      <View style={styles.iconWrap}>
        <Icon color={theme.colors.textSecondary} size={14} strokeWidth={2} />
      </View>
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [pressed ? {opacity: 0.9} : null]}>
      {content}
    </Pressable>
  );
}

export function CurrentPlanSummaryCard({
  goalLabel,
  trainingLabel,
  nutritionLabel,
  challengeLabel,
  onEdit,
  onOpenNutrition,
  onOpenChallenge,
}: CurrentPlanSummaryCardProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 18,
      borderRadius: 28,
      gap: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 18,
      fontWeight: theme.typography.weights.bold,
    },
    editButton: {
      minHeight: 34,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'space-between',
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi plan actual</Text>
        <Pressable
          onPress={onEdit}
          style={({pressed}) => [styles.editButton, pressed ? {opacity: 0.88} : null]}>
          <Text style={styles.editLabel}>Editar</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <SetupItem icon={Target} label="Objetivo" value={goalLabel} />
        <SetupItem icon={Dumbbell} label="Entrenamiento" value={trainingLabel} />
        <SetupItem
          icon={Sparkles}
          label="Nutrición"
          value={nutritionLabel}
          onPress={onOpenNutrition}
        />
        <SetupItem
          icon={Flame}
          label="Core 33"
          value={challengeLabel}
          onPress={onOpenChallenge}
        />
      </View>
    </Card>
  );
}
