import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ArrowLeft, Lock, Pencil } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, PressableScale, Skeleton, StatusBarV2, TextV2, useThemeV2, useToast } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { clockLabel, draftFromMeal, mealTypeLabel, perUnitLine, unitLine } from '@app/features/nutrition/mealDraft';
import { formatThousands } from '@app/features/nutrition/nutritionModel';
import { MealPhoto } from '@app/features/nutrition/v2/MealPhoto';
import { ConfirmDialog } from '@app/features/nutrition/v2/ConfirmDialog';
import { useMealMutations, useNutritionDayMeals } from '@app/hooks/useMeals';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { useSignedImage } from '@app/hooks/useSignedImage';
import type { AppScreenProps } from '@app/types/navigation';

const HERO = 360;

// Detalle de comida (design §23.3): photo header with back, edit and the "Solo
// tú" chip; the moment and the time, the name, the kcal and the macro trio,
// the foods; Editar (opens the result in edit mode) and Borrar (a dialog that
// says the photo goes too).
export function MealDetailScreen({ navigation, route }: AppScreenProps<'MealDetail'>) {
  const { mealId, date = null } = route.params;
  const { colors, mode } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const language = useProfileLanguage();
  const es = language === 'es';
  const day = useNutritionDayMeals(date);
  const meals = useMealMutations();
  const meal = useMemo(() => day.data?.meals.find(item => item.id === mealId) ?? null, [day.data, mealId]);
  const photo = useSignedImage(meal?.imagePath);
  const [confirm, setConfirm] = useState(false);

  const remove = () => {
    setConfirm(false);
    // Optimistic: the day already shows it gone; it comes back if the server
    // refuses.
    meals.remove.mutate(mealId, {
      onError: () => toast.show(es ? 'No pudimos borrarla' : "We couldn't delete it", { tone: 'error' }),
    });
    navigation.goBack();
  };

  if (!meal) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top + 16, paddingHorizontal: 20 }]}>
        <StatusBarV2 />
        <PressableScale accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}>
          <ArrowLeft size={20} color={colors.text.primary} strokeWidth={2} />
        </PressableScale>
        {day.isLoading ? <Skeleton height={200} radius={24} /> : (
          <TextV2 variant="body" tone="secondary">
            {es ? 'Esta comida ya no está.' : 'This meal is no longer there.'}
          </TextV2>
        )}
      </View>
    );
  }

  const time = meal.createdAt ? clockLabel(new Date(meal.createdAt)) : '';
  const estimate = meal.source !== 'manual';
  const macro = (label: string, value: number, priority = false) => (
    <View style={styles.macro}>
      <TextV2
        style={styles.macroValue}
        color={priority ? (mode === 'dark' ? '#FF8A5C' : '#C23D0B') : undefined}
      >{`${value} g`}</TextV2>
      <TextV2 variant="meta" tone="secondary">
        {label}
      </TextV2>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <MealPhoto
          uri={photo}
          height={HERO}
          label={es ? 'Ver la foto' : 'See the photo'}
          closeLabel={es ? 'Cerrar' : 'Close'}
        >
          <View style={[styles.heroTop, { paddingTop: insets.top + 8 }]}>
            <PressableScale accessibilityRole="button" accessibilityLabel={es ? 'Volver' : 'Back'} onPress={() => navigation.goBack()} style={styles.round44}>
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={es ? 'Editar' : 'Edit'}
              onPress={() =>
                navigation.navigate(APP_ROUTES.MealReview, { draft: draftFromMeal(meal), source: 'photo', mealId: meal.id })
              }
              style={styles.round44}
            >
              <Pencil size={18} color="#FFFFFF" strokeWidth={2} />
            </PressableScale>
          </View>
          {meal.imagePath ? (
            <View style={styles.chip}>
              <Lock size={13} color="#FFFFFF" strokeWidth={2.2} />
              <TextV2 variant="eyebrow" color="#FFFFFF">
                {es ? 'SOLO TÚ' : 'ONLY YOU'}
              </TextV2>
            </View>
          ) : null}
        </MealPhoto>

        <View style={styles.body}>
          <TextV2 variant="eyebrow" tone="secondary">
            {`${mealTypeLabel(meal.mealType, language).toUpperCase()}${time ? ` · ${time}` : ''}`}
          </TextV2>
          <TextV2 variant="title22" style={styles.title}>
            {meal.title}
          </TextV2>
          <View style={styles.kcalRow}>
            <TextV2 style={styles.kcal}>{formatThousands(meal.kcal)}</TextV2>
            <TextV2 variant="body" tone="secondary">
              {meal.source === 'manual'
                ? es ? 'kcal · kcal rápidas' : 'kcal · quick kcal'
                : estimate
                  ? es ? 'kcal · estimación' : 'kcal · estimate'
                  : 'kcal'}
            </TextV2>
          </View>

          {meal.items.length > 0 ? (
            <View style={[styles.trio, { borderColor: colors.divider }]}>
              {macro(es ? 'Proteína' : 'Protein', meal.protein, true)}
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              {macro(es ? 'Carbohidratos' : 'Carbs', meal.carbs)}
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              {macro(es ? 'Grasas' : 'Fats', meal.fats)}
            </View>
          ) : null}

          {meal.items.length > 0 ? (
            <View style={styles.items}>
              <TextV2 variant="eyebrow" tone="secondary">
                {es ? 'ALIMENTOS' : 'FOODS'}
              </TextV2>
              {meal.items.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.item}>
                  <View style={styles.flex}>
                    <TextV2 variant="bodyStrong" numberOfLines={2}>
                      {item.name}
                    </TextV2>
                    <TextV2 variant="meta" tone="secondary">
                      {unitLine(item, language)}
                    </TextV2>
                    {item.unit ? (
                      <TextV2 variant="meta" tone="tertiary">
                        {perUnitLine(item.unit, language)}
                      </TextV2>
                    ) : null}
                  </View>
                  <TextV2 variant="bodyStrong">{`${formatThousands(item.kcal)} kcal`}</TextV2>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              label={es ? 'Editar' : 'Edit'}
              variant="outline"
              fullWidth
              onPress={() =>
                navigation.navigate(APP_ROUTES.MealReview, { draft: draftFromMeal(meal), source: 'photo', mealId: meal.id })
              }
            />
            <PressableScale accessibilityRole="button" onPress={() => setConfirm(true)} style={styles.delete}>
              <TextV2 variant="bodyStrong" color={mode === 'dark' ? '#FF8A5C' : '#C23D0B'}>
                {es ? 'Borrar' : 'Delete'}
              </TextV2>
            </PressableScale>
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        open={confirm}
        title={es ? '¿Borrar esta comida?' : 'Delete this meal?'}
        text={
          es
            ? `Se quitan ${formatThousands(meal.kcal)} kcal de hoy${meal.imagePath ? ' y se borra la foto' : ''}. No se puede deshacer.`
            : `${formatThousands(meal.kcal)} kcal are removed from today${meal.imagePath ? ' and the photo is deleted' : ''}. This can't be undone.`
        }
        confirmLabel={es ? 'Borrar' : 'Delete'}
        cancelLabel={es ? 'Cancelar' : 'Cancel'}
        onConfirm={remove}
        onCancel={() => setConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  back: { width: 44, height: 44, justifyContent: 'center', marginBottom: 12 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  round44: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14,13,12,.45)', alignItems: 'center', justifyContent: 'center' },
  chip: { position: 'absolute', left: 16, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: 'rgba(14,13,12,.55)' },
  body: { padding: 20, gap: 14 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '600' },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  kcal: { fontSize: 48, lineHeight: 52, fontWeight: '600', letterSpacing: -1.9 },
  trio: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 14 },
  macro: { flex: 1, alignItems: 'center', gap: 2 },
  macroValue: { fontSize: 22, lineHeight: 26, fontWeight: '600' },
  divider: { width: 1, height: 36 },
  items: { gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  actions: { gap: 6, marginTop: 8 },
  delete: { height: 48, alignItems: 'center', justifyContent: 'center' },
});
