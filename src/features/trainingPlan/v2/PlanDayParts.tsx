import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Check, Repeat, X } from 'lucide-react-native';
import {
  PressableScale,
  SessionTypeChip,
  TextV2,
  sessionTypeColor,
  sessionTypeTextColor,
  useThemeV2,
  type SessionType,
} from '@app/components/v2';
import {
  DAY_LETTERS,
  dayName,
  longDate,
  sessionTypeKey,
  shortDate,
  useTrainingPlanText,
} from '@app/features/trainingPlan/trainingPlanCopy';
import type { PlanDayState, PlanDayView } from '@app/features/trainingPlan/planViewModel';
import { dayNumber, weekdayIndex } from '@app/features/week/weekModel';
import type { ColorsV2 } from '@app/theme/v2';

// Day marks of the training plan (handoff v2.21 §31.0 · states): the same
// language in the week pills, the list rows and the month grid.

const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

const struck = (state: PlanDayState) =>
  state === 'missed' || state === 'substituted' || state === 'skipped';

// The check on a done mark: dark on the light colours, white on the blue and
// the ink ones (a done test is ink: white check; in Dark it is ivory).
function checkColor(colors: ColorsV2, type: SessionType | null): string {
  if (type === 'descarga') {
    return '#FFFFFF';
  }
  return type ? sessionTypeTextColor(colors, type) : '#121212';
}

// The mark of a day: done is filled with the type's colour and a check; a
// pending or today one is an outline of that colour; missed, skipped and
// substituted are grey with × or ↻; an added routine is ink; a free day of the
// pause and a rest day carry nothing.
export function DayMark({
  state,
  type,
  added = false,
  size = 24,
  radius = 8,
  iconSize = 13,
}: {
  state: PlanDayState;
  type: SessionType | null;
  added?: boolean;
  size?: number;
  radius?: number;
  iconSize?: number;
}) {
  const { colors } = useThemeV2();
  const base: ViewStyle = { width: size, height: size, borderRadius: radius };
  if (state === 'pause' || state === 'rest' || state === 'empty') {
    return <View style={[styles.mark, base]} />;
  }
  if (added) {
    return (
      <View style={[styles.mark, base, state === 'done' ? { backgroundColor: colors.text.primary } : styles.addedRing, state === 'done' ? null : { borderColor: colors.divider }]}>
        {state === 'done' ? <Check size={iconSize} color={colors.cta.primaryText} strokeWidth={2.6} /> : null}
      </View>
    );
  }
  const color = type ? sessionTypeColor(colors, type) : colors.divider;
  if (state === 'done') {
    return (
      <View style={[styles.mark, base, { backgroundColor: color }]}>
        <Check size={iconSize} color={checkColor(colors, type)} strokeWidth={2.6} />
      </View>
    );
  }
  if (state === 'missed' || state === 'skipped' || state === 'substituted') {
    const Icon = state === 'substituted' ? Repeat : X;
    return (
      <View style={[styles.mark, base, { backgroundColor: colors.surface.muted }]}>
        <Icon size={iconSize} color={colors.text.primary} strokeWidth={2.2} style={styles.faint} />
      </View>
    );
  }
  // today · pending.
  return <View style={[styles.mark, base, styles.pendingRing, { borderColor: color }]} />;
}

// One pill of the week (§31.4): letter, number and a dot with the type's
// colour: filled when done, outlined when pending or today, hairline when
// missed or substituted (and struck number); an added routine, ink; a free
// day of the pause, no fill, hairline and 50 %.
export function PlanPill({
  view,
  today,
  selected = false,
  compact = false,
  fill,
  onPress,
}: {
  view: PlanDayView;
  today: boolean;
  selected?: boolean;
  compact?: boolean;
  fill?: string;
  onPress?: () => void;
}) {
  const { colors, language } = usePillContext();
  const { t } = useTrainingPlanText();
  const pause = view.state === 'pause';
  const ink = today ? colors.cta.primaryText : colors.text.primary;
  const typeColor = view.type ? sessionTypeColor(colors, view.type) : colors.divider;
  const dot = compact ? 5 : 8;
  let dotStyle: ViewStyle = {};
  if (view.added) {
    dotStyle = { backgroundColor: today ? colors.cta.primaryText : colors.text.primary };
  } else if (view.state === 'done') {
    dotStyle = { backgroundColor: typeColor };
  } else if (view.state === 'today' || view.state === 'pending') {
    dotStyle = { borderWidth: 2, borderColor: typeColor };
  } else if (struck(view.state)) {
    dotStyle = { backgroundColor: colors.divider };
  }
  const background = today ? colors.cta.primary : pause ? 'transparent' : fill ?? colors.surface.raised;
  const ring = pause && !today
    ? `inset 0 0 0 1.5px ${colors.divider}`
    : selected && !today
      ? `inset 0 0 0 1.5px ${colors.text.primary}`
      : undefined;
  const label =
    `${dayName(language, view.date)}` +
    (pause ? ` · ${t('day.inPause')}` : view.title ? ` · ${view.title}` : view.restLabel ? ` · ${view.restLabel}` : '');
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.pill,
        compact ? styles.pillCompact : styles.pillFull,
        pause && !today ? styles.pillPause : null,
        { backgroundColor: background, boxShadow: ring },
      ]}
    >
      <TextV2 color={ink} style={styles.pillLetter}>
        {DAY_LETTERS[language][weekdayIndex(view.date)]}
      </TextV2>
      <TextV2 color={ink} style={[styles.pillNumber, struck(view.state) ? styles.strike : null]}>
        {String(dayNumber(view.date))}
      </TextV2>
      <View style={[styles.dot, { width: dot, height: dot, borderRadius: dot / 2 }, dotStyle]} />
    </PressableScale>
  );
}

