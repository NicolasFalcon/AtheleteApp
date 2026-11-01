import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListChecks, Plus } from 'lucide-react-native';
import {
  AuraMark,
  BackButton,
  EllieActionButton,
  GlassHeader,
  GlassSurface,
  PressableScale,
  Segmented,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { ELLIE_ASKS } from '@app/features/ellie/chatModel';
import { useOpenEllieChat } from '@app/features/ellie/useOpenEllieChat';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  FOOTER_NOTE,
  draftFromEntry,
  draftFromFoods,
  mealTypeToSlot,
  slotForTime,
  slotToMealType,
} from '@app/features/nutrition/nutritionDayModel';
import {
  useMarkSupplement,
  useMealEntryMutations,
  useNutritionToday,
} from '@app/features/nutrition/useNutritionToday';
import { QuickKcalSheet, type QuickKcalResult } from '@app/features/nutrition/v2/QuickKcalSheet';
import { LogMealSheet } from '@app/features/nutrition/v2/today/LogMealSheet';
import { goalLabel } from '@app/features/profile/profileModel';
import {
  HydrationCard,
  MacroTanks,
  MealsHeader,
  MomentSection,
  SupplementsCard,
  TodayRing,
} from '@app/features/nutrition/v2/today/TodayParts';
import { useVisionUsage } from '@app/features/vision/useVisionUsage';
import { VisionFailureSheet } from '@app/features/vision/v2/VisionFailureSheet';
import { visionFailureFrom, type VisionAction, type VisionFailureInput } from '@app/features/vision/visionCopy';
import { useAuth } from '@app/hooks/useAuth';
import { useHydration } from '@app/hooks/useHydration';
import { safeGoBack } from '@app/navigation/safeGoBack';
import {
  NUTRITION_SLOTS,
  parseMealText,
  type MealEntry,
  type NutritionMoment,
  type NutritionSlot,
  type SavedFood,
} from '@app/services/supabase/nutritionDay';
import { VisionError } from '@app/services/vision/visionService';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'NutritionPlan'>;
type Tab = 'today' | 'plan' | 'shopping';

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];
const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'plan', label: 'Plan' },
  { key: 'shopping', label: 'Compras' },
];

