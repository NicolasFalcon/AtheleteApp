import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { AuraMark, Skeleton, SkeletonGroup, TextV2, useThemeV2 } from '@app/components/v2';
import { onFeedbackFlushed } from '@app/features/session/feedbackQueue';
import { outcomeLine } from '@app/features/trainingPlan/planSessionModel';
import { useTrainingPlanText } from '@app/features/trainingPlan/trainingPlanCopy';
import { usePlanOutcome } from '@app/features/trainingPlan/usePlanSession';

// Resumen al terminar (31.7) de una sesión del plan: la frase de ELLIE con
// AURA y "Próxima vez" por ejercicio (sube / se mantiene / baja / más
// repeticiones / variante). The feedback of the session can arrive later and
// change the progression, so it is read again each time a feedback replay
// finishes (rating, effort).
export function PlanOutcomeBlock({ workoutSessionId }: { workoutSessionId: string }) {
  const { colors } = useThemeV2();
  const { t } = useTrainingPlanText();
  const query = usePlanOutcome(workoutSessionId, true);
  const { refetch } = query;

  useEffect(
    () =>
      onFeedbackFlushed(() => {
        refetch().catch(() => undefined);
      }),
    [refetch],
  );

  if (query.isLoading) {
    return (
      <SkeletonGroup>
        <View style={styles.block}>
          <Skeleton height={16} width="80%" />
          <Skeleton height={44} width="100%" />
          <Skeleton height={44} width="100%" />
        </View>
      </SkeletonGroup>
    );
  }
  // Without an answer the summary simply has no "Próxima vez" yet.
  const outcome = query.data;
  if (!outcome || (outcome.exercises.length === 0 && !outcome.summary)) {
    return null;
  }

  return (
    <View style={styles.block}>
      {outcome.summary ? (
        <View style={styles.summary}>
          <AuraMark size={24} />
          <TextV2 variant="body" style={styles.flex}>
            {outcome.summary}
          </TextV2>
        </View>
      ) : null}
      {outcome.exercises.length > 0 ? (
        <View>
          <TextV2 variant="eyebrow" color={colors.text.secondary}>
            {t('outcome.title').toUpperCase()}
          </TextV2>
          {outcome.exercises.map((item, index) => {
            const line = outcomeLine(item, t);
            const color =
              line.tone === 'up' ? colors.plan.emT : line.tone === 'down' ? colors.text.primary : colors.text.secondary;
            const Arrow = line.tone === 'up' ? ArrowUp : line.tone === 'down' ? ArrowDown : null;
            return (
              <View
                key={`${item.exerciseId ?? item.name}-${index}`}
                style={[styles.row, { borderBottomColor: colors.divider }]}
              >
                <TextV2 variant="label" numberOfLines={2} style={styles.flex}>
                  {item.name}
                </TextV2>
                <View style={styles.next}>
                  {Arrow ? <Arrow size={14} color={color} strokeWidth={2.4} /> : null}
                  <TextV2 variant="bodyStrong" color={color} align="right" style={styles.nextText}>
                    {line.text}
                  </TextV2>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { gap: 14 },
  summary: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  next: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, maxWidth: '55%' },
  nextText: { flexShrink: 1 },
});