function usePillContext() {
  const { colors } = useThemeV2();
  const { language } = useTrainingPlanText();
  return { colors, language };
}

export function PlanPills({
  views,
  today,
  selected,
  compact = false,
  fill,
  onPressDay,
}: {
  views: PlanDayView[];
  today: string;
  selected?: string | null;
  compact?: boolean;
  fill?: string;
  onPressDay?: (view: PlanDayView) => void;
}) {
  return (
    <View style={styles.pills}>
      {views.map(view => (
        <PlanPill
          key={view.date}
          view={view}
          today={view.date === today}
          selected={selected === view.date}
          compact={compact}
          fill={fill}
          onPress={onPressDay ? () => onPressDay(view) : undefined}
        />
      ))}
    </View>
  );
}

// A row of "Sesiones · x de y hechas" (§31.4): the day's mark, its name and
// date, the title (struck when missed or substituted), the type chip with
// the minutes, "Por {rutina}" when substituted, and the state on the right.
export function PlanSessionRow({
  view,
  last,
  onPress,
}: {
  view: PlanDayView;
  last: boolean;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();
  const { t, language } = useTrainingPlanText();
  const state = view.state;
  const done = state === 'done';
  const marked = struck(state);
  const typeColor = view.type ? sessionTypeColor(colors, view.type) : colors.divider;
  const stateText =
    view.added && !done
      ? t('state.pending')
      : state === 'today'
        ? t('state.today')
        : state === 'pending'
          ? t('state.pending')
          : t(`state.${state}` as 'state.done');
  const stateColor = state === 'missed' || state === 'today' ? colors.plan.emT : colors.text.secondary;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${dayName(language, view.date)} · ${view.title} · ${stateText}`}
      onPress={onPress}
      style={[styles.row, last ? null : [styles.rowDivider, { borderBottomColor: colors.divider }]]}
    >
      {done || marked ? (
        <DayMark state={state} type={view.type} added={view.added} size={44} radius={14} iconSize={18} />
      ) : (
        <View style={[styles.rowMark, styles.rowOutline, { borderColor: view.added ? colors.divider : typeColor }]}>
          <TextV2 style={styles.rowLetter}>{DAY_LETTERS[language][weekdayIndex(view.date)]}</TextV2>
        </View>
      )}
      <View style={styles.rowTexts}>
        <TextV2 variant="caption" color={colors.text.secondary}>
          {capitalize(longDate(language, view.date))}
        </TextV2>
        <TextV2 variant="bodyL" style={[styles.rowTitle, marked ? styles.strike : null]}>
          {view.title}
        </TextV2>
        <View style={styles.rowChips}>
          {view.added ? (
            <View style={[styles.addedChip, { backgroundColor: colors.divider }]}>
              <TextV2 color="#121212" style={styles.addedChipText}>
                {t('state.added')}
              </TextV2>
            </View>
          ) : view.type ? (
            <SessionTypeChip type={view.type} label={t(sessionTypeKey(view.type))} />
          ) : null}
          {view.minutes ? (
            <TextV2 variant="caption" color={colors.text.secondary}>
              {`${view.minutes} min`}
            </TextV2>
          ) : null}
        </View>
        {state === 'substituted' && view.substitutedBy ? (
          <View style={styles.subLine}>
            <Repeat size={12} color={colors.text.secondary} strokeWidth={2} />
            <TextV2 variant="caption" color={colors.text.secondary}>
              {t('row.by', { name: view.substitutedBy })}
            </TextV2>
          </View>
        ) : null}
        {view.movedFrom && state !== 'done' ? (
          <TextV2 variant="caption" color={colors.text.secondary}>
            {t('state.moved', { date: shortDate(language, view.movedFrom) })}
          </TextV2>
        ) : null}
      </View>
      <TextV2 variant="captionStrong" color={stateColor} style={styles.rowState}>
        {stateText}
      </TextV2>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center' },
  faint: { opacity: 0.55 },
  addedRing: { borderWidth: 2 },
  pendingRing: { borderWidth: 2 },
  pills: { flexDirection: 'row', gap: 6 },
  pill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  pillCompact: { height: 64, borderRadius: 16 },
  pillFull: { height: 74, borderRadius: 18 },
  pillPause: { opacity: 0.5 },
  pillLetter: { fontSize: 11, lineHeight: 13, fontWeight: '600', letterSpacing: 0.4, opacity: 0.72 },
  pillNumber: { fontSize: 18, lineHeight: 20, fontWeight: '600' },
  strike: { textDecorationLine: 'line-through' },
  dot: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  rowMark: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowOutline: { borderWidth: 2 },
  rowLetter: { fontSize: 12, fontWeight: '700' },
  rowTexts: { flex: 1, minWidth: 0, gap: 4 },
  rowTitle: { fontWeight: '600', lineHeight: 21 },
  rowChips: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  addedChip: { minHeight: 20, paddingHorizontal: 8, borderRadius: 10, justifyContent: 'center' },
  addedChipText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  subLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowState: { flexShrink: 0, textAlign: 'right', maxWidth: 110 },
});
