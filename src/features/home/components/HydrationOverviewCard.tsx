import {Droplets, GlassWater, Plus} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Card, CircularProgress} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';

type HydrationOverviewCardProps = {
  todayMl: number;
  goalMl: number;
  todayGlasses: number;
  goalGlasses: number;
  todayPercentage: number;
  streak: number;
  onAddWater: (amountMl: number) => void;
  loading?: boolean;
};

export function HydrationOverviewCard({
  todayMl,
  goalMl,
  todayGlasses,
  goalGlasses,
  todayPercentage,
  streak,
  onAddWater,
  loading = false,
}: HydrationOverviewCardProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.semibold,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    progressWrap: {
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressIcon: {
      position: 'absolute',
    },
    content: {
      flex: 1,
      gap: 2,
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 18,
      fontWeight: theme.typography.weights.bold,
    },
    valueSuffix: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.regular,
    },
    actionColumn: {
      gap: 6,
    },
    actionButton: {
      minWidth: 96,
      minHeight: 38,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 4,
      opacity: loading ? 0.5 : 1,
    },
    actionLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    footerLink: {
      alignSelf: 'center',
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Droplets color="#3D7FE3" size={18} />
          <Text style={styles.title}>Hidratación hoy</Text>
        </View>
        <Text style={styles.label}>
          {(todayMl / 1000).toFixed(1)} / {(goalMl / 1000).toFixed(1)} L
        </Text>
      </View>
      <View style={styles.contentRow}>
        <View style={styles.progressWrap}>
          <CircularProgress value={todayPercentage} size={64} strokeWidth={5} />
          <GlassWater
            color="#3D7FE3"
            size={18}
            strokeWidth={2.1}
            style={styles.progressIcon}
          />
        </View>
        <View style={styles.content}>
          <Text style={styles.value}>
            {todayGlasses}
            <Text style={styles.valueSuffix}> / {goalGlasses} vasos</Text>
          </Text>
          <Text style={styles.label}>
            {todayPercentage >= 100
              ? 'Meta alcanzada.'
              : `Faltan ${Math.max(goalGlasses - todayGlasses, 0)} vasos`}
          </Text>
          <Text style={styles.label}>Racha actual: {streak} días</Text>
        </View>
        <View style={styles.actionColumn}>
          <Pressable
            disabled={loading}
            onPress={() => onAddWater(250)}
            style={styles.actionButton}>
            <Plus color={theme.colors.textPrimary} size={12} />
            <Text style={styles.actionLabel}>1 vaso</Text>
          </Pressable>
          <Pressable
            disabled={loading}
            onPress={() => onAddWater(500)}
            style={styles.actionButton}>
            <Plus color={theme.colors.textPrimary} size={12} />
            <Text style={styles.actionLabel}>500 ml</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.footerLink}>Registrar otra cantidad →</Text>
    </Card>
  );
}
