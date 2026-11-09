import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import LinearGradient from 'react-native-linear-gradient';
import { CircleAlert, RefreshCw } from 'lucide-react-native';
import {
  AuraMark,
  Button,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { useTrainingPlanText } from '@app/features/trainingPlan/trainingPlanCopy';
import { AntonText } from '@app/features/trainingPlan/v2/PlanParts';
import { CATEGORY_COVERS } from '@app/features/workouts/workoutAssets';

// States of Semana, Mes and Plan (v2.21 §31.13): loading with AURA turning,
// error with Reintentar, and "Aún no tienes un plan".

export function PlanLoading() {
  const { colors } = useThemeV2();
  const { t } = useTrainingPlanText();
  return (
    <View style={styles.gap14}>
      <SkeletonGroup>
        <View style={styles.gap14}>
          <Skeleton height={14} width="58%" />
          <Skeleton height={46} width="74%" radius={12} />
          <View style={styles.segments}>
            {Array.from({ length: 12 }, (_, index) => (
              <Skeleton key={index} height={6} radius={3} style={styles.segment} />
            ))}
          </View>
          <Skeleton height={180} radius={24} />
        </View>
      </SkeletonGroup>
      <View style={styles.loadingRow}>
        <AuraMark size={22} state="processing" />
        <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
          {t('load.title')}
        </TextV2>
      </View>
    </View>
  );
}

export function PlanError({ onRetry }: { onRetry: () => void }) {
  const { colors, mode } = useThemeV2();
  const { t } = useTrainingPlanText();
  return (
    <View
      style={[
        styles.error,
        { backgroundColor: colors.surface.raised },
        mode === 'dark' ? [styles.errorBorder, { borderColor: colors.border.onDark }] : styles.errorShadow,
      ]}
    >
      <View style={[styles.errorIcon, { backgroundColor: colors.plan.emS }]}>
        <CircleAlert size={22} color={colors.text.primary} strokeWidth={2} />
      </View>
      <TextV2 variant="sub" style={styles.errorTitle}>
        {t('err.title')}
      </TextV2>
      <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
        {t('err.body')}
      </TextV2>
      <Button label={t('err.retry')} icon={RefreshCw} iconPosition="start" size="md" onPress={onRetry} />
    </View>
  );
}

export function PlanEmpty({ onCreate, onWeekOnly }: { onCreate: () => void; onWeekOnly: () => void }) {
  const { colors, layout } = useThemeV2();
  const { t } = useTrainingPlanText();
  const cover = CATEGORY_COVERS.fuerza;
  return (
    <View style={styles.gap16}>
      <View style={[styles.cover, { marginHorizontal: -layout.gutter }]}>
        <Image
          source={cover.image}
          contentFit="cover"
          contentPosition={cover.focus}
          accessibilityIgnoresInvertColors
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(20,19,18,0)', 'rgba(20,19,18,.9)']}
          locations={[0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.coverLabel}>
          <View style={styles.coverDot} />
          <TextV2 color="#FFFFFF" style={styles.coverText}>
            {t('empty.eyebrow')}
          </TextV2>
        </View>
      </View>
      <AntonText size={40}>{t('empty.title')}</AntonText>
      <TextV2 variant="body" color={colors.text.secondary} style={styles.body}>
        {t('empty.body')}
      </TextV2>
      <Button label={t('empty.create')} size="lg" fullWidth onPress={onCreate} />
      <Button label={t('empty.weekOnly')} variant="secondary" size="md" fullWidth onPress={onWeekOnly} />
    </View>
  );
}

const styles = StyleSheet.create({
  gap14: { gap: 14 },
  gap16: { gap: 16 },
  regular: { fontWeight: '400' },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  error: { padding: 20, borderRadius: 24, alignItems: 'flex-start', gap: 12 },
  errorShadow: { boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.05)' },
  errorBorder: { borderWidth: 1 },
  errorIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { fontSize: 19, lineHeight: 24 },
  cover: { height: 200, backgroundColor: '#141312', overflow: 'hidden' },
  coverLabel: { position: 'absolute', left: 20, bottom: 18, flexDirection: 'row', alignItems: 'center', gap: 7 },
  coverDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF5B1F' },
  coverText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  body: { lineHeight: 22 },
});
