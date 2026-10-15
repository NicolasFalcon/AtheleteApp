import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock, Repeat, Zap } from 'lucide-react-native';
import {
  ArcGauge,
  BackButton,
  EllieActionButton,
  EllieSurface,
  GlassHeader,
  GlassSurface,
  LivingHalo,
  MacroColumn,
  PressableScale,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
  WaterTank,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { ELLIE_ASKS } from '@app/features/ellie/chatModel';
import { useOpenEllieChat } from '@app/features/ellie/useOpenEllieChat';
import { BlockError } from '@app/features/home/v2/BlockError';
import { groupByMoment } from '@app/features/nutrition/mealCache';
import { mealTypeLabel, toSaveInput } from '@app/features/nutrition/mealDraft';
import { ellieLine, formatThousands, kcalLine, waterLine } from '@app/features/nutrition/nutritionModel';
import { HistoryBars } from '@app/features/nutrition/v2/HistoryBars';
import { MealRow } from '@app/features/nutrition/v2/MealRow';
import { QuickKcalSheet, type QuickKcalResult } from '@app/features/nutrition/v2/QuickKcalSheet';
import { RepeatSheet } from '@app/features/nutrition/v2/RepeatSheet';
import { goalLabel } from '@app/features/profile/profileModel';
import { lowQuotaNotice } from '@app/features/vision/visionCopy';
import { useVisionUsage } from '@app/features/vision/useVisionUsage';
import { useAuth } from '@app/hooks/useAuth';
import { useHydration } from '@app/hooks/useHydration';
import { useMealMutations, useNutritionDayMeals } from '@app/hooks/useMeals';
import { useNutritionDay, useWeekHistory } from '@app/hooks/useNutritionDay';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { Meal } from '@app/services/nutrition/mealsService';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'NutritionPlan'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Nutrición = Calorías con ELLIE (design §23): the 270° counter of kcal against
// the goal (the plan, or an estimate from the profile, said on screen), the
// macros with the protein as the priority, "Registrar con foto" as the one
// primary, Repetir and Añadir a mano as secondary, the meals by moment, the
// water and the last 7 days. The numbers come from get_nutrition_day.
export function NutritionPlanScreen({ navigation }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { profile } = useAuth();
  const language = useProfileLanguage();
  const es = language === 'es';
  const openEllieChat = useOpenEllieChat();
  const { addGlass } = useHydration();
  const meals = useMealMutations();
  const quota = useVisionUsage('meal');

  // null = today.
  const [selected, setSelected] = useState<string | null>(null);
  const today = useNutritionDay();
  const week = useWeekHistory();
  const selectedDay = useNutritionDayMeals(selected);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const totals = today.totals;
  const loading = today.isLoading;
  const failed = Boolean(today.error);
  const shownDay = selected === null ? today.day : selectedDay.data ?? null;
  const groups = useMemo(() => groupByMoment(shownDay?.meals ?? []), [shownDay]);
  const hasAnyMeal = week.some(day => day.kcal > 0);
  const isToday = selected === null;

  const openCamera = () => navigation.navigate(APP_ROUTES.CaloriesCamera, { source: 'nutrition' });
  const openMeal = (meal: Meal) =>
    navigation.navigate(APP_ROUTES.MealDetail, { mealId: meal.id, date: selected });

  const quick = async (result: QuickKcalResult) => {
    setQuickError(null);
    try {
      await meals.save.mutateAsync(
        toSaveInput(
          {
            title: result.title,
            mealType: result.mealType,
            mealTypeFromClock: false,
            items: [],
            manualKcal: result.kcal,
            confidence: null,
            warnings: [],
            imagePath: null,
          },
          { source: 'manual', language },
        ),
      );
      setQuickOpen(false);
      toast.show(es ? 'Comida registrada' : 'Meal logged');
    } catch {
      setQuickError(es ? 'No pudimos guardarla. Inténtalo de nuevo.' : "We couldn't save it. Please try again.");
    }
  };

  const addWater = () => {
    addGlass(() => toast.show(es ? 'No pudimos sumar el vaso' : "We couldn't add the glass", { tone: 'error' }));
  };

  const subtitle = profile?.goal ? `${es ? 'Hoy' : 'Today'} · ${goalLabel(profile.goal).toLowerCase()}` : es ? 'Hoy' : 'Today';

  const counter = totals ? (
    <View style={styles.gauge}>
      <ArcGauge progress={totals.kcal.progress} empty={!totals.hasGoal}>
        <TextV2 variant="eyebrow" tone="secondary">
          {es ? 'CONSUMIDAS' : 'CONSUMED'}
        </TextV2>
        <TextV2 variant="title28" style={styles.kcal}>
          {formatThousands(totals.kcal.consumed)}
        </TextV2>
        <TextV2 variant="body" tone="secondary">
          {totals.kcal.target
            ? es ? `de ${formatThousands(totals.kcal.target)} kcal` : `of ${formatThousands(totals.kcal.target)} kcal`
            : es ? 'kcal consumidas' : 'kcal consumed'}
        </TextV2>
      </ArcGauge>
      <TextV2 variant="bodyL" align={totals.hasGoal ? 'center' : 'left'} style={[styles.kcalLine, !totals.hasGoal && styles.kcalLineStart]}>
        {totals.hasGoal
          ? totals.kcal.left > 0
            ? es ? `Te quedan ${formatThousands(totals.kcal.left)} kcal` : `${formatThousands(totals.kcal.left)} kcal left`
            : es ? 'Objetivo del día cumplido' : "Today's goal is done"
          : kcalLine({ ...totals, hasPlan: false })}
      </TextV2>
      {totals.estimated ? (
        <View style={styles.estimated}>
          <TextV2 variant="meta" tone="secondary" align="center">
            {es ? 'Meta estimada por tu perfil, sin plan activo.' : 'Goal estimated from your profile, no active plan.'}
          </TextV2>
          <EllieActionButton
            label={es ? 'Crear plan con ELLIE' : 'Create a plan with ELLIE'}
            variant="compact"
            onPress={() => openEllieChat(ELLIE_ASKS.nutritionPlan)}
          />
        </View>
      ) : null}
      {!totals.hasGoal ? (
        <EllieActionButton
          label={es ? 'Crear con ELLIE' : 'Create with ELLIE'}
          onPress={() => openEllieChat(ELLIE_ASKS.nutritionPlan)}
          style={styles.create}
        />
      ) : null}
    </View>
  ) : null;

  const macros =
    totals && totals.hasGoal ? (
      <View style={styles.macros}>
        {totals.macros.map(macro => (
          <MacroColumn
            key={macro.key}
            label={macro.label}
            value={macro.value}
            goal={macro.goal ?? 0}
            pct={macro.pct}
            priority={macro.key === 'protein'}
          />
        ))}
      </View>
    ) : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title={es ? 'Nutrición' : 'Nutrition'}
        subtitle={subtitle}
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 8,
          paddingBottom: insets.bottom + 170,
          gap: 28,
        }}
      >
        {failed ? (
          <BlockError
            message={es ? 'No pudimos cargar tu nutrición.' : "We couldn't load your nutrition."}
            onRetry={() => today.refetch().catch(() => {})}
          />
        ) : loading || !totals ? (
          <SkeletonGroup>
            <View style={styles.skeleton}>
              <Skeleton width={250} height={200} radius={125} />
              <Skeleton height={120} radius={20} />
              <Skeleton height={190} radius={28} />
            </View>
          </SkeletonGroup>
        ) : (
          <>
            {counter}
            {macros}

            <View style={styles.secondary}>
              <PressableScale
                accessibilityRole="button"
                onPress={() => setRepeatOpen(true)}
                style={[styles.pill, { backgroundColor: colors.surface.muted }]}
              >
                <Repeat size={18} color={colors.text.primary} strokeWidth={2} />
                <TextV2 variant="bodyStrong">{es ? 'Repetir' : 'Repeat'}</TextV2>
              </PressableScale>
              <PressableScale
                accessibilityRole="button"
                onPress={() => {
                  setQuickError(null);
                  setQuickOpen(true);
                }}
                style={[styles.pill, { backgroundColor: colors.surface.muted }]}
              >
                <Zap size={18} color={colors.text.primary} strokeWidth={2} />
                <TextV2 variant="bodyStrong">{es ? 'Añadir a mano' : 'Add by hand'}</TextV2>
              </PressableScale>
            </View>

            <View style={styles.meals}>
              <TextV2 variant="section">
                {isToday ? (es ? 'Comidas de hoy' : "Today's meals") : es ? 'Comidas del día' : "That day's meals"}
              </TextV2>
              {groups.length === 0 ? (
                hasAnyMeal || !isToday ? (
                  <View style={styles.empty}>
                    <TextV2 variant="bodyStrong">{es ? 'Aún no hay comidas' : 'No meals yet'}</TextV2>
                    <TextV2 variant="body" tone="secondary">
                      {es
                        ? 'Haz una foto del plato o repite algo que ya comiste.'
                        : 'Take a photo of the plate or repeat something you already ate.'}
                    </TextV2>
                  </View>
                ) : (
                  <View style={styles.first}>
                    <View style={styles.firstVoice}>
                      <LivingHalo size={28} state="idle" />
                      <TextV2 variant="body" style={styles.flex}>
                        {es
                          ? 'Hazle una foto al plato y yo calculo las kcal y los macros.'
                          : 'Take a photo of the plate and I work out the kcal and macros.'}
                      </TextV2>
                    </View>
                    {(es
                      ? ['Haz la foto', 'ELLIE estima', 'Confirma o corrige']
                      : ['Take the photo', 'ELLIE estimates', 'Confirm or correct']
                    ).map((label, index) => (
                      <View key={label} style={styles.stepRow}>
                        <View style={[styles.stepNum, { backgroundColor: index === 0 ? colors.ember.base : colors.surface.muted }]}>
                          <TextV2 variant="metaStrong" color={index === 0 ? '#FFFFFF' : colors.text.secondary}>
                            {index + 1}
                          </TextV2>
                        </View>
                        <TextV2 variant="body">{label}</TextV2>
                      </View>
                    ))}
                    <View style={styles.privacy}>
                      <Lock size={14} color={colors.text.secondary} strokeWidth={2} />
                      <TextV2 variant="meta" tone="secondary">
                        {es ? 'Tus fotos son privadas: solo tú las ves.' : 'Your photos are private: only you see them.'}
                      </TextV2>
                    </View>
                  </View>
                )
              ) : (
                groups.map(group => (
                  <View key={group.type} style={styles.group}>
                    <View style={styles.groupHead}>
                      <TextV2 variant="eyebrow" tone="secondary">
                        {mealTypeLabel(group.type, language).toUpperCase()}
                      </TextV2>
                      <TextV2 variant="metaStrong" tone="secondary">{`${formatThousands(group.kcal)} kcal`}</TextV2>
                    </View>
                    {group.meals.map(meal => (
                      <MealRow key={meal.id} meal={meal} language={language} onPress={() => openMeal(meal)} />
                    ))}
                  </View>
                ))
              )}
            </View>

            <View style={styles.water}>
              <View style={styles.waterHead}>
                <TextV2 variant="section">{es ? 'Hidratación' : 'Hydration'}</TextV2>
                <TextV2 variant="meta" tone="secondary">
                  {waterLine(totals)}
                </TextV2>
              </View>
              <WaterTank
                glasses={totals.water.glasses}
                goal={totals.water.goalGlasses}
                progress={totals.water.progress}
                onAdd={addWater}
              />
            </View>

            <HistoryBars
              days={week}
              selected={selected ?? week[week.length - 1].date}
              onSelect={date => setSelected(date === week[week.length - 1].date ? null : date)}
              language={language}
            />

            {totals.hasGoal && !totals.estimated ? (
              <EllieSurface
                eyebrow=""
                message={ellieLine(totals)}
                orbSize={36}
                action={{
                  label: es ? 'Ajustar con ELLIE' : 'Adjust with ELLIE',
                  ai: true,
                  onPress: () => openEllieChat(ELLIE_ASKS.adjustNutrition),
                }}
                style={{ marginHorizontal: -layout.gutter }}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      <GlassSurface
        kind="nav"
        style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12), paddingHorizontal: layout.gutter }]}
      >
        {quota.left !== null ? (
          <TextV2 variant="metaStrong" tone="secondary" align="center" style={styles.quota}>
            {lowQuotaNotice(quota.left, language)}
          </TextV2>
        ) : null}
        <EllieActionButton
          label={es ? 'Registrar con foto' : 'Log with a photo'}
          size="lg"
          fullWidth
          disabled={loading || failed}
          onPress={openCamera}
        />
      </GlassSurface>

      <RepeatSheet
        open={repeatOpen}
        onClose={() => setRepeatOpen(false)}
        onRepeat={meal => meals.repeat.mutateAsync({ meal })}
        language={language}
      />
      <QuickKcalSheet
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onSubmit={result => {
          quick(result).catch(() => undefined);
        }}
        saving={meals.save.isPending}
        error={quickError}
        language={language}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  skeleton: { gap: 24, alignItems: 'center' },
  gauge: { alignItems: 'center', gap: 6 },
  kcal: { fontSize: 48, lineHeight: 50, fontWeight: '600', letterSpacing: -1.9 },
  kcalLine: { marginTop: -26 },
  kcalLineStart: { alignSelf: 'stretch' },
  create: { marginTop: 12, alignSelf: 'center' },
  estimated: { alignItems: 'center', gap: 4, marginTop: 6 },
  macros: { flexDirection: 'row', gap: 12 },
  secondary: { flexDirection: 'row', gap: 12 },
  pill: { flex: 1, height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  meals: { gap: 14 },
  group: { gap: 4 },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  empty: { gap: 4 },
  first: { gap: 14 },
  firstVoice: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  water: { gap: 14 },
  waterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, gap: 8 },
  quota: { height: 16 },
});
