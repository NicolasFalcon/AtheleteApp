import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { CalendarPlus, CalendarCheck, CalendarX, Flame, Info, Play, SlidersHorizontal } from 'lucide-react-native';
import { AuraMark, Button, TextV2, useThemeV2 } from '@app/components/v2';
import { RoutineCover } from '@app/components/v2/RoutineCover';
import { focusWord } from '@app/features/workouts/routineFocus';
import { useAuth } from '@app/hooks/useAuth';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import type { RoutineLibraryMessage, WeekPlanAddedMessage } from '@app/features/ellie/chatModel';
import { COMPACT_ROWS, exerciseDetail } from '@app/features/ellie/routineProposalModel';
import {
  CARD_SHADOW,
  ExerciseLine,
  Pills,
  StepsRow,
  useProposalColors,
} from '@app/features/ellie/v2/RoutineProposalParts';
import { addToWeekText, weekdayLabel, weekdayName } from '@app/features/week/addToWeekCopy';
import { dayNumber, weekStartOf } from '@app/features/week/weekModel';
import { useWeekPlan } from '@app/hooks/useWeekPlan';

// ELLIE · routine_library (prop-2 §2.1): an existing routine, with the same
// detail and style as routine_proposal; its seal says where it comes from.
export function RoutineLibraryCard({
  card,
  starting,
  onStart,
  onAddToWeek,
  onView,
  onAdjust,
}: {
  card: RoutineLibraryMessage;
  starting: boolean;
  onStart: () => void;
  onAddToWeek: () => void;
  onView: () => void;
  onAdjust: () => void;
}) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  const language = useProfileLanguage();
  const { profile } = useAuth();
  const { library } = card;

  const hasWarmup = library.warmup.length > 0;
  const room = COMPACT_ROWS - (hasWarmup ? 1 : 0);
  const shown = library.main.slice(0, room);
  const more = Math.max(0, library.main.length - room);
  const count = library.main.length;
  const meta = [
    `${library.minutes} min`,
    addToWeekText(language, count === 1 ? 'library.exercises.one' : 'library.exercises.other', { n: count }),
    library.level,
  ].join(' · ');

  return (
    <Animated.View
      entering={FadeInUp.duration(350).delay(100)}
      style={[styles.card, { backgroundColor: tone.card, boxShadow: CARD_SHADOW }]}
    >
      <RoutineCover
        format="card"
        word={library.focus ? focusWord(library.focus, language) : null}
        focus={library.focus}
        gender={profile?.gender}
      >
        <View style={styles.badge}>
          <TextV2 color="#FFFFFF" style={styles.badgeText}>
            {addToWeekText(language, library.source === 'user' ? 'library.badge.user' : 'library.badge.official')}
          </TextV2>
        </View>
      </RoutineCover>

      <View style={styles.body}>
        <View style={styles.heroText}>
          <TextV2 variant="title22" numberOfLines={2}>
            {library.name}
          </TextV2>
          <TextV2 variant="meta" color={colors.text.secondary}>
            {meta}
          </TextV2>
        </View>

        {library.muscles.length > 0 ? (
          <View style={styles.pills}>
            <Pills items={library.muscles} />
          </View>
        ) : null}

        {library.reasoning ? (
          <View style={styles.reason}>
            <AuraMark size={20} />
            <TextV2 color={tone.reason} style={styles.reasonText}>
              {library.reasoning}
            </TextV2>
          </View>
        ) : null}

        {library.readinessNote ? (
          <View style={styles.readiness}>
            <Info size={14} color={colors.text.secondary} strokeWidth={2} style={styles.readinessIcon} />
            <TextV2 color={colors.text.secondary} style={styles.readinessText}>
              {library.readinessNote}
            </TextV2>
          </View>
        ) : null}

        <View style={[styles.list, { borderTopColor: tone.divider }]}>
          {hasWarmup ? (
            <StepsRow
              icon={Flame}
              label={addToWeekText(language, 'library.warmup')}
              steps={library.warmup}
              divider
            />
          ) : null}
          {shown.map(exercise => (
            <ExerciseLine
              key={exercise.exerciseId}
              name={exercise.name}
              detail={exerciseDetail(exercise)}
              image={exercise.image}
              divider
            />
          ))}
          {more > 0 ? (
            <TextV2
              variant="metaStrong"
              color={colors.text.secondary}
              style={[styles.more, { borderBottomColor: tone.divider }]}
            >
              {addToWeekText(language, 'library.more', { n: more })}
            </TextV2>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            label={addToWeekText(language, 'library.start')}
            size="md"
            icon={Play}
            loading={starting}
            disabled={starting}
            onPress={onStart}
            style={styles.start}
          />
          <Button
            label={addToWeekText(language, 'addToWeek.action')}
            variant="secondary"
            size="md"
            icon={CalendarPlus}
            disabled={starting}
            onPress={onAddToWeek}
            style={styles.flex}
          />
        </View>
        <View style={styles.actions}>
          <Button
            label={addToWeekText(language, 'library.view')}
            variant="outline"
            size="md"
            disabled={starting}
            onPress={onView}
            style={styles.flex}
          />
          <Button
            label={addToWeekText(language, 'library.adjust')}
            variant="outline"
            size="md"
            icon={SlidersHorizontal}
            disabled={starting}
            onPress={onAdjust}
            style={styles.flex}
          />
        </View>
      </View>
    </Animated.View>
  );
}

// ELLIE · week_plan_added (prop-2 §2.2): the day and the routine, with "Ver
// semana" and "Deshacer"; once undone the card says "Quitada del {día}".
export function WeekPlanAddedCard({
  card,
  undoing,
  onViewWeek,
  onUndo,
}: {
  card: WeekPlanAddedMessage;
  undoing: boolean;
  onViewWeek: () => void;
  onUndo: () => void;
}) {
  const { colors } = useThemeV2();
  const tone = useProposalColors();
  const language = useProfileLanguage();
  const { added } = card;
  const day = weekdayName(language, added.date);
  // The card is a receipt of a moment: when it is read again (history) the
  // day of get_week_plan says whether it still holds. While the week loads
  // (or is being refreshed) the card is shown as added.
  const week = useWeekPlan(true, weekStartOf(added.date));
  const settled = week.isSuccess && !week.isFetching;
  const planned = week.data?.days.find(item => item.date === added.date)?.routine ?? null;
  const state: 'added' | 'removed' | 'replaced' = card.removed
    ? 'removed'
    : !settled || !added.routineId || planned?.id === added.routineId
      ? 'added'
      : planned
        ? 'replaced'
        : 'removed';
  const active = state === 'added';
  const Icon = active ? CalendarCheck : CalendarX;

  return (
    <View style={[styles.card, styles.week, { backgroundColor: tone.card, boxShadow: CARD_SHADOW }, active ? null : styles.removed]}>
      <View style={styles.weekHead}>
        <View style={[styles.weekIcon, { backgroundColor: tone.pill }]}>
          <Icon size={20} color={active ? colors.ember.base : colors.text.secondary} strokeWidth={1.8} />
        </View>
        <View style={styles.flex}>
          <TextV2 variant="label">
            {state === 'removed'
              ? addToWeekText(language, 'weekAdded.removed', { day })
              : state === 'replaced'
                ? addToWeekText(language, 'weekAdded.replacedState')
                : addToWeekText(language, 'weekAdded.title', { day, n: dayNumber(added.date) })}
          </TextV2>
          <TextV2 variant="meta" color={colors.text.secondary} numberOfLines={2}>
            {added.name || weekdayLabel(language, added.date)}
            {active && added.replaced ? ` · ${addToWeekText(language, 'weekAdded.replaced')}` : ''}
          </TextV2>
        </View>
      </View>
      {state === 'removed' ? null : (
        <View style={styles.actions}>
          <Button
            label={addToWeekText(language, 'weekAdded.viewWeek')}
            size="md"
            onPress={onViewWeek}
            disabled={undoing}
            style={styles.flex}
          />
          {active ? (
            <Button
              label={addToWeekText(language, undoing ? 'weekAdded.undoing' : 'weekAdded.undo')}
              variant="outline"
              size="md"
              loading={undoing}
              disabled={undoing}
              onPress={onUndo}
              style={styles.flex}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: 24, overflow: 'hidden' },
  badge: {
    position: 'absolute',
    top: 12,
    right: 14,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 6,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.18)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.28)',
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '700', letterSpacing: 0.8 },
  body: { padding: 16, gap: 14 },
  heroText: { gap: 3 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reason: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  reasonText: { flex: 1, fontSize: 14, lineHeight: 20 },
  readiness: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  readinessIcon: { marginTop: 3 },
  readinessText: { flex: 1, fontSize: 14, lineHeight: 20 },
  list: { borderTopWidth: 1, gap: 0 },
  more: { paddingVertical: 10, borderBottomWidth: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  start: { flex: 1 },
  week: { padding: 16, gap: 14 },
  removed: { opacity: 0.6 },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weekIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
