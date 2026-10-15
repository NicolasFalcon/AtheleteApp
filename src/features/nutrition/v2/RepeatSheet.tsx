import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';
import {
  PressableScale,
  Sheet,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { MealThumb } from '@app/features/nutrition/v2/MealRow';
import { formatThousands } from '@app/features/nutrition/nutritionModel';
import { useNutritionDayMeals, useRecentMeals } from '@app/hooks/useMeals';
import { getLocalDateKey } from '@app/lib/date';
import type { Meal } from '@app/services/nutrition/mealsService';

const yesterdayKey = () => getLocalDateKey(new Date(Date.now() - 86_400_000));

// Repetir (design §23.3): "Lo mismo que ayer" (add them all) and "Frecuentes"
// (the recent meals, one per title). One tap, no confirmation: the + turns
// into a check.
export function RepeatSheet({
  open,
  onClose,
  onRepeat,
  language = 'es',
}: {
  open: boolean;
  onClose: () => void;
  // Resolves when the server has the copy; rejects to show the failure.
  onRepeat: (meal: Meal) => Promise<unknown>;
  language?: EllieLanguage;
}) {
  const { colors } = useThemeV2();
  const es = language === 'es';
  const yesterday = useNutritionDayMeals(open ? yesterdayKey() : null);
  const recent = useRecentMeals(open);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);

  const yesterdayMeals = useMemo(
    () => (open && yesterday.data ? yesterday.data.meals : []),
    [open, yesterday.data],
  );
  const yesterdayKcal = yesterdayMeals.reduce((sum, meal) => sum + meal.kcal, 0);
  const frequent = recent.data ?? [];

  const add = async (meal: Meal) => {
    setFailed(false);
    setAdded(current => new Set(current).add(meal.id));
    try {
      await onRepeat(meal);
    } catch {
      setAdded(current => {
        const next = new Set(current);
        next.delete(meal.id);
        return next;
      });
      setFailed(true);
    }
  };

  const addAll = async () => {
    for (const meal of yesterdayMeals) {
      if (!added.has(meal.id)) {
        // Sequential: the day is edited meal by meal.
        // eslint-disable-next-line no-await-in-loop
        await add(meal);
      }
    }
  };

  const row = (meal: Meal, caption: string) => {
    const done = added.has(meal.id);
    return (
      <View key={meal.id} style={styles.row}>
        <MealThumb path={meal.imagePath} quick={meal.source === 'manual'} />
        <View style={styles.text}>
          <TextV2 variant="bodyStrong" numberOfLines={1}>
            {meal.title}
          </TextV2>
          <TextV2 variant="meta" tone="secondary" numberOfLines={1}>
            {caption}
          </TextV2>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={es ? `Añadir ${meal.title}` : `Add ${meal.title}`}
          accessibilityState={{ selected: done }}
          disabled={done}
          onPress={() => {
            add(meal).catch(() => undefined);
          }}
          style={[styles.add, { backgroundColor: done ? colors.ember.base : colors.surface.muted }]}
        >
          {done ? (
            <Check size={20} color="#FFFFFF" strokeWidth={2.6} />
          ) : (
            <Plus size={20} color={colors.text.primary} strokeWidth={2.2} />
          )}
        </PressableScale>
      </View>
    );
  };

  const loading = yesterday.isLoading || recent.isLoading;
  const empty = !loading && yesterdayMeals.length === 0 && frequent.length === 0;

  return (
    <Sheet open={open} onClose={onClose} title={es ? 'Repetir' : 'Repeat'} scrollable>
      <View style={styles.body}>
        {loading ? (
          <SkeletonGroup>
            <View style={styles.skeleton}>
              <Skeleton height={56} radius={14} />
              <Skeleton height={56} radius={14} />
            </View>
          </SkeletonGroup>
        ) : empty ? (
          <TextV2 variant="body" tone="secondary">
            {es
              ? 'Todavía no hay comidas para repetir. Registra una y la tendrás aquí.'
              : 'There are no meals to repeat yet. Log one and it will be here.'}
          </TextV2>
        ) : (
          <>
            {yesterdayMeals.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <TextV2 variant="eyebrow" tone="secondary">
                    {es ? 'LO MISMO QUE AYER' : 'SAME AS YESTERDAY'}
                  </TextV2>
                  <PressableScale
                    accessibilityRole="button"
                    onPress={() => {
                      addAll().catch(() => undefined);
                    }}
                  >
                    <TextV2 variant="metaStrong" color={colors.ember.deep}>
                      {es
                        ? `Añadir las ${yesterdayMeals.length} · ${formatThousands(yesterdayKcal)} kcal`
                        : `Add all ${yesterdayMeals.length} · ${formatThousands(yesterdayKcal)} kcal`}
                    </TextV2>
                  </PressableScale>
                </View>
                {yesterdayMeals.map(meal => row(meal, `${formatThousands(meal.kcal)} kcal`))}
              </View>
            ) : null}
            {frequent.length > 0 ? (
              <View style={styles.section}>
                <TextV2 variant="eyebrow" tone="secondary">
                  {es ? 'FRECUENTES' : 'FREQUENT'}
                </TextV2>
                {frequent.map(meal => row(meal, `${formatThousands(meal.kcal)} kcal`))}
              </View>
            ) : null}
          </>
        )}
        {failed ? (
          <TextV2 variant="meta" color={colors.ember.deep}>
            {es ? 'No pudimos añadirla. Inténtalo de nuevo.' : "We couldn't add it. Please try again."}
          </TextV2>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 20 },
  skeleton: { gap: 12 },
  section: { gap: 6 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 },
  text: { flex: 1, gap: 2 },
  add: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
