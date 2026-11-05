import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Info, Plus } from 'lucide-react-native';
import {
  BackButton,
  Button,
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
import { RoutineCover, useRoutineCoverContext } from '@app/components/v2/RoutineCover';
import { APP_ROUTES } from '@app/constants/routes';
import { useCoachText, type CoachT } from '@app/features/coach/coachCopy';
import {
  capitalize,
  coachErrorMessage,
  dayLetter,
  dayShort,
  daysLine,
  firstName,
  ISO_DAYS,
  isoWeekday,
  plural,
  shortDate,
  startDateOptions,
  weekdayDate,
} from '@app/features/coach/coachModel';
import { coachKeys, newClientId, useCoachMutations } from '@app/features/coach/useCoach';
import { ChoicePill, DayPill, antonStyle } from '@app/features/coach/v2/CoachParts';
import { BlockError } from '@app/features/home/v2/BlockError';
import { routineFocusWord } from '@app/features/workouts/routineFocus';
import { useAuth } from '@app/hooks/useAuth';
import { useRoutineList } from '@app/hooks/useRoutines';
import { getLocalDateKey } from '@app/lib/date';
import { useQueryClient } from '@tanstack/react-query';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import type { CoachStudentDetail } from '@app/services/coach/coachService';
import type { Workout } from '@app/shared';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'CoachAssignRoutine'>;
type Source = 'mine' | 'catalog' | 'create';
type Step = 1 | 2 | 3;

const WEEK_OPTIONS: (number | null)[] = [null, 4, 6, 8];
const NOTE_MAX = 500;

const LEVELS: Record<EllieLanguage, Record<string, string>> = {
  es: { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' },
  en: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
};

// Asignar rutina (§30.3): 1 · Elige la rutina (Mis rutinas · Catálogo ·
// Crear nueva with the usual editor), 2 · Programa (days, start, weeks),
// 3 · Nota y resumen → coach_assign_routine. The fixed CTA is inactive while
// something is missing. One client id per attempt (idempotent retries).
export function CoachAssignRoutineScreen({ navigation, route }: Props) {
  const { colors, layout, fonts } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t, language } = useCoachText();
  const cover = useRoutineCoverContext();
  const { linkId, studentName, editCopyOf } = route.params;
  const first = firstName(studentName);
  const { assignRoutine } = useCoachMutations();
  const clientId = useRef(newClientId());

  // The current assignment (from the detail already in cache) seeds step 2.
  const current = queryClient.getQueryData<CoachStudentDetail>(coachKeys.student(profile?.id, linkId))?.routine ?? null;

  const [step, setStep] = useState<Step>(1);
  const [source, setSource] = useState<Source>('mine');
  const [selected, setSelected] = useState<Workout | null>(null);
  const [days, setDays] = useState<number[]>(current?.days ?? []);
  const today = getLocalDateKey();
  const starts = useMemo(() => startDateOptions(today), [today]);
  const [start, setStart] = useState(starts[1]);
  const [weeks, setWeeks] = useState<number | null>(current?.weeks ?? null);
  const [note, setNote] = useState(current?.note ?? '');

  const mine = useRoutineList('mine', { exhaust: true });
  const catalog = useRoutineList('official', { enabled: source === 'catalog' });

  // Coming back from the editor: the new routine is selected in Mis rutinas.
  const idsBefore = useRef<Set<string> | null>(null);
  const openEditor = useCallback(
    (copyFromId?: string) => {
      idsBefore.current = new Set(mine.items.map(item => item.id));
      navigation.navigate(APP_ROUTES.CreateRoutine, {
        afterSave: 'back',
        ...(copyFromId ? { copyFromId } : {}),
      });
    },
    [mine.items, navigation],
  );

  // "Editar copia": straight into the editor, once.
  const openedCopy = useRef(false);
  useEffect(() => {
    if (editCopyOf && !openedCopy.current && !mine.isLoading) {
      openedCopy.current = true;
      openEditor(editCopyOf);
    }
  }, [editCopyOf, mine.isLoading, openEditor]);

  useFocusEffect(
    useCallback(() => {
      if (idsBefore.current) {
        mine.refetch().catch(() => undefined);
      }
      // refetch is stable.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  useEffect(() => {
    const before = idsBefore.current;
    if (!before || mine.isFetching) {
      return;
    }
    const created = mine.items.find(item => !before.has(item.id));
    if (created) {
      idsBefore.current = null;
      setSource('mine');
      setSelected(created);
    }
  }, [mine.isFetching, mine.items]);

  const canNext = step === 1 ? selected !== null : step === 2 ? days.length > 0 : true;

  const back = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      navigation.goBack();
    }
  };

  const submit = () => {
    if (!selected || days.length === 0) {
      return;
    }
    assignRoutine.mutate(
      {
        linkId,
        sourceTemplateId: selected.id,
        days,
        startDate: start,
        weeks,
        note: note.trim() ? note.trim().slice(0, NOTE_MAX) : null,
        clientId: clientId.current,
      },
      {
        onSuccess: () => {
          toast.show(t('coach.assign.done', { name: first }));
          navigation.goBack();
        },
        onError: error => Alert.alert(t('coach.assign.failed'), coachErrorMessage(error, language)),
      },
    );
  };

  const heading = t(step === 1 ? 'coach.assign.step1' : step === 2 ? 'coach.assign.step2' : 'coach.assign.step3');

  const row = (workout: Workout) => {
    const on = selected?.id === workout.id;
    const meta = [`${workout.duration} min`, LEVELS[language][workout.difficulty] ?? null]
      .filter(Boolean)
      .join(' · ');
    return (
      <PressableScale
        key={workout.id}
        accessibilityRole="radio"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`${workout.title}, ${meta}`}
        onPress={() => setSelected(workout)}
        style={[
          styles.routineRow,
          {
            backgroundColor: colors.surface.raised,
            borderColor: on ? colors.text.primary : colors.border.card,
            borderWidth: on ? 2 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        <View style={styles.thumb}>
          <RoutineCover
            format="thumb"
            word={routineFocusWord(workout, language)}
            focus={workout.routineFocus ?? null}
            gender={cover.gender}
          />
        </View>
        <View style={styles.flex}>
          <TextV2 variant="sub" numberOfLines={2}>
            {workout.title}
          </TextV2>
          <TextV2 variant="body" tone="secondary" numberOfLines={1}>
            {meta}
          </TextV2>
        </View>
        <View
          style={[
            styles.radio,
            on
              ? { backgroundColor: colors.cta.primary, borderColor: colors.cta.primary }
              : { borderColor: colors.outline.strong },
          ]}
        >
          {on ? <Check size={14} color={colors.cta.primaryText} strokeWidth={3} /> : null}
        </View>
      </PressableScale>
    );
  };

  const list = (query: typeof mine, empty: string) => {
    if (query.isError) {
      return <BlockError message={t('coach.loadError')} onRetry={() => query.refetch().catch(() => undefined)} />;
    }
    if (query.isLoading) {
      return (
        <SkeletonGroup>
          <View style={styles.listGap}>
            {[0, 1, 2, 3].map(index => (
              <Skeleton key={index} height={100} radius={22} />
            ))}
          </View>
        </SkeletonGroup>
      );
    }
    if (query.items.length === 0) {
      return (
        <TextV2 variant="body" tone="secondary">
          {empty}
        </TextV2>
      );
    }
    return (
      <View style={styles.listGap}>
        {query.items.map(row)}
        {query.hasNextPage && source === 'catalog' ? (
          <Button
            label={t('coach.assign.catalog.more')}
            variant="secondary"
            size="md"
            loading={query.isFetchingNextPage}
            onPress={() => {
              query.fetchNextPage().catch(() => undefined);
            }}
          />
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <View style={[styles.header, { paddingTop: insets.top + 6, paddingHorizontal: layout.gutter }]}>
        <View style={styles.headerRow}>
          <BackButton onPress={back} />
          <View style={styles.headerTitle}>
            <TextV2 variant="sub" align="center" numberOfLines={1}>
              {t('coach.assign.title')}
            </TextV2>
            <TextV2 variant="meta" tone="secondary" align="center" numberOfLines={1}>
              {t('coach.assign.for', { name: studentName })}
            </TextV2>
          </View>
          <TextV2 variant="metaStrong" tone="secondary" style={styles.stepLabel}>
            {t('coach.assign.step', { n: step })}
          </TextV2>
        </View>
        <View style={styles.segments}>
          {[1, 2, 3].map(index => (
            <View
              key={index}
              style={[styles.segment, { backgroundColor: index <= step ? colors.ember.base : colors.divider }]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 8,
          paddingBottom: insets.bottom + 120,
          gap: 22,
        }}
      >
        <TextV2 accessibilityRole="header" style={[antonStyle(fonts.display, 40), styles.upper]}>
          {heading}
        </TextV2>

        {step === 1 ? (
          <>
            <Segmented
              options={[
                { key: 'mine', label: t('coach.assign.tab.mine') },
                { key: 'catalog', label: t('coach.assign.tab.catalog') },
                { key: 'create', label: t('coach.assign.tab.create') },
              ]}
              value={source}
              onChange={setSource}
            />
            {source === 'mine' ? list(mine, t('coach.assign.mine.empty')) : null}
            {source === 'catalog' ? list(catalog, t('coach.loadError')) : null}
            {source === 'create' ? (
              <View style={[styles.createCard, { backgroundColor: colors.surface.raised, borderColor: colors.border.card }]}>
                <View style={[styles.plus, { backgroundColor: colors.surface.muted }]}>
                  <Plus size={22} color={colors.text.primary} strokeWidth={2} />
                </View>
                <TextV2 variant="sub">{t('coach.assign.create.title')}</TextV2>
                <TextV2 variant="body" tone="secondary">
                  {t('coach.assign.create.body')}
                </TextV2>
                <Button label={t('coach.assign.create.cta')} size="md" onPress={() => openEditor()} />
              </View>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <ScheduleStep
            t={t}
            language={language}
            days={days}
            onToggleDay={day =>
              setDays(currentDays =>
                currentDays.includes(day)
                  ? currentDays.filter(item => item !== day)
                  : [...currentDays, day].sort((a, b) => a - b),
              )
            }
            starts={starts}
            start={start}
            onStart={setStart}
            weeks={weeks}
            onWeeks={setWeeks}
          />
        ) : null}

        {step === 3 && selected ? (
          <>
            <View style={styles.fieldHead}>
              <TextV2 variant="bodyStrong" style={styles.flex}>
                {t('coach.assign.note', { name: first })}
              </TextV2>
              <TextV2 variant="body" tone="secondary">
                {t('coach.optional')}
              </TextV2>
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={NOTE_MAX}
              placeholder={t('coach.assign.note.placeholder')}
              placeholderTextColor={colors.text.tertiary}
              style={[styles.note, { backgroundColor: colors.surface.muted, color: colors.text.primary }]}
              accessibilityLabel={t('coach.assign.note', { name: first })}
            />
            <View style={[styles.summary, { backgroundColor: colors.surface.raised, borderColor: colors.border.card }]}>
              {[
                [t('coach.assign.summary.routine'), selected.title],
                [t('coach.assign.summary.days'), daysLine(language, days)],
                [t('coach.assign.summary.start'), weekdayDate(language, start)],
                [
                  t('coach.assign.summary.duration'),
                  weeks ? plural(t, 'coach.weeks.one', 'coach.weeks.other', weeks) : t('coach.weeks.none'),
                ],
              ].map(([label, value], index) => (
                <View
                  key={label}
                  style={[
                    styles.summaryRow,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                  ]}
                >
                  <TextV2 variant="body" tone="secondary">
                    {label}
                  </TextV2>
                  <TextV2 variant="bodyStrong" numberOfLines={1} style={styles.summaryValue}>
                    {value}
                  </TextV2>
                </View>
              ))}
            </View>
            <View style={styles.info}>
              <Info size={18} color={colors.text.secondary} strokeWidth={1.8} />
              <TextV2 variant="meta" tone="secondary" style={styles.flex}>
                {t('coach.assign.copyNote')}
              </TextV2>
            </View>
          </>
        ) : null}
      </ScrollView>

      <GlassSurface
        kind="nav"
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) + 4, borderTopColor: colors.divider, paddingHorizontal: layout.gutter },
        ]}
      >
        <Button
          label={step === 3 ? t('coach.assign.cta') : t('coach.next')}
          disabled={!canNext}
          loading={assignRoutine.isPending}
          onPress={() => (step === 3 ? submit() : setStep((step + 1) as Step))}
        />
      </GlassSurface>
    </View>
  );
}

function ScheduleStep({
  t,
  language,
  days,
  onToggleDay,
  starts,
  start,
  onStart,
  weeks,
  onWeeks,
}: {
  t: CoachT;
  language: EllieLanguage;
  days: number[];
  onToggleDay: (day: number) => void;
  starts: string[];
  start: string;
  onStart: (date: string) => void;
  weeks: number | null;
  onWeeks: (weeks: number | null) => void;
}) {
  return (
    <>
      <View style={styles.group}>
        <View style={styles.fieldHead}>
          <TextV2 variant="bodyStrong" style={styles.flex}>
            {t('coach.assign.days')}
          </TextV2>
          {days.length > 0 ? (
            <TextV2 variant="body" tone="secondary">
              {plural(t, 'coach.assign.daysCount.one', 'coach.assign.daysCount.other', days.length)}
            </TextV2>
          ) : null}
        </View>
        <View style={styles.dayRow}>
          {ISO_DAYS.map(iso => (
            <DayPill
              key={iso}
              label={dayLetter(language, iso)}
              accessibilityLabel={capitalize(dayShort(language, iso))}
              on={days.includes(iso)}
              onPress={() => onToggleDay(iso)}
            />
          ))}
        </View>
      </View>
      <View style={styles.group}>
        <TextV2 variant="bodyStrong">{t('coach.assign.start')}</TextV2>
        <View style={styles.wrap}>
          {starts.map((date, index) => (
            <ChoicePill
              key={date}
              label={
                index === 0
                  ? t('coach.assign.start.today', {
                      date: `${dayShort(language, isoWeekday(date))} ${shortDate(language, date)}`,
                    })
                  : weekdayDate(language, date)
              }
              on={start === date}
              onPress={() => onStart(date)}
            />
          ))}
        </View>
      </View>
      <View style={styles.group}>
        <View style={styles.fieldHead}>
          <TextV2 variant="bodyStrong" style={styles.flex}>
            {t('coach.assign.weeks')}
          </TextV2>
          <TextV2 variant="body" tone="secondary">
            {t('coach.optional')}
          </TextV2>
        </View>
        <View style={styles.wrap}>
          {WEEK_OPTIONS.map(option => (
            <ChoicePill
              key={String(option)}
              label={option ? plural(t, 'coach.weeks.one', 'coach.weeks.other', option) : t('coach.weeks.none')}
              on={weeks === option}
              onPress={() => onWeeks(option)}
            />
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  upper: { textTransform: 'uppercase' },
  header: { gap: 14, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { flex: 1 },
  stepLabel: { minWidth: 44, textAlign: 'right' },
  segments: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  listGap: { gap: 12 },
  routineRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14, borderRadius: 22 },
  thumb: { width: 64, height: 64, borderRadius: 14, overflow: 'hidden' },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  createCard: { borderRadius: 24, padding: 20, gap: 12, borderWidth: StyleSheet.hairlineWidth },
  plus: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  group: { gap: 12 },
  fieldHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { minHeight: 120, borderRadius: 20, padding: 16, fontSize: 16, lineHeight: 23, textAlignVertical: 'top' },
  summary: { borderRadius: 22, paddingHorizontal: 18, borderWidth: StyleSheet.hairlineWidth },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 16 },
  summaryValue: { flexShrink: 1, textAlign: 'right' },
  info: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