// Nutrición v2 (nut-1): Hoy · Plan · Compras. Hoy reads get_nutrition_day
// (the server computes targets, what is left, water and adherence; the app
// only shows them): the ring, the macros, the meals by moment, hydration and
// supplements, with "Registrar comida" fixed at the bottom. Plan and Compras
// arrive with N2.
export function NutritionPlanScreen({ navigation }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { signOut, profile } = useAuth();
  const openEllieChat = useOpenEllieChat();
  const { addGlass } = useHydration();
  const quota = useVisionUsage('meal');
  const today = useNutritionToday();
  const entries = useMealEntryMutations();
  const markSupplement = useMarkSupplement();
  const [tab, setTab] = useState<Tab>('today');
  const [logOpen, setLogOpen] = useState(false);
  const [logSlot, setLogSlot] = useState<NutritionSlot>(() => slotForTime(new Date()));
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSlot, setQuickSlot] = useState<NutritionSlot>('snacks');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [addingFood, setAddingFood] = useState<string | null>(null);
  // Foods added from Recientes / Favoritos while the sheet is open (check).
  const [addedFoods, setAddedFoods] = useState<ReadonlySet<string>>(() => new Set());
  const [failure, setFailure] = useState<VisionFailureInput | null>(null);
  const [plannedSlot, setPlannedSlot] = useState<NutritionSlot | null>(null);

  const day = today.data ?? null;
  const date = today.date;

  // The four moments always, in order (an empty one keeps its "+").
  const moments = useMemo<NutritionMoment[]>(
    () =>
      NUTRITION_SLOTS.map(
        slot =>
          day?.moments.find(moment => moment.slot === slot) ?? {
            slot,
            kcal: 0,
            entries: [],
            planned: null,
            tag: null,
          },
      ),
    [day],
  );

  const openLog = (slot?: NutritionSlot) => {
    setLogSlot(slot ?? slotForTime(new Date()));
    setAddedFoods(new Set());
    setLogOpen(true);
  };

  const describe = async (text: string, slot: NutritionSlot) => {
    setParsing(true);
    try {
      const items = await parseMealText(text);
      if (items.length === 0) {
        toast.show('No encontré alimentos. Prueba a describirlo con más detalle.', { tone: 'error' });
        return;
      }
      setLogOpen(false);
      navigation.navigate(APP_ROUTES.MealReview, {
        draft: draftFromFoods(items, slot, text.length <= 60 ? text : ''),
        source: 'text',
      });
    } catch (error) {
      if (error instanceof VisionError && error.usage) {
        quota.record(error.usage);
      }
      setLogOpen(false);
      setFailure(visionFailureFrom(error));
    } finally {
      setParsing(false);
    }
  };

  // The sheet stays open: the "+" turns into a check.
  const addFood = (food: SavedFood, key: string, slot: NutritionSlot) => {
    setAddingFood(key);
    entries.log.mutate(
      {
        date,
        slot,
        items: [{ name: food.name, grams: food.grams, kcal: food.kcal, p: food.p, c: food.c, g: food.g }],
        source: 'reciente',
      },
      {
        onSuccess: () => setAddedFoods(current => new Set(current).add(key)),
        onError: () => toast.show('No pudimos registrarla. Inténtalo de nuevo.', { tone: 'error' }),
        onSettled: () => setAddingFood(null),
      },
    );
  };

  const quick = (result: QuickKcalResult) => {
    setQuickError(null);
    entries.log.mutate(
      {
        date,
        slot: mealTypeToSlot(result.mealType),
        items: [{ name: result.title.trim() || 'Kcal rápidas', grams: null, kcal: result.kcal, p: 0, c: 0, g: 0 }],
        source: 'kcal_rapidas',
      },
      {
        onSuccess: () => {
          setQuickOpen(false);
          toast.show('Comida registrada');
        },
        onError: () => setQuickError('No pudimos guardarla. Inténtalo de nuevo.'),
      },
    );
  };

  const editEntry = (entry: MealEntry, slot: NutritionSlot) =>
    navigation.navigate(APP_ROUTES.MealReview, {
      draft: draftFromEntry(entry, slot),
      source: 'text',
      entry: { id: entry.id, date },
    });

  const deleteEntry = (entry: MealEntry) =>
    Alert.alert('¿Eliminar comida?', entry.name, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () =>
          entries.remove.mutate(
            { entryId: entry.id, date },
            { onError: () => toast.show('No pudimos eliminarla. Inténtalo de nuevo.', { tone: 'error' }) },
          ),
      },
    ]);

  const logPlanned = (slot: NutritionSlot) => {
    setPlannedSlot(slot);
    entries.logPlanned.mutate(
      { date, slot },
      {
        onSuccess: () => toast.show('Registrada desde tu plan'),
        onError: () => toast.show('No pudimos registrarla. Inténtalo de nuevo.', { tone: 'error' }),
        onSettled: () => setPlannedSlot(null),
      },
    );
  };

  const addWater = () => {
    addGlass(
      () => toast.show('No pudimos sumar el vaso', { tone: 'error' }),
      day ? { glasses: day.water.glasses, goal: day.water.target || null } : undefined,
    );
  };

  const onFailureAction = (action: VisionAction) => {
    setFailure(null);
    if (action === 'quick_kcal') {
      setQuickSlot(logSlot);
      setQuickOpen(true);
    } else if (action === 'retry') {
      openLog(logSlot);
    } else if (action === 'other_photo') {
      navigation.navigate(APP_ROUTES.CaloriesCamera, { source: 'nutrition', slot: logSlot });
    } else if (action === 'login') {
      signOut().catch(() => undefined);
    }
  };

  const todayBody = today.isError ? (
    <BlockError message="No pudimos cargar tu nutrición." onRetry={() => today.refetch().catch(() => undefined)} />
  ) : !day ? (
    <SkeletonGroup>
      <View style={styles.skeleton}>
        <Skeleton height={150} radius={24} />
        <Skeleton height={70} radius={16} />
        <Skeleton height={220} radius={24} />
      </View>
    </SkeletonGroup>
  ) : (
    <>
      <TodayRing day={day} onCreatePlan={() => createPlan()} />
      <MacroTanks day={day} />
      <View style={styles.meals}>
        <MealsHeader day={day} />
        {moments.map(moment => (
          <MomentSection
            key={moment.slot}
            moment={moment}
            planActive={day.plan.active}
            loggingPlanned={plannedSlot === moment.slot}
            onAdd={() => openLog(moment.slot)}
            onEdit={entry => editEntry(entry, moment.slot)}
            onDelete={deleteEntry}
            onLogPlanned={() => logPlanned(moment.slot)}
          />
        ))}
      </View>
      <HydrationCard water={day.water} onAdd={addWater} />
      <SupplementsCard
        supplements={day.supplements}
        onToggle={(supplementId, moment, taken) =>
          markSupplement.mutate(
            { supplementId, date, moment, taken },
            { onError: () => toast.show('No pudimos marcarlo. Inténtalo de nuevo.', { tone: 'error' }) },
          )
        }
        onManage={() => navigation.navigate(APP_ROUTES.Supplements)}
      />
      <TextV2 variant="meta" tone="tertiary" align="center" style={styles.footerNote}>
        {FOOTER_NOTE}
      </TextV2>
    </>
  );

  const createPlan = () => openEllieChat(ELLIE_ASKS.nutritionPlan);

  // Plan without an active plan (the plan itself arrives with N2).
  const planEmpty = (
    <View style={styles.empty}>
      <AuraMark size={56} />
      <TextV2 variant="title28">Un plan que sigue a tu entreno</TextV2>
      <TextV2 variant="bodyL" tone="secondary">
        ELLIE arma tu semana de comidas a partir de tu objetivo y de los días que entrenas.
      </TextV2>
      <View style={styles.steps}>
        {[
          'Kcal y macros para cada día, con más energía los días que entrenas.',
          'Comidas por momento, cada una con alternativas equivalentes.',
          'La lista de la compra de la semana, lista para copiar.',
        ].map((line, index) => (
          <View key={line} style={[styles.step, { borderTopColor: colors.divider }]}>
            <TextV2 variant="bodyL" tone={index === 0 ? 'ember' : 'primary'} style={styles.stepNum}>
              {String(index + 1)}
            </TextV2>
            <TextV2 variant="bodyL" style={styles.flex}>
              {line}
            </TextV2>
          </View>
        ))}
      </View>
      <EllieActionButton label="Crear plan con ELLIE" size="lg" fullWidth onPress={createPlan} />
    </View>
  );

  // Compras without a plan.
  const shoppingEmpty = (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface.muted }]}>
        <ListChecks size={26} color={colors.text.primary} strokeWidth={2} />
      </View>
      <TextV2 variant="title28">Tu lista sale de tu plan</TextV2>
      <TextV2 variant="bodyL" tone="secondary">
        Crea un plan con ELLIE y te preparamos la compra de la semana, agrupada por categoría y con cantidades.
      </TextV2>
      <EllieActionButton label="Crear plan con ELLIE" variant="compact" onPress={createPlan} />
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Nutrición"
        subtitle={profile?.goal ? `Hoy · ${goalLabel(profile.goal).toLowerCase()}` : 'Hoy'}
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 8,
          paddingBottom: insets.bottom + (tab === 'shopping' ? 40 : 120),
          gap: 28,
        }}
      >
        <Segmented options={TABS} value={tab} onChange={setTab} />
        {tab === 'today' ? todayBody : tab === 'plan' ? planEmpty : shoppingEmpty}
      </ScrollView>

      {tab !== 'shopping' ? (
        <GlassSurface
          kind="nav"
          style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12), paddingHorizontal: layout.gutter }]}
        >
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ disabled: !day }}
            disabled={!day}
            onPress={() => openLog()}
            style={[styles.logBtn, { backgroundColor: colors.ember.base }, !day && styles.off]}
          >
            <Plus size={22} color="#FFFFFF" strokeWidth={2.4} />
            <TextV2 variant="cta" color="#FFFFFF">
              Registrar comida
            </TextV2>
          </PressableScale>
        </GlassSurface>
      ) : null}

      <LogMealSheet
        open={logOpen}
        initialSlot={logSlot}
        photoLeft={quota.left}
        parsing={parsing}
        addingFood={addingFood}
        addedFoods={addedFoods}
        onClose={() => setLogOpen(false)}
        onDescribe={(text, slot) => {
          setLogSlot(slot);
          describe(text, slot).catch(() => undefined);
        }}
        onPhoto={slot => {
          setLogOpen(false);
          navigation.navigate(APP_ROUTES.CaloriesCamera, { source: 'nutrition', slot });
        }}
        onQuickKcal={slot => {
          setLogOpen(false);
          setQuickSlot(slot);
          setQuickError(null);
          setQuickOpen(true);
        }}
        onAddFood={addFood}
      />
      <QuickKcalSheet
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onSubmit={quick}
        saving={entries.log.isPending}
        error={quickError}
        initialMealType={slotToMealType(quickSlot)}
      />
      <VisionFailureSheet
        failure={failure}
        context="meal"
        language="es"
        onAction={onFailureAction}
        onClose={() => setFailure(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  skeleton: { gap: 18 },
  meals: { gap: 18 },
  footerNote: { marginTop: 4 },
  flex: { flex: 1 },
  off: { opacity: 0.5 },
  empty: { gap: 14, paddingTop: 28, alignItems: 'flex-start' },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  steps: { alignSelf: 'stretch', marginVertical: 8 },
  step: { flexDirection: 'row', gap: 20, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth },
  stepNum: { width: 16, fontWeight: '600' },
  logBtn: { height: 60, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12 },
});
