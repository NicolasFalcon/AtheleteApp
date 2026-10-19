import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ArrowUp, Camera, Minus, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  FilterChip,
  GlassSurface,
  LivingHalo,
  PressableScale,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { MEAL_ORDER } from '@app/features/nutrition/mealCache';
import {
  canSave,
  clockLabel,
  draftTotals,
  isLowConfidence,
  itemValues,
  mealTypeLabel,
  perUnitLine,
  removeItem,
  setMealType,
  stepItem,
  unitLabel,
  unitLine,
  type MealDraft,
} from '@app/features/nutrition/mealDraft';
import { formatThousands } from '@app/features/nutrition/nutritionModel';
import { MealPhoto } from '@app/features/nutrition/v2/MealPhoto';
import { useSignedImage } from '@app/hooks/useSignedImage';

const HERO = 300;

// Resultado / edición de una comida (design §23.3): the photo as header with
// close, "Otra foto" and the "ESTIMACIÓN DE ELLIE" chip; title, total and
// macros; the moment of the day; each food with its − / + portion and Quitar;
// "Dile algo a ELLIE" to recalculate; "Añadir al día" (or "Guardar cambios") as
// the only primary. Nothing is saved until that button.
export function MealResultView({
  draft,
  onChange,
  photoUri,
  mode,
  language,
  submitting,
  error,
  onSubmit,
  onClose,
  onRetake,
  onHint,
  hinting = false,
  hintNote = null,
}: {
  draft: MealDraft;
  onChange: (draft: MealDraft) => void;
  // The local photo (just taken); else the stored one is downloaded.
  photoUri: string | null;
  mode: 'new' | 'edit';
  language: EllieLanguage;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
  onClose: () => void;
  onRetake?: () => void;
  // Recalculate with a note ("también tenía aceite"): another analysis.
  onHint?: (text: string) => Promise<void>;
  hinting?: boolean;
  hintNote?: string | null;
}) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const es = language === 'es';
  const remote = useSignedImage(photoUri ? null : draft.imagePath);
  const uri = photoUri ?? remote;
  const totals = draftTotals(draft);
  const [hint, setHint] = useState('');
  const low = isLowConfidence(draft);
  const estimate = draft.imagePath !== null && draft.items.length > 0;

  const sendHint = async () => {
    const text = hint.trim();
    if (!text || !onHint || hinting) {
      return;
    }
    await onHint(text);
    setHint('');
  };

  const ctaLabel =
    mode === 'edit'
      ? es ? 'Guardar cambios' : 'Save changes'
      : es ? `Añadir al día · ${formatThousands(totals.kcal)} kcal` : `Add to today · ${formatThousands(totals.kcal)} kcal`;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}
        >
          <MealPhoto
            uri={uri}
            height={HERO}
            label={es ? 'Ver la foto' : 'See the photo'}
            closeLabel={es ? 'Cerrar' : 'Close'}
          >
            <View style={[styles.heroTop, { paddingTop: insets.top + 8 }]}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={es ? 'Cerrar' : 'Close'}
                onPress={onClose}
                style={styles.round44}
              >
                <X size={20} color="#FFFFFF" strokeWidth={2} />
              </PressableScale>
              {mode === 'new' && onRetake ? (
                <PressableScale accessibilityRole="button" onPress={onRetake} style={styles.retake}>
                  <Camera size={16} color="#FFFFFF" strokeWidth={2} />
                  <TextV2 variant="metaStrong" color="#FFFFFF">
                    {es ? 'Otra foto' : 'Another photo'}
                  </TextV2>
                </PressableScale>
              ) : (
                <View style={styles.round44} />
              )}
            </View>
            {estimate ? (
              <View style={styles.chip}>
                <LivingHalo size={18} state="idle" />
                <TextV2 variant="eyebrow" color="#FFFFFF">
                  {es ? 'ESTIMACIÓN DE ELLIE' : "ELLIE'S ESTIMATE"}
                </TextV2>
              </View>
            ) : null}
          </MealPhoto>

          <View style={styles.body}>
            <TextInput
              accessibilityLabel={es ? 'Nombre de la comida' : 'Meal name'}
              value={draft.title}
              onChangeText={title => onChange({ ...draft, title })}
              placeholder={es ? 'Nombre de la comida' : 'Meal name'}
              placeholderTextColor={colors.text.disabled}
              maxLength={120}
              multiline
              style={[styles.title, { color: colors.text.primary }]}
            />

            <View style={styles.totalRow}>
              <TextV2 style={styles.total}>{formatThousands(totals.kcal)}</TextV2>
              <TextV2 variant="body" tone="secondary">
                kcal
              </TextV2>
            </View>
            {draft.items.length > 0 ? (
              <TextV2 variant="meta" tone="secondary">
                {es
                  ? `Proteína ${totals.protein} g · Carbohidratos ${totals.carbs} g · Grasas ${totals.fats} g`
                  : `Protein ${totals.protein} g · Carbs ${totals.carbs} g · Fats ${totals.fats} g`}
              </TextV2>
            ) : null}

            {low ? (
              <View style={[styles.note, { backgroundColor: colors.surface.muted }]}>
                <LivingHalo size={22} state="idle" />
                <TextV2 variant="meta" style={styles.flex}>
                  {es
                    ? 'No estoy segura de algún alimento. Revisa las porciones y quita lo que no sea.'
                    : "I'm not sure about some food. Check the portions and remove what isn't there."}
                </TextV2>
              </View>
            ) : null}
            {draft.warnings.map(warning => (
              <TextV2 key={warning} variant="meta" tone="secondary">
                {warning}
              </TextV2>
            ))}

            <View style={styles.section}>
              <View style={styles.pills}>
                {MEAL_ORDER.map(type => (
                  <FilterChip
                    key={type}
                    label={mealTypeLabel(type, language)}
                    size={36}
                    selected={draft.mealType === type}
                    onPress={() => onChange(setMealType(draft, type))}
                  />
                ))}
              </View>
              {draft.mealTypeFromClock ? (
                <TextV2 variant="meta" tone="secondary">
                  {es
                    ? `Según la hora (${clockLabel(new Date())}). Cámbialo si no es así.`
                    : `Based on the time (${clockLabel(new Date())}). Change it if it isn't right.`}
                </TextV2>
              ) : null}
            </View>

            {draft.items.length > 0 ? (
              <View style={styles.section}>
                <TextV2 variant="eyebrow" tone="secondary">
                  {es ? 'ALIMENTOS' : 'FOODS'}
                </TextV2>
                {draft.items.map(item => {
                  const values = itemValues(item);
                  return (
                    <View key={item.id} style={styles.food}>
                      <View style={styles.foodHead}>
                        <View style={styles.flex}>
                          <TextV2 variant="bodyStrong" numberOfLines={2}>
                            {item.name}
                          </TextV2>
                          {values.unit ? (
                            <TextV2 variant="meta" tone="secondary">
                              {unitLine(values, language)}
                            </TextV2>
                          ) : null}
                          <TextV2 variant="meta" tone="secondary">
                            {`P ${values.protein} · C ${values.carbs} · G ${values.fats} g`}
                          </TextV2>
                          {values.unit ? (
                            <TextV2 variant="meta" tone="tertiary">
                              {perUnitLine(values.unit, language)}
                            </TextV2>
                          ) : null}
                        </View>
                        <TextV2 variant="bodyStrong">{`${formatThousands(values.kcal)} kcal`}</TextV2>
                      </View>
                      <View style={styles.foodActions}>
                        <View style={[styles.stepper, { backgroundColor: colors.surface.muted }]}>
                          <PressableScale
                            accessibilityRole="button"
                            accessibilityLabel={es ? 'Menos' : 'Less'}
                            onPress={() => onChange(stepItem(draft, item.id, -1))}
                            style={styles.stepBtn}
                          >
                            <Minus size={16} color={colors.text.primary} strokeWidth={2.2} />
                          </PressableScale>
                          <TextV2 variant="bodyStrong" style={styles.grams}>
                            {item.unit
                              ? `${item.unit.count} ${unitLabel(item.unit.label, item.unit.count, language)}`
                              : `${item.grams} g`}
                          </TextV2>
                          <PressableScale
                            accessibilityRole="button"
                            accessibilityLabel={es ? 'Más' : 'More'}
                            onPress={() => onChange(stepItem(draft, item.id, 1))}
                            style={styles.stepBtn}
                          >
                            <Plus size={16} color={colors.text.primary} strokeWidth={2.2} />
                          </PressableScale>
                        </View>
                        <PressableScale
                          accessibilityRole="button"
                          onPress={() => onChange(removeItem(draft, item.id))}
                        >
                          <TextV2 variant="metaStrong" color={colors.ember.deep}>
                            {es ? 'Quitar' : 'Remove'}
                          </TextV2>
                        </PressableScale>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {onHint ? (
              <View style={styles.section}>
                <View style={[styles.hintField, { backgroundColor: colors.surface.muted }]}>
                  <LivingHalo size={26} state={hinting ? 'thinking' : 'idle'} />
                  <TextInput
                    accessibilityLabel={es ? 'Dile algo a ELLIE' : 'Tell ELLIE something'}
                    value={hint}
                    onChangeText={setHint}
                    editable={!hinting}
                    placeholder={hinting ? (es ? 'Recalculando…' : 'Recalculating…') : es ? 'Dile algo a ELLIE' : 'Tell ELLIE something'}
                    placeholderTextColor={colors.text.disabled}
                    maxLength={200}
                    onSubmitEditing={() => {
                      sendHint().catch(() => undefined);
                    }}
                    returnKeyType="send"
                    style={[styles.hintInput, { color: colors.text.primary }]}
                  />
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={es ? 'Enviar' : 'Send'}
                    disabled={!hint.trim() || hinting}
                    onPress={() => {
                      sendHint().catch(() => undefined);
                    }}
                    style={[styles.send, { backgroundColor: hint.trim() ? colors.cta.primary : colors.divider }]}
                  >
                    <ArrowUp size={18} color={colors.cta.primaryText} strokeWidth={2.4} />
                  </PressableScale>
                </View>
                {hintNote ? (
                  <TextV2 variant="meta" tone="secondary">
                    {hintNote}
                  </TextV2>
                ) : null}
              </View>
            ) : null}

            {error ? (
              <TextV2 variant="meta" color={colors.ember.deep}>
                {error}
              </TextV2>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <GlassSurface kind="nav" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button
          label={ctaLabel}
          fullWidth
          loading={submitting}
          disabled={!canSave(draft) || submitting || hinting}
          onPress={onSubmit}
        />
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  round44: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14,13,12,.45)', alignItems: 'center', justifyContent: 'center' },
  retake: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: 'rgba(14,13,12,.45)' },
  chip: { position: 'absolute', left: 16, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(14,13,12,.55)' },
  body: { padding: 20, gap: 14 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '600', padding: 0 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  total: { fontSize: 48, lineHeight: 52, fontWeight: '600', letterSpacing: -1.9 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, padding: 14 },
  section: { gap: 10 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  food: { gap: 10, paddingVertical: 6 },
  foodHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  foodActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 36, borderRadius: 18 },
  stepBtn: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  grams: { minWidth: 56, textAlign: 'center' },
  hintField: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 26, paddingLeft: 14, paddingRight: 6 },
  hintInput: { flex: 1, fontSize: 15, padding: 0 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 20 },
});
