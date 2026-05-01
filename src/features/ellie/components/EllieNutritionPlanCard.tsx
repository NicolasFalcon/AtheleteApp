import {Pressable, StyleSheet, Text, View} from 'react-native';
import {UtensilsCrossed} from 'lucide-react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {EllieGeneratedNutritionPlan} from '@app/services/supabase/ellie-actions';
import {EllieCardActions} from '@app/features/ellie/components/EllieCardActions';

type EllieNutritionPlanCardProps = {
  plan: EllieGeneratedNutritionPlan;
  saved?: boolean;
  isSaving?: boolean;
  isRegenerating?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onRegenerate: () => void;
  onOpenPlan?: () => void;
};

export function EllieNutritionPlanCard({
  plan,
  saved = false,
  isSaving = false,
  isRegenerating = false,
  onSave,
  onDiscard,
  onRegenerate,
  onOpenPlan,
}: EllieNutritionPlanCardProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      width: '92%',
      alignSelf: 'flex-start',
      overflow: 'hidden',
      borderRadius: 24,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
    },
    headerText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0.4,
    },
    body: {
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricCard: {
      width: '47%',
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 10,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 28,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.7,
    },
    metricUnit: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      marginTop: 3,
    },
    notesWrap: {
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    notesText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 19,
    },
    savedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    savedLabel: {
      color: theme.colors.success,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    openButton: {
      minHeight: 34,
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    openLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <UtensilsCrossed color={theme.colors.textPrimary} size={14} strokeWidth={2} />
        <Text style={styles.headerText}>PLAN NUTRICIONAL POR ELLIE</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{plan.targetCalories}</Text>
            <Text style={styles.metricUnit}>kcal/día</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{plan.targetProtein}g</Text>
            <Text style={styles.metricUnit}>Proteína</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{plan.targetCarbs}g</Text>
            <Text style={styles.metricUnit}>Carbohidratos</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{plan.targetFats}g</Text>
            <Text style={styles.metricUnit}>Grasas</Text>
          </View>
        </View>

        {plan.notes ? (
          <View style={styles.notesWrap}>
            <Text style={styles.notesText}>{plan.notes}</Text>
          </View>
        ) : null}

        {saved ? (
          <View style={styles.savedRow}>
            <Text style={styles.savedLabel}>Plan activado</Text>
            {onOpenPlan ? (
              <Pressable
                onPress={onOpenPlan}
                style={({pressed}) => [
                  styles.openButton,
                  pressed ? {opacity: 0.88} : null,
                ]}>
                <Text style={styles.openLabel}>Ver plan</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <EllieCardActions
            saved={saved}
            savedLabel="Plan activado"
            primaryLabel="Activar plan"
            onPrimary={onSave}
            onDiscard={onDiscard}
            onRegenerate={onRegenerate}
            isPrimaryBusy={isSaving}
            isRegenerating={isRegenerating}
          />
        )}
      </View>
    </View>
  );
}
