import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button, FilterChip, PressableScale, Sheet, TextV2, useThemeV2 } from '@app/components/v2';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { mealTypeForTime, mealTypeLabel } from '@app/features/nutrition/mealDraft';
import { MEAL_ORDER } from '@app/features/nutrition/mealCache';
import { formatThousands } from '@app/features/nutrition/nutritionModel';
import type { MealType } from '@app/services/vision/visionService';

export const QUICK_MAX_KCAL = 5000;
export const QUICK_SHORTCUTS = [100, 250, 500] as const;

// "1.2a0" → 120: only digits, capped.
export function parseQuickKcal(text: string): number {
  const digits = text.replace(/\D/g, '');
  return Math.min(QUICK_MAX_KCAL, digits ? parseInt(digits, 10) : 0);
}

export type QuickKcalResult = { kcal: number; mealType: MealType; title: string };

// Kcal rápidas / Añadir a mano (design §23.3): only kcal, no macros. Also the
// way out of a failed analysis, with the reason on top.
export function QuickKcalSheet({
  open,
  onClose,
  onSubmit,
  saving = false,
  error = null,
  reason = null,
  language = 'es',
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (result: QuickKcalResult) => void;
  saving?: boolean;
  error?: string | null;
  reason?: string | null;
  language?: EllieLanguage;
}) {
  const { colors } = useThemeV2();
  const es = language === 'es';
  const [kcal, setKcal] = useState(0);
  const [mealType, setMealType] = useState<MealType>('snack');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (open) {
      setKcal(0);
      setTitle('');
      setMealType(mealTypeForTime(new Date()));
    }
  }, [open]);

  return (
    <Sheet
      open={open}
      onClose={() => !saving && onClose()}
      eyebrow={es ? 'SIN FOTO' : 'NO PHOTO'}
      title={es ? 'Kcal rápidas' : 'Quick kcal'}
      footer={
        <View style={styles.footer}>
          <Button
            label={es ? 'Cancelar' : 'Cancel'}
            variant="secondary"
            style={styles.flex}
            disabled={saving}
            onPress={onClose}
          />
          <Button
            label={kcal > 0 ? (es ? `Añadir ${formatThousands(kcal)} kcal` : `Add ${formatThousands(kcal)} kcal`) : es ? 'Añadir' : 'Add'}
            style={styles.flex}
            disabled={kcal <= 0 || saving}
            loading={saving}
            onPress={() => onSubmit({ kcal, mealType, title: title.trim() })}
          />
        </View>
      }
    >
      <View style={styles.body}>
        {reason ? (
          <TextV2 variant="meta" tone="secondary">
            {reason}
          </TextV2>
        ) : null}
        <View style={styles.figure}>
          <TextInput
            accessibilityLabel="kcal"
            keyboardType="number-pad"
            value={kcal > 0 ? String(kcal) : ''}
            placeholder="0"
            placeholderTextColor={colors.text.disabled}
            onChangeText={text => setKcal(parseQuickKcal(text))}
            style={[styles.input, { color: colors.text.primary }]}
            maxLength={4}
          />
          <View style={[styles.rule, { backgroundColor: colors.ember.base }]} />
          <TextV2 variant="meta" tone="secondary">
            kcal
          </TextV2>
        </View>
        <View style={styles.row}>
          {QUICK_SHORTCUTS.map(step => (
            <PressableScale
              key={step}
              accessibilityRole="button"
              accessibilityLabel={`+${step}`}
              onPress={() => setKcal(Math.min(QUICK_MAX_KCAL, kcal + step))}
              style={[styles.shortcut, { backgroundColor: colors.surface.muted }]}
            >
              <TextV2 variant="bodyStrong">{`+${step}`}</TextV2>
            </PressableScale>
          ))}
        </View>
        <View style={styles.row}>
          {MEAL_ORDER.map(type => (
            <FilterChip
              key={type}
              label={mealTypeLabel(type, language)}
              size={36}
              selected={mealType === type}
              onPress={() => setMealType(type)}
            />
          ))}
        </View>
        <TextInput
          accessibilityLabel={es ? 'Nombre (opcional)' : 'Name (optional)'}
          placeholder={es ? 'Nombre (opcional)' : 'Name (optional)'}
          placeholderTextColor={colors.text.disabled}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
          style={[styles.name, { backgroundColor: colors.surface.muted, color: colors.text.primary }]}
        />
        <TextV2 variant="meta" tone="secondary">
          {es
            ? 'Solo suma kcal; no calcula macros. Cuando puedas, hazle una foto al plato.'
            : 'It only adds kcal, no macros. When you can, take a photo of the plate.'}
        </TextV2>
        {error ? (
          <TextV2 variant="meta" color={colors.ember.deep}>
            {error}
          </TextV2>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: 'row', gap: 10 },
  body: { gap: 16 },
  figure: { alignItems: 'center', gap: 4 },
  input: { fontSize: 72, lineHeight: 80, fontWeight: '600', textAlign: 'center', minWidth: 160, padding: 0 },
  rule: { height: 2, width: 120, borderRadius: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  shortcut: { height: 44, paddingHorizontal: 22, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  name: { height: 52, borderRadius: 18, paddingHorizontal: 16, fontSize: 16 },
});
