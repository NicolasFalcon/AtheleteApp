import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {
  Check,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {EllieGeneratedNutritionPlan} from '@app/services/supabase/ellie-actions';

type EllieNutritionPlanCardProps = {
  plan: EllieGeneratedNutritionPlan;
  saved?: boolean;
  isSaving?: boolean;
  isRegenerating?: boolean;
  onSave: () => void;
  onRegenerate: () => void;
  onAdjust: () => void;
  onOpenPlan?: () => void;
};

function getPlanReason(plan: EllieGeneratedNutritionPlan) {
  if (plan.notes?.trim()) {
    return plan.notes.trim();
  }

  return 'Mantengo proteína alta para proteger masa muscular y distribuir mejor tu energía diaria.';
}

export function EllieNutritionPlanCard({
  plan,
  saved = false,
  isSaving = false,
  isRegenerating = false,
  onSave,
  onRegenerate,
  onAdjust,
  onOpenPlan,
}: EllieNutritionPlanCardProps) {
  const {theme} = useAppTheme();
  const reason = getPlanReason(plan);
  const macros = [
    `${plan.targetProtein}g proteína`,
    `${plan.targetCarbs}g carbos`,
    `${plan.targetFats}g grasas`,
  ];

  const styles = StyleSheet.create({
    card: {
      width: '100%',
      alignSelf: 'center',
      borderRadius: 24,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(17,17,17,0.08)',
      padding: 14,
      shadowColor: '#000000',
      shadowOpacity: 0.06,
      shadowRadius: 26,
      shadowOffset: {width: 0, height: 12},
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 18,
    },
    headerText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    heroBlock: {
      gap: 8,
    },
    caloriesRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    caloriesValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 38,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 44,
      letterSpacing: -0.7,
    },
    caloriesUnit: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      lineHeight: 26,
      fontWeight: theme.typography.weights.medium,
    },
    heroDescription: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 21,
      maxWidth: '92%',
    },
    macroRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 18,
    },
    macroPill: {
      minHeight: 32,
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(17,17,17,0.1)',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    macroText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginTop: 20,
      marginBottom: 16,
    },
    editorialBlock: {
      gap: 7,
      marginBottom: 16,
    },
    blockTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
    },
    blockText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 20,
    },
    tipBlock: {
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 14,
      paddingVertical: 13,
      gap: 7,
      marginBottom: 18,
    },
    tipTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    primaryButton: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    primaryLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
    },
    secondaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(17,17,17,0.12)',
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    secondaryLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
    },
    savedRow: {
      minHeight: 46,
      borderRadius: 14,
      backgroundColor: 'rgba(46,107,76,0.08)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    savedText: {
      color: theme.colors.success,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
    },
    openButton: {
      marginTop: 10,
      minHeight: 42,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(17,17,17,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    openLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <UtensilsCrossed
          color={theme.colors.textPrimary}
          size={15}
          strokeWidth={2}
        />
        <Text style={styles.headerText}>Plan nutricional por ELLIE</Text>
      </View>

      <View style={styles.heroBlock}>
        <View style={styles.caloriesRow}>
          <Text style={styles.caloriesValue}>{plan.targetCalories}</Text>
          <Text style={styles.caloriesUnit}>kcal/día</Text>
        </View>
        <Text style={styles.heroDescription}>
          Déficit controlado para perder grasa sin comprometer masa muscular.
        </Text>
      </View>

      <View style={styles.macroRow}>
        {macros.map(macro => (
          <View key={macro} style={styles.macroPill}>
            <Text style={styles.macroText}>{macro}</Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.editorialBlock}>
        <Text style={styles.blockTitle}>Por qué este plan</Text>
        <Text numberOfLines={2} style={styles.blockText}>
          {reason}
        </Text>
      </View>

      <View style={styles.tipBlock}>
        <View style={styles.tipTitleRow}>
          <Sparkles color={theme.colors.textPrimary} size={14} strokeWidth={2} />
          <Text style={styles.blockTitle}>Consejo de ELLIE</Text>
        </View>
        <Text style={styles.blockText}>
          Prioriza carbohidratos antes de entrenar y grasas saludables en la
          cena.
        </Text>
      </View>

      {saved ? (
        <>
          <View style={styles.savedRow}>
            <Check color={theme.colors.success} size={16} strokeWidth={2.2} />
            <Text style={styles.savedText}>Plan activado</Text>
          </View>
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
        </>
      ) : (
        <>
          <Pressable
            disabled={isSaving || isRegenerating}
            onPress={onSave}
            style={({pressed}) => [
              styles.primaryButton,
              pressed && !isSaving && !isRegenerating ? {opacity: 0.92} : null,
              isSaving || isRegenerating ? {opacity: 0.7} : null,
            ]}>
            {isSaving ? (
              <ActivityIndicator color={theme.colors.accentContrast} />
            ) : (
              <>
                <Check
                  color={theme.colors.accentContrast}
                  size={17}
                  strokeWidth={2.2}
                />
                <Text style={styles.primaryLabel}>Activar plan</Text>
              </>
            )}
          </Pressable>

          <View style={styles.secondaryRow}>
            <Pressable
              disabled={isSaving || isRegenerating}
              onPress={onRegenerate}
              style={({pressed}) => [
                styles.secondaryButton,
                pressed && !isSaving && !isRegenerating ? {opacity: 0.84} : null,
              ]}>
              {isRegenerating ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <>
                  <RefreshCw
                    color={theme.colors.textPrimary}
                    size={15}
                    strokeWidth={2}
                  />
                  <Text style={styles.secondaryLabel}>Otra versión</Text>
                </>
              )}
            </Pressable>

            <Pressable
              disabled={isSaving || isRegenerating}
              onPress={onAdjust}
              style={({pressed}) => [
                styles.secondaryButton,
                pressed && !isSaving && !isRegenerating ? {opacity: 0.84} : null,
              ]}>
              <SlidersHorizontal
                color={theme.colors.textPrimary}
                size={15}
                strokeWidth={2}
              />
              <Text style={styles.secondaryLabel}>Ajustar</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
