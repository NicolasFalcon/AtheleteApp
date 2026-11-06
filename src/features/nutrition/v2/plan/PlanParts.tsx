import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, Info, Repeat2 } from 'lucide-react-native';
import { PressableScale, TextV2, haptics, useThemeV2 } from '@app/components/v2';
import {
  DAY_LETTERS,
  formatKcal,
  formatQty,
  macroLine,
  slotLabel,
} from '@app/features/ellie/nutritionProposalModel';
import type { NutritionPlanT } from '@app/features/nutrition/nutritionPlanCopy';
import type { ActivePlan, ActivePlanDay, ActivePlanMeal, ShoppingItem } from '@app/services/supabase/nutritionPlan';

// "Tus objetivos cambiaron" (targets_outdated of get_nutrition_plan /
// get_nutrition_day): a quiet row, not an alert, with the way out: ELLIE
// asked for a new plan. Shown in Hoy and in Plan.
// `text` replaces the default copy (a failed swap of an old plan).
export function TargetsOutdatedNotice({
  t,
  onNewPlan,
  text,
}: {
  t: NutritionPlanT;
  onNewPlan: () => void;
  text?: string;
}) {
  const { colors } = useThemeV2();
  return (
    <View style={[styles.notice, { backgroundColor: colors.surface.muted }]}>
      <Info size={18} color={colors.text.secondary} strokeWidth={2} />
      <View style={styles.noticeBody}>
        <TextV2 variant="meta" tone="secondary">
          {text ?? t('outdated.text')}
        </TextV2>
        <PressableScale
          accessibilityRole="button"
          onPress={() => {
            haptics.light();
            onNewPlan();
          }}
          style={styles.noticeCta}
        >
          <TextV2 variant="metaStrong">{t('outdated.cta')}</TextV2>
        </PressableScale>
      </View>
    </View>
  );
}

