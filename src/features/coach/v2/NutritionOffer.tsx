import { StyleSheet, View } from 'react-native';
import { Button, PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { useCoachText } from '@app/features/coach/coachCopy';
import { formatKcal } from '@app/features/coach/coachModel';
import {
  CoachAvatar,
  EMBER_TINT,
  SCENE,
  SCENE_RAISED,
  antonStyle,
} from '@app/features/coach/v2/CoachParts';
import type { CoachNutritionAssignment } from '@app/services/coach/coachService';

// Nutrición · pending targets of the coach (§30.4): a dark scene with
// "{coach} · tu coach", the kcal in Anton, the three macros, the coach's
// note in quotes, "Ahora no" and "Aceptar" (Ember).
export function CoachNutritionOffer({
  coachName,
  coachAvatar,
  assignment,
  busy,
  onAccept,
  onLater,
}: {
  coachName: string;
  coachAvatar: string | null;
  assignment: CoachNutritionAssignment;
  busy: 'accept' | 'later' | null;
  onAccept: () => void;
  onLater: () => void;
}) {
  const { fonts, colors } = useThemeV2();
  const { t, language } = useCoachText();
  const targets = assignment.train;
  return (
    <View style={[styles.card, { backgroundColor: SCENE }]}>
      <View style={styles.head}>
        <CoachAvatar name={coachName} avatar={coachAvatar} size={52} ring dark />
        <View style={styles.flex}>
          <TextV2 variant="eyebrow" color={colors.ember.textOnDark}>
            {t('coach.offer.eyebrow', { name: coachName })}
          </TextV2>
          <TextV2 variant="title22" color="#FFFFFF">
            {t('coach.offer.title')}
          </TextV2>
        </View>
      </View>
      <View style={styles.figures}>
        <View>
          <TextV2 color="#FFFFFF" style={antonStyle(fonts.display, 56)}>
            {formatKcal(language, targets.kcal)}
          </TextV2>
          <TextV2 variant="body" color="#A8A6A1">
            {assignment.mode === 'train_rest' ? t('coach.dayType.train') : t('coach.kcalDay')}
          </TextV2>
        </View>
        <View style={styles.macros}>
          {(
            [
              ['protein', 'coach.macro.protein'],
              ['carbs', 'coach.macro.carbsShort'],
              ['fat', 'coach.macro.fat'],
            ] as const
          ).map(([key, label]) => (
            <View key={key}>
              <TextV2 variant="sub" color="#FFFFFF">
                {`${Math.round(targets[key])} g`}
              </TextV2>
              <TextV2 variant="meta" color="#A8A6A1">
                {t(label)}
              </TextV2>
            </View>
          ))}
        </View>
      </View>
      {assignment.mode === 'train_rest' ? (
        <TextV2 variant="body" color="#D8D6D1">
          {`${t('coach.dayType.rest')} · ${formatKcal(language, assignment.rest.kcal)} kcal`}
        </TextV2>
      ) : null}
      {assignment.note ? (
        <TextV2 variant="bodyL" color="#D8D6D1">
          {`“${assignment.note}”`}
        </TextV2>
      ) : null}
      <View style={styles.actions}>
        <PressableScale
          accessibilityRole="button"
          disabled={busy !== null}
          onPress={onLater}
          style={[styles.later, { backgroundColor: SCENE_RAISED }, busy === 'later' && styles.busy]}
        >
          <TextV2 variant="cta" color="#FFFFFF">
            {t('coach.offer.later')}
          </TextV2>
        </PressableScale>
        <Button
          label={t('coach.offer.accept')}
          variant="commit"
          loading={busy === 'accept'}
          disabled={busy === 'later'}
          onPress={onAccept}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

// A declined offer stays reachable (§30.1: the offer stays in Nutrición
// until accepted or replaced).
export function CoachOfferDeclinedRow({
  coachName,
  busy,
  onActivate,
}: {
  coachName: string;
  busy: boolean;
  onActivate: () => void;
}) {
  const { t } = useCoachText();
  return (
    <View style={[styles.declined, { backgroundColor: EMBER_TINT }]}>
      <TextV2 variant="body" style={styles.flex}>
        {t('coach.offer.declined', { name: coachName })}
      </TextV2>
      <Button label={t('coach.offer.activate')} size="sm" variant="commit" loading={busy} onPress={onActivate} />
    </View>
  );
}

// "Plan de tu coach" chip + "Objetivos de {coach}" (accepted plan).
export function CoachPlanLabel({ coachName }: { coachName: string | null }) {
  const { colors } = useThemeV2();
  const { t } = useCoachText();
  return (
    <View style={styles.plan}>
      <View style={[styles.chip, { backgroundColor: colors.ember.base }]}>
        <TextV2 variant="captionStrong" color="#141312">
          {t('coach.plan.chip')}
        </TextV2>
      </View>
      {coachName ? (
        <TextV2 variant="body" tone="secondary">
          {t('coach.plan.by', { name: coachName })}
        </TextV2>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: 26, padding: 20, gap: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  figures: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  macros: { flexDirection: 'row', gap: 16, paddingBottom: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  later: { flex: 1, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  busy: { opacity: 0.6 },
  declined: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  chip: { height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center' },
});
