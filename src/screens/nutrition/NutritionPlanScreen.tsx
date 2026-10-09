import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import {
  EllieActionButton,
  ArcGauge,
  BackButton,
  Button,
  EllieSurface,
  GlassHeader,
  GlassSurface,
  MacroColumn,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
  WaterTank,
} from '@app/components/v2';
import { ROOT_ROUTES } from '@app/constants/routes';
import { ELLIE_ASKS } from '@app/features/ellie/chatModel';
import { useOpenEllieChat } from '@app/features/ellie/useOpenEllieChat';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  adherenceScore,
  buildDayTotals,
  ellieLine,
  formatThousands,
  kcalLine,
  waterLine,
  type LogTotals,
} from '@app/features/nutrition/nutritionModel';
import { NutritionLogSheet } from '@app/features/nutrition/v2/NutritionLogSheet';
import { goalLabel } from '@app/features/profile/profileModel';
import { useAuth } from '@app/hooks/useAuth';
import { useHydration } from '@app/hooks/useHydration';
import { useNutritionDay } from '@app/hooks/useNutritionDay';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'NutritionPlan'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Nutrición (NUTRI_01 / 02): the 270° indicator of kcal, the three macro
// columns, the water tank and the ELLIE card, with "Registrar comida" fixed
// at the bottom. Without a plan the indicator has no goal and ELLIE creates
// one. The totals come from the shared model (nutritionModel).
export function NutritionPlanScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { profile } = useAuth();
  const openEllieChat = useOpenEllieChat();
  const day = useNutritionDay();
  const { addGlass } = useHydration();
  const dev = __DEV__ ? route.params?.devState : undefined;
  const devSheet = __DEV__ ? route.params?.devSheet : undefined;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [devGlasses, setDevGlasses] = useState(0);
  const consumedOpenLog = useRef(false);

  // The Inicio ring opens the screen with the sheet up.
  useEffect(() => {
    if (route.params?.openLog && !consumedOpenLog.current && !day.isLoading) {
      consumedOpenLog.current = true;
      setSheetOpen(true);
    }
  }, [day.isLoading, route.params?.openLog]);

  // Development: the sheet after the push animation (iOS).
  useEffect(() => {
    if (!devSheet) {
      return;
    }
    const timer = setTimeout(() => {
      setSheetOpen(true);
      setSaving(devSheet === 'logSaving');
      setSaveError(
        devSheet === 'logError'
          ? 'No pudimos guardar tu nutrición. Revisa tu conexión e inténtalo de nuevo.'
          : null,
      );
    }, 900);
    return () => clearTimeout(timer);
  }, [devSheet]);

  const sample = useMemo(() => {
    if (!__DEV__ || !dev || dev === 'loading' || dev === 'error') {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fx = require('@app/dev/nutritionFixtures') as typeof import('@app/dev/nutritionFixtures');
    const hasPlan = dev === 'plan' || dev === 'goalMet';
    const log = dev === 'goalMet' ? fx.FX_LOG_MET : dev === 'empty' ? null : fx.FX_LOG;
    const plan = hasPlan ? fx.FX_PLAN : null;
    return { plan, log, waterMl: dev === 'empty' ? 0 : fx.FX_WATER_ML };
  }, [dev]);

  const totals = useMemo(
    () =>
      sample
        ? buildDayTotals({
            plan: sample.plan,
            log: sample.log,
            waterMl: sample.waterMl + devGlasses * 250,
            goalGlasses: profile?.dailyWaterGoal,
          })
        : day.totals,
    [day.totals, devGlasses, profile?.dailyWaterGoal, sample],
  );
  const plan = sample ? sample.plan : day.plan;
  const todayLog = sample ? sample.log : day.todayLog;

  const loading = dev === 'loading' || (!dev && day.isLoading);
  const failed = dev === 'error' || (!dev && Boolean(day.error));

  const save = async (next: LogTotals) => {
    if (dev) {
      setSheetOpen(false);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await day.saveTodayLog({
        calories: next.calories,
        protein: next.protein,
        carbs: next.carbs,
        fats: next.fats,
        ...(adherenceScore(plan, next) !== null
          ? { adherence: adherenceScore(plan, next) as number }
          : {}),
      });
      setSheetOpen(false);
      toast.show('Comida registrada');
    } catch (error) {
      console.warn('[nutrition] No se pudo registrar:', error);
      setSaveError('No pudimos guardar tu nutrición. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const addWater = () => {
    if (dev) {
      setDevGlasses(count => count + 1);
      return;
    }
    addGlass(() => toast.show('No pudimos sumar el vaso', { tone: 'error' }));
  };

  const subtitle = profile?.goal ? `Hoy · ${goalLabel(profile.goal).toLowerCase()}` : 'Hoy';
  const gaugeLabel = totals.hasPlan ? 'Consumido' : 'Hoy';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Nutrición"
        subtitle={subtitle}
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 8,
          paddingBottom: insets.bottom + 130,
          gap: 30,
        }}
      >
        {failed ? (
          <BlockError
            message="No pudimos cargar tu nutrición."
            onRetry={() => day.refetch().catch(() => {})}
          />
        ) : loading ? (
          <SkeletonGroup>
            <View style={styles.skeleton}>
              <Skeleton width={250} height={200} radius={125} />
              <Skeleton height={120} radius={20} />
              <Skeleton height={190} radius={28} />
            </View>
          </SkeletonGroup>
        ) : (
          <>
            <View style={styles.gauge}>
              <ArcGauge progress={totals.kcal.progress} empty={!totals.hasPlan && totals.kcal.consumed === 0}>
                <TextV2 variant="eyebrow" tone="secondary">
                  {gaugeLabel}
                </TextV2>
                <TextV2 variant="title28" style={styles.kcal}>
                  {formatThousands(totals.kcal.consumed)}
                </TextV2>
                <TextV2 variant="body" tone="secondary">
                  {totals.kcal.target
                    ? `de ${formatThousands(totals.kcal.target)} kcal`
                    : 'kcal consumidas'}
                </TextV2>
              </ArcGauge>
              <TextV2
                variant="bodyL"
                align={totals.hasPlan ? 'center' : 'left'}
                style={[styles.kcalLine, !totals.hasPlan && styles.kcalLineStart]}
              >
                {kcalLine(totals)}
              </TextV2>
              {!totals.hasPlan ? (
                <EllieActionButton
                  label="Crear con ELLIE"
                  onPress={() => openEllieChat(ELLIE_ASKS.nutritionPlan)}
                  style={styles.create}
                />
              ) : null}
            </View>

            {totals.hasPlan ? (
              <View style={styles.macros}>
                {totals.macros.map(macro => (
                  <MacroColumn
                    key={macro.key}
                    label={macro.label}
                    value={macro.value}
                    goal={macro.goal ?? 0}
                    pct={macro.pct}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.water}>
              <View style={styles.waterHead}>
                <TextV2 variant="section">Hidratación</TextV2>
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

            {totals.hasPlan ? (
              <EllieSurface
                eyebrow=""
                message={ellieLine(totals)}
                orbSize={36}
                action={{
                  label: 'Ajustar con ELLIE',
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
        <Button
          label="Registrar comida"
          icon={Plus}
          iconPosition="start"
          disabled={loading || failed}
          onPress={() => {
            setSaveError(null);
            setSheetOpen(true);
          }}
          fullWidth
        />
      </GlassSurface>

      <NutritionLogSheet
        open={sheetOpen}
        onClose={() => !saving && setSheetOpen(false)}
        totals={totals}
        todayLog={todayLog}
        saving={saving}
        error={saveError}
        onSave={save}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  skeleton: { gap: 24, alignItems: 'center' },
  gauge: { alignItems: 'center', gap: 6 },
  kcal: { fontSize: 48, lineHeight: 50, fontWeight: '600', letterSpacing: -1.9 },
  kcalLine: { marginTop: -26 },
  kcalLineStart: { alignSelf: 'stretch' },
  create: { marginTop: 12, alignSelf: 'center' },
  macros: { flexDirection: 'row', gap: 14 },
  water: { gap: 14 },
  waterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12 },
});
