import type { LucideIcon } from 'lucide-react-native';
import { Dumbbell, Flame, Sparkles, Target } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

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
  status,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  status: string;
  onPress?: () => void;
}) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    itemWrap: {
      width: '48%',
    },
    item: {
      width: '100%',
      minHeight: 98,
      borderRadius: theme.radii.sm,
      paddingHorizontal: 11,
      paddingVertical: 11,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      justifyContent: 'space-between',
      gap: 8,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0,
      textTransform: 'uppercase',
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 20,
      marginTop: 4,
    },
    status: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
  });

  const content = (
    <View style={styles.item}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.iconWrap}>
          <Icon color={theme.colors.textSecondary} size={14} strokeWidth={2} />
        </View>
      </View>
      <View>
        <Text numberOfLines={2} style={styles.value}>
          {value}
        </Text>
        <Text style={styles.status}>{status}</Text>
      </View>
    </View>
  );

  if (!onPress) {
    return <View style={styles.itemWrap}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.itemWrap,
        pressed ? { opacity: 0.9 } : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

function getChallengeStatus(challengeLabel: string) {
  if (challengeLabel === 'Sin reto') {
    return 'Sin reto';
  }

  if (challengeLabel.startsWith('Completado')) {
    return 'Completado';
  }

  return 'En progreso';
}

function getNutritionStatus(nutritionLabel: string) {
  if (nutritionLabel === 'Sin plan') {
    return 'Pendiente';
  }

  if (nutritionLabel === 'Plan activo') {
    return 'Sin registro hoy';
  }

  return 'Registrado hoy';
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
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 16,
      borderRadius: theme.radii.md,
      gap: 12,
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
      fontSize: 17,
      fontWeight: theme.typography.weights.bold,
    },
    editButton: {
      minHeight: 32,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'space-between',
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi plan actual</Text>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [
            styles.editButton,
            pressed ? { opacity: 0.88 } : null,
          ]}
        >
          <Text style={styles.editLabel}>Editar plan</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <SetupItem
          icon={Target}
          label="Objetivo"
          value={goalLabel}
          status={goalLabel === 'Sin objetivo' ? 'Pendiente' : 'Configurado'}
        />
        <SetupItem
          icon={Dumbbell}
          label="Entrenamiento"
          value={trainingLabel}
          status={trainingLabel === 'Sin frecuencia' ? 'Pendiente' : 'Semanal'}
        />
        <SetupItem
          icon={Sparkles}
          label="Nutrición"
          value={nutritionLabel}
          status={getNutritionStatus(nutritionLabel)}
          onPress={onOpenNutrition}
        />
        <SetupItem
          icon={Flame}
          label="Core 33"
          value={challengeLabel}
          status={getChallengeStatus(challengeLabel)}
          onPress={onOpenChallenge}
        />
      </View>
    </Card>
  );
}
