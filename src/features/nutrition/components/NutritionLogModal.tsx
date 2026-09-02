import {useEffect, useMemo, useState} from 'react';
import {X} from 'lucide-react-native';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button, Card, ProgressBar} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {getLocalDateKey} from '@app/lib/date';
import type {DailyNutritionLog, NutritionPlan} from '@app/shared';
import type {NutritionLogInput} from '@app/services/supabase/nutrition';

type NutritionLogModalProps = {
  visible: boolean;
  plan: NutritionPlan;
  todayLog: DailyNutritionLog | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (input: NutritionLogInput) => Promise<void>;
};

type FieldKey = 'calories' | 'protein' | 'carbs' | 'fats';

const quickCalories = [
  {label: '+200 snack', value: 200},
  {label: '+400 comida', value: 400},
  {label: '+600 plato fuerte', value: 600},
];

function toInputValue(value: number | undefined) {
  return value && value > 0 ? String(value) : '';
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function scoreAgainstTarget(value: number, target?: number) {
  if (!target || target <= 0) {
    return null;
  }

  const delta = Math.abs(value - target) / target;
  return Math.max(0, Math.round(100 - Math.min(delta, 1) * 100));
}

function calculateAdherence(params: {
  plan: NutritionPlan;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}) {
  const scores = [
    scoreAgainstTarget(params.calories, params.plan.targetCalories),
    scoreAgainstTarget(params.protein, params.plan.targetProtein),
    scoreAgainstTarget(params.carbs, params.plan.targetCarbs),
    scoreAgainstTarget(params.fats, params.plan.targetFats),
  ].filter((score): score is number => typeof score === 'number');

  if (scores.length === 0) {
    return 0;
  }

  return Math.round(
    scores.reduce((total, score) => total + score, 0) / scores.length,
  );
}

export function NutritionLogModal({
  visible,
  plan,
  todayLog,
  saving = false,
  onClose,
  onSave,
}: NutritionLogModalProps) {
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<Record<FieldKey, string>>({
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
  });
  const todayLabel = useMemo(
    () =>
      new Date(`${getLocalDateKey()}T00:00:00`).toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    setValues({
      calories: toInputValue(todayLog?.calories),
      protein: toInputValue(todayLog?.protein),
      carbs: toInputValue(todayLog?.carbs),
      fats: toInputValue(todayLog?.fats),
    });
  }, [todayLog, visible]);

  const parsedValues = {
    calories: parseNumber(values.calories),
    protein: parseNumber(values.protein),
    carbs: parseNumber(values.carbs),
    fats: parseNumber(values.fats),
  };
  const adherence = calculateAdherence({
    plan,
    ...parsedValues,
  });

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.58)',
    },
    keyboard: {
      justifyContent: 'flex-end',
    },
    sheet: {
      maxHeight: '92%',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: theme.colors.background,
      paddingTop: 8,
      overflow: 'hidden',
    },
    handle: {
      width: 38,
      height: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.border,
      alignSelf: 'center',
      marginVertical: 8,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: insets.bottom + theme.spacing.lg,
      gap: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
    },
    eyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 21,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.4,
      marginTop: 2,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    goalCard: {
      padding: 14,
      borderRadius: 22,
      gap: 10,
    },
    goalText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
    },
    fields: {
      gap: 12,
    },
    field: {
      gap: 7,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    label: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
    },
    target: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
    input: {
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.semibold,
      paddingHorizontal: 14,
    },
    quickRow: {
      flexDirection: 'row',
      gap: 8,
    },
    quickButton: {
      flex: 1,
      minHeight: 34,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    quickLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
    },
    progressCard: {
      padding: 14,
      borderRadius: 20,
      gap: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    progressLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    progressValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: theme.radii.pill,
    },
  });

  const updateValue = (key: FieldKey, nextValue: string) => {
    setValues(current => ({
      ...current,
      [key]: nextValue.replace(/[^0-9,.]/g, ''),
    }));
  };

  const addCalories = (amount: number) => {
    setValues(current => ({
      ...current,
      calories: String(parseNumber(current.calories) + amount),
    }));
  };

  const handleSave = async () => {
    await onSave({
      calories: parsedValues.calories,
      protein: parsedValues.protein,
      carbs: plan.targetCarbs != null ? parsedValues.carbs : undefined,
      fats: plan.targetFats != null ? parsedValues.fats : undefined,
      adherence,
    });
  };

  const renderField = (
    key: FieldKey,
    label: string,
    unit: string,
    target?: number,
  ) => (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {target ? (
          <Text style={styles.target}>
            Meta {target.toLocaleString('es-CL')} {unit}
          </Text>
        ) : null}
      </View>
      <TextInput
        value={values[key]}
        onChangeText={nextValue => updateValue(key, nextValue)}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.input}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.handle} />
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <View>
                  <Text style={styles.eyebrow}>{todayLabel}</Text>
                  <Text style={styles.title}>
                    {todayLog ? 'Editar nutrición' : 'Registrar nutrición'}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  style={({pressed}) => [
                    styles.closeButton,
                    pressed ? {opacity: 0.86} : null,
                  ]}>
                  <X color={theme.colors.textPrimary} size={18} strokeWidth={2.1} />
                </Pressable>
              </View>

              <Card style={styles.goalCard}>
                <Text style={styles.goalText}>
                  Objetivo diario: {plan.targetCalories.toLocaleString('es-CL')} kcal ·{' '}
                  {plan.targetProtein}g proteína
                  {plan.targetCarbs != null ? ` · ${plan.targetCarbs}g carbos` : ''}
                  {plan.targetFats != null ? ` · ${plan.targetFats}g grasas` : ''}
                </Text>
              </Card>

              <View style={styles.fields}>
                {renderField('calories', 'Calorías consumidas', 'kcal', plan.targetCalories)}
                <View style={styles.quickRow}>
                  {quickCalories.map(item => (
                    <Pressable
                      key={item.label}
                      onPress={() => addCalories(item.value)}
                      style={({pressed}) => [
                        styles.quickButton,
                        pressed ? {opacity: 0.82} : null,
                      ]}>
                      <Text style={styles.quickLabel}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
                {renderField('protein', 'Proteína', 'g', plan.targetProtein)}
                {plan.targetCarbs != null
                  ? renderField('carbs', 'Carbohidratos', 'g', plan.targetCarbs)
                  : null}
                {plan.targetFats != null
                  ? renderField('fats', 'Grasas', 'g', plan.targetFats)
                  : null}
              </View>

              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Adherencia estimada</Text>
                  <Text style={styles.progressValue}>{adherence}%</Text>
                </View>
                <ProgressBar value={adherence} max={100} />
              </View>

              <View style={styles.actions}>
                <Button
                  label="Cancelar"
                  onPress={onClose}
                  variant="outline"
                  style={styles.actionButton}
                />
                <Button
                  label={saving ? 'Guardando...' : 'Guardar'}
                  onPress={() => {
                    handleSave().catch(() => undefined);
                  }}
                  loading={saving}
                  disabled={saving}
                  style={styles.actionButton}
                />
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
