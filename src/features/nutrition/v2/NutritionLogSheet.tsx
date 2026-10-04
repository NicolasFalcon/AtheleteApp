import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import {
  Button,
  FilterChip,
  PressableScale,
  Sheet,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import {
  applyIncrements,
  emptyIncrements,
  formatThousands,
  hasIncrements,
  KCAL_SHORTCUTS,
  parseKcal,
  stepMacro,
  type DayTotals,
  type LogIncrements,
  type LogTotals,
} from '@app/features/nutrition/nutritionModel';
import type { DailyNutritionLog } from '@app/shared';

const MACROS = [
  { key: 'protein', label: 'Proteína' },
  { key: 'carbs', label: 'Carbohidratos' },
  { key: 'fats', label: 'Grasas' },
] as const;

// Registrar nutrición (NUTRI_03): what is eaten is added to the day's totals
// (kcal with shortcuts or typed, macros in steps of 5 g). Nothing is written
// until Guardar; a failed save keeps the sheet open with the reason.
export function NutritionLogSheet({
  open,
  onClose,
  totals,
  todayLog,
  saving,
  error,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  totals: DayTotals;
  todayLog: Pick<DailyNutritionLog, 'calories' | 'protein' | 'carbs' | 'fats'> | null;
  saving: boolean;
  error: string | null;
  onSave: (next: LogTotals) => void;
}) {
  const { colors } = useThemeV2();
  const [add, setAdd] = useState<LogIncrements>(emptyIncrements);
  const [shortcut, setShortcut] = useState<number | null>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (open) {
      setAdd(emptyIncrements);
      setShortcut(null);
      setText('');
    }
  }, [open]);

  const next = applyIncrements(todayLog, add);
  const target = totals.kcal.target;

  const setKcal = (kcal: number, from: 'shortcut' | 'text', index?: number) => {
    setAdd(current => ({ ...current, kcal }));
    setShortcut(from === 'shortcut' ? index ?? null : null);
    setText(from === 'shortcut' ? String(kcal) : text);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      scrollable
      eyebrow="Nutrición · hoy"
      title="Registrar nutrición"
      footer={
        <View style={styles.footer}>
          <Button
            label="Cancelar"
            variant="secondary"
            disabled={saving}
            onPress={onClose}
            style={styles.cancel}
          />
          <Button
            label="Guardar"
            loading={saving}
            loadingLabel="Guardando"
            disabled={!hasIncrements(add)}
            onPress={() => onSave(next)}
            style={styles.save}
          />
        </View>
      }
    >
      <View style={styles.body}>
        <View style={styles.consumed}>
          <TextV2 variant="body">Consumido hoy</TextV2>
          <View style={styles.baseline}>
            <TextV2 variant="title22">{formatThousands(next.calories)}</TextV2>
            <TextV2 variant="meta" tone="secondary">
              {target ? `de ${formatThousands(target)} kcal` : 'kcal'}
            </TextV2>
          </View>
        </View>

        <View style={styles.block}>
          <TextV2 variant="meta" tone="secondary">
            Atajos
          </TextV2>
          <View style={styles.chips}>
            {KCAL_SHORTCUTS.map((value, index) => (
              <FilterChip
                key={value}
                size={40}
                label={`+${value} kcal`}
                selected={shortcut === index}
                onPress={() => setKcal(value, 'shortcut', index)}
                style={styles.chip}
              />
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <TextV2 variant="meta" tone="secondary">
            Calorías
          </TextV2>
          <View style={[styles.field, { backgroundColor: colors.surface.field }]}>
            <TextInput
              accessibilityLabel="Calorías a sumar"
              value={text}
              onChangeText={value => {
                const digits = value.replace(/\D/g, '');
                setText(digits);
                setKcal(parseKcal(digits), 'text');
              }}
              keyboardType="number-pad"
              style={[styles.input, { color: colors.text.primary }]}
            />
            <TextV2 variant="body" tone="secondary">
              kcal
            </TextV2>
          </View>
        </View>

        {MACROS.map((macro, index) => {
          const total = totals.macros[index];
          const value = next[macro.key === 'fats' ? 'fats' : macro.key];
          return (
            <View key={macro.key} style={styles.macro}>
              <TextV2 variant="bodyStrong" style={styles.macroLabel}>
                {macro.label}
              </TextV2>
              <TextV2 variant="meta" tone="secondary">
                {total.goal ? `${value} / ${total.goal} g` : `${value} g`}
              </TextV2>
              <View style={[styles.pill, { backgroundColor: colors.surface.muted }]}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Menos ${macro.label}`}
                  disabled={add[macro.key] <= 0}
                  onPress={() =>
                    setAdd(current => ({ ...current, [macro.key]: stepMacro(current[macro.key], -1) }))
                  }
                  style={[styles.step, { opacity: add[macro.key] <= 0 ? 0.4 : 1 }]}
                >
                  <Minus size={16} color={colors.text.primary} strokeWidth={2.2} />
                </PressableScale>
                <TextV2 variant="bodyStrong" align="center" style={styles.delta}>
                  {`+${add[macro.key]}`}
                </TextV2>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Más ${macro.label}`}
                  onPress={() =>
                    setAdd(current => ({ ...current, [macro.key]: stepMacro(current[macro.key], 1) }))
                  }
                  style={styles.step}
                >
                  <Plus size={16} color={colors.text.primary} strokeWidth={2.2} />
                </PressableScale>
              </View>
            </View>
          );
        })}

        {error ? (
          <TextV2 variant="meta" color={colors.ember.deep} accessibilityLiveRegion="polite">
            {error}
          </TextV2>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  footer: { flex: 1, flexDirection: 'row', gap: 10 },
  cancel: { flex: 1 },
  save: { flex: 2 },
  body: { gap: 18 },
  consumed: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  block: { gap: 8 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1 },
  field: { height: 54, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, fontSize: 17, textAlign: 'right', padding: 0 },
  macro: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  macroLabel: { flex: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, padding: 4 },
  step: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  delta: { minWidth: 38 },
});