// Nutrición · Plan: the goals of the plan, the 7 days by their date (today
// selected), and each meal with its ingredients, "Registrada" when it was
// logged and "Cambiar" with its equivalents (swap_plan_meal, that day only).
export function PlanTab({
  plan,
  today,
  t,
  swapping,
  onSwap,
  onNewPlan,
  swapNotice,
}: {
  onNewPlan: () => void;
  // A failed swap that needs "Crear plan nuevo": shown under that meal.
  swapNotice: { key: string; text: string } | null;
  plan: ActivePlan;
  today: string;
  t: NutritionPlanT;
  swapping: string | null;
  onSwap: (day: ActivePlanDay, meal: ActivePlanMeal, equivalentIndex: number) => void;
}) {
  const { colors } = useThemeV2();
  const initial = plan.days.find(day => day.date === today)?.date ?? plan.days[0]?.date ?? null;
  const [selected, setSelected] = useState<string | null>(initial);
  const [open, setOpen] = useState<string | null>(null);
  const day = plan.days.find(item => item.date === selected) ?? plan.days[0];
  // Figures of the selected day (days[].targets, days[].kcal as fallback):
  // the same numbers Hoy shows for that date. plan.targets is not shown.
  const targets = day?.targets ?? null;

  return (
    <View style={styles.gap20}>
      <View style={styles.headRow}>
        <TextV2 variant="title24">{t('plan.title')}</TextV2>
        {plan.plan.status === 'active' ? (
          <View style={[styles.status, { backgroundColor: colors.surface.muted }]}>
            <TextV2 variant="metaStrong">{t('plan.status.active')}</TextV2>
          </View>
        ) : null}
      </View>

      {plan.targetsOutdated ? <TargetsOutdatedNotice t={t} onNewPlan={onNewPlan} /> : null}

      {plan.recalibration?.text ? (
        <View style={[styles.card, { backgroundColor: colors.surface.muted }]}>
          <TextV2 variant="eyebrow" tone="secondary">
            {t('plan.recalibration')}
          </TextV2>
          <TextV2 variant="body">{plan.recalibration.text}</TextV2>
        </View>
      ) : null}

      <View style={styles.days} accessibilityRole="tablist">
        {plan.days.map(item => {
          const on = item.date === day?.date;
          return (
            <PressableScale
              key={item.date}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                haptics.selection();
                setSelected(item.date);
                setOpen(null);
              }}
              style={[
                styles.dayPill,
                { backgroundColor: on ? colors.cta.primary : colors.surface.muted },
                item.date === today && !on ? { boxShadow: `inset 0 0 0 1.5px ${colors.text.primary}` } : null,
              ]}
            >
              <TextV2 variant="caption" color={on ? colors.cta.primaryText : colors.text.secondary}>
                {DAY_LETTERS[item.weekday - 1]}
              </TextV2>
              <TextV2 variant="bodyStrong" color={on ? colors.cta.primaryText : colors.text.primary}>
                {String(Number(item.date.slice(8, 10)))}
              </TextV2>
              <View
                style={[styles.dayDot, item.type === 'train' ? { backgroundColor: colors.ember.base } : null]}
              />
            </PressableScale>
          );
        })}
      </View>

      {day ? (
        <View style={styles.gap12}>
          <View style={styles.gap6}>
            <View style={styles.headRow}>
              <TextV2 variant="eyebrow" tone="secondary">
                {day.type === 'train' ? t('plan.dayTrain') : t('plan.dayRest')}
              </TextV2>
              {targets && targets.kcal > 0 ? (
                <TextV2 variant="metaStrong" tone="secondary">
                  {t('plan.dayKcal', { kcal: formatKcal(targets.kcal) })}
                </TextV2>
              ) : null}
            </View>
            {targets && targets.protein !== null && targets.carbs !== null && targets.fat !== null ? (
              <TextV2 variant="meta" tone="secondary">
                {t('plan.goals', {
                  kcal: formatKcal(targets.kcal),
                  p: Math.round(targets.protein),
                  c: Math.round(targets.carbs),
                  g: Math.round(targets.fat),
                })}
              </TextV2>
            ) : null}
          </View>
          {day.meals.length === 0 ? (
            <TextV2 variant="body" tone="secondary">
              {t('plan.noMeals')}
            </TextV2>
          ) : (
            day.meals.map(meal => {
              const key = `${day.date}:${meal.slot}`;
              return (
                <View key={key} style={styles.gap8}>
                  <PlanMealCard
                    meal={meal}
                    t={t}
                    expanded={open === key}
                    busy={swapping === key}
                    canSwap={day.date >= today && !meal.logged}
                    onToggle={() => setOpen(open === key ? null : key)}
                    onChoose={index => {
                      setOpen(null);
                      onSwap(day, meal, index);
                    }}
                  />
                  {swapNotice?.key === key ? (
                    <TargetsOutdatedNotice t={t} onNewPlan={onNewPlan} text={swapNotice.text} />
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}

function PlanMealCard({
  meal,
  t,
  expanded,
  busy,
  canSwap,
  onToggle,
  onChoose,
}: {
  meal: ActivePlanMeal;
  t: NutritionPlanT;
  expanded: boolean;
  busy: boolean;
  canSwap: boolean;
  onToggle: () => void;
  onChoose: (index: number) => void;
}) {
  const { colors } = useThemeV2();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface.raised }, busy ? styles.busy : null]}>
      <View style={styles.headRow}>
        <TextV2 variant="metaStrong" tone="secondary">
          {`${slotLabel(meal.slot)}${meal.time ? ` · ${meal.time}` : ''}`}
        </TextV2>
        {meal.logged ? (
          <View style={styles.logged}>
            <Check size={14} color={colors.ember.base} strokeWidth={2.6} />
            <TextV2 variant="metaStrong" tone="ember">
              {t('plan.logged')}
            </TextV2>
          </View>
        ) : (
          <TextV2 variant="label">{`${formatKcal(meal.kcal)} kcal`}</TextV2>
        )}
      </View>
      <TextV2 variant="bodyStrong">{meal.name}</TextV2>
      <TextV2 variant="meta" tone="secondary">
        {meal.logged ? `${formatKcal(meal.kcal)} kcal · ${macroLine(meal)}` : macroLine(meal)}
      </TextV2>
      {meal.ingredients.length > 0 ? (
        <View style={[styles.ingredients, { borderTopColor: colors.divider }]}>
          {meal.ingredients.map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.kv}>
              <TextV2 variant="body" style={styles.shrink}>
                {item.name}
              </TextV2>
              <TextV2 variant="body" tone="secondary">
                {formatQty(item)}
              </TextV2>
            </View>
          ))}
        </View>
      ) : null}
      {canSwap && meal.equivalents.length > 0 ? (
        <>
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ expanded, busy }}
            disabled={busy}
            onPress={onToggle}
            style={[styles.change, { backgroundColor: colors.surface.muted }]}
          >
            <Repeat2 size={16} color={colors.text.primary} strokeWidth={2} />
            <TextV2 variant="metaStrong">{t('plan.change')}</TextV2>
          </PressableScale>
          {expanded ? (
            <View style={styles.gap8}>
              <TextV2 variant="caption" tone="secondary">
                {t('plan.equivalents')}
              </TextV2>
              {meal.equivalents.map((equivalent, index) => (
                <PressableScale
                  key={`${equivalent.name}-${index}`}
                  accessibilityRole="button"
                  onPress={() => onChoose(index)}
                  style={[styles.equivalent, { boxShadow: `inset 0 0 0 1px ${colors.outline.strong}` }]}
                >
                  <TextV2 variant="label" numberOfLines={2} style={styles.shrink}>
                    {equivalent.name}
                  </TextV2>
                  <TextV2 variant="caption" tone="secondary">
                    {`${formatKcal(equivalent.kcal)} kcal · P ${Math.round(equivalent.p)} g`}
                  </TextV2>
                </PressableScale>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

// Nutrición · Compras: get_nutrition_plan · shopping. Grouped by category
// when the items bring one; otherwise one list ordered by name.
export function ShoppingTab({ items, t }: { items: ShoppingItem[]; t: NutritionPlanT }) {
  const { colors } = useThemeV2();
  const groups = useMemo(() => {
    const byName = (a: ShoppingItem, b: ShoppingItem) => a.name.localeCompare(b.name, 'es');
    if (!items.some(item => item.category)) {
      return [{ title: null as string | null, items: [...items].sort(byName) }];
    }
    const map = new Map<string, ShoppingItem[]>();
    items.forEach(item => {
      const key = item.category ?? t('shopping.other');
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'es'))
      .map(([title, rows]) => ({ title: title as string | null, items: rows.sort(byName) }));
  }, [items, t]);

  return (
    <View style={styles.gap20}>
      <View style={styles.headRow}>
        <TextV2 variant="title24">{t('shopping.title')}</TextV2>
        <TextV2 variant="meta" tone="secondary">
          {items.length === 1 ? t('shopping.count.one') : t('shopping.count.other', { n: items.length })}
        </TextV2>
      </View>
      {items.length === 0 ? (
        <TextV2 variant="body" tone="secondary">
          {t('shopping.empty')}
        </TextV2>
      ) : (
        groups.map(group => (
          <View key={group.title ?? 'all'} style={styles.gap6}>
            {group.title ? (
              <TextV2 variant="eyebrow" tone="secondary">
                {group.title}
              </TextV2>
            ) : null}
            {group.items.map((item, index) => (
              <View
                key={`${item.name}-${index}`}
                style={[styles.kv, styles.shopRow, { borderBottomColor: colors.divider }]}
              >
                <TextV2 variant="body" style={styles.shrink}>
                  {item.name}
                </TextV2>
                <TextV2 variant="body" tone="secondary">
                  {formatQty(item)}
                </TextV2>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gap6: { gap: 6 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 16 },
  noticeBody: { flex: 1, gap: 6 },
  noticeCta: { alignSelf: 'flex-start', paddingVertical: 2 },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap20: { gap: 20 },
  shrink: { flexShrink: 1 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  status: { height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center' },
  card: { borderRadius: 20, padding: 16, gap: 6 },
  busy: { opacity: 0.5 },
  days: { flexDirection: 'row', gap: 6 },
  dayPill: { flex: 1, height: 70, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  logged: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ingredients: { marginTop: 6, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  change: {
    alignSelf: 'flex-start',
    marginTop: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  equivalent: { borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  shopRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
