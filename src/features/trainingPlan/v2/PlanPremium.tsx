import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { Lock } from 'lucide-react-native';
import { Button, PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { withAlpha } from '@app/components/v2/GlassSurface';
import { useTrainingPlanText } from '@app/features/trainingPlan/trainingPlanCopy';
import { AntonText } from '@app/features/trainingPlan/v2/PlanParts';
import { useTryPremium } from '@app/features/trainingPlan/v2/PremiumSheet';

// Versión gratis (handoff v2.21 §31.12), designed but off (FEATURES.
// trainingPlanPaywall = false and entitlement.multi_week true): the locked
// view of Mes and Plan (the Premium sheet of "Crear plan" is PremiumSheet).

const SCENE = '#141312';
const ON_SCENE = '#FFFFFF';
const ON_SCENE_BODY = '#D8D6D1';
const EYEBROW_EMBER = '#FF8A5C';
const EMBER = '#FF5B1F';
const BLUE = '#6E8FB3';
const GRID_COLUMNS = 7;
const GRID_ROWS = 5;

// Mes / Plan behind the lock: a blurred grid of weeks with the dark card on
// top ("Premium · Tu mes completo" / "Tu plan de 1 a 3 meses"), the pitch,
// "Probar Premium" and "Volver a Semana".
export function PlanLockedView({
  kind,
  onBackToWeek,
}: {
  kind: 'month' | 'plan';
  onBackToWeek: () => void;
}) {
  const { colors, mode } = useThemeV2();
  const { t } = useTrainingPlanText();
  const tryPremium = useTryPremium();
  const cells = Array.from({ length: GRID_COLUMNS * GRID_ROWS }, (_, index) => {
    const column = index % GRID_COLUMNS;
    const row = Math.floor(index / GRID_COLUMNS);
    if (![0, 1, 3, 5].includes(column)) {
      return 'transparent';
    }
    return row === 3 ? BLUE : EMBER;
  });
  return (
    <View style={styles.wrap}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.grid}
      >
        {cells.map((fill, index) => (
          <View key={index} style={styles.cellBox}>
            <View style={[styles.cell, { backgroundColor: fill === 'transparent' ? colors.surface.muted : fill }]} />
          </View>
        ))}
        {Platform.OS === 'ios' ? (
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType={mode === 'dark' ? 'dark' : 'light'}
            blurAmount={14}
            reducedTransparencyFallbackColor={colors.bg}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(colors.glass.nav, 0.88) }]} />
        )}
      </View>
      <View style={styles.card}>
        <View style={styles.eyebrowRow}>
          <Lock size={13} color={ON_SCENE} strokeWidth={2} style={styles.eyebrowIcon} />
          <TextV2 color={EYEBROW_EMBER} style={styles.eyebrow}>
            {t('lock.eyebrow')}
          </TextV2>
        </View>
        <AntonText size={34} color={ON_SCENE}>
          {t(kind === 'month' ? 'lock.month' : 'lock.plan')}
        </AntonText>
        <TextV2 variant="body" color={ON_SCENE_BODY}>
          {t('lock.body')}
        </TextV2>
        <Button label={t('lock.try')} variant="commit" onPress={tryPremium} />
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('lock.backToWeek')}
          onPress={onBackToWeek}
          style={styles.ghost}
        >
          <TextV2 variant="bodyStrong" color={ON_SCENE} align="center">
            {t('lock.backToWeek')}
          </TextV2>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minHeight: 340 },
  grid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
    borderRadius: 24,
  },
  cellBox: { width: `${100 / GRID_COLUMNS}%`, padding: 3 },
  cell: { height: 40, borderRadius: 10 },
  card: {
    marginTop: 34,
    padding: 22,
    borderRadius: 26,
    backgroundColor: SCENE,
    gap: 12,
    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrowIcon: { opacity: 0.8 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  ghost: {
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
