import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftRight, Check, MoreHorizontal, Pencil, Share2, X } from 'lucide-react-native';
import {
  AppImage,
  BackButton,
  Button,
  Eyebrow,
  GlassHeader,
  IconButton,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { routineCoverSource } from '@app/components/v2/RoutineCover';
import { APP_ROUTES } from '@app/constants/routes';
import { useCoachText, type CoachT } from '@app/features/coach/coachCopy';
import {
  coachErrorMessage,
  dayLetter,
  firstName,
  formatKcal,
  ISO_DAYS,
  isoWeekday,
  macroPct,
  plural,
  profileLine,
  sessionWhen,
  shortDate,
  zoneLabel,
} from '@app/features/coach/coachModel';
import { useCoachMutations, useCoachStudent } from '@app/features/coach/useCoach';
import {
  Card,
  CoachAvatar,
  ConfirmSheet,
  DayPill,
  LockedBlock,
  RatingBars,
  SAGE,
  SectionTitle,
  ShareChip,
  StatusChip,
  antonStyle,
} from '@app/features/coach/v2/CoachParts';
import { InviteSheet } from '@app/features/coach/v2/InviteSheet';
import { BlockError } from '@app/features/home/v2/BlockError';
import { parseRoutineFocus } from '@app/features/workouts/routineFocus';
import { getLocalDateKey } from '@app/lib/date';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import type {
  CoachNutritionAssignment,
  CoachStudentDetail,
  CoachWeekDay,
} from '@app/services/coach/coachService';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'CoachStudent'>;

// Detalle de alumno (§30.3): what they share, this week L–D with the
// adherence and the last session, the assigned routine (Cambiar / Editar
// copia / Terminar), nutrition and weight & sleep only when shared (else a
// locked block), recent discomfort, and "···" → Desvincular.
export function CoachStudentScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t, language } = useCoachText();
  const { linkId } = route.params;
  const query = useCoachStudent(linkId);
  const mutations = useCoachMutations();
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [endRoutineOpen, setEndRoutineOpen] = useState(false);
  const [invite, setInvite] = useState<null | 'resend' | 'again'>(null);
  const back = () => safeGoBack(navigation, [APP_ROUTES.CoachStudents]);
  const detail = query.data ?? null;
  const name = detail?.profile.name || route.params.name || '';
  const first = firstName(name);

  const openMenu = () =>
    Alert.alert(name, undefined, [
      { text: t('coach.detail.unlink'), style: 'destructive', onPress: () => setUnlinkOpen(true) },
      { text: t('coach.cancel'), style: 'cancel' },
    ]);

  const unlink = () => {
    mutations.endLink.mutate(linkId, {
      onSuccess: () => {
        setUnlinkOpen(false);
        toast.show(t('coach.detail.unlinked', { name: first }));
        back();
      },
      onError: error => {
        setUnlinkOpen(false);
        toast.show(coachErrorMessage(error, language), { tone: 'error' });
      },
    });
  };

  const endRoutine = () => {
    const assignmentId = detail?.routine?.assignmentId;
    if (!assignmentId) {
      return;
    }
    mutations.endRoutine.mutate(assignmentId, {
      onSuccess: () => {
        setEndRoutineOpen(false);
        toast.show(t('coach.detail.endRoutine.done'));
      },
      onError: error => {
        setEndRoutineOpen(false);
        toast.show(coachErrorMessage(error, language), { tone: 'error' });
      },
    });
  };

  const assignRoutine = (editCopyOf?: string) =>
    navigation.navigate(APP_ROUTES.CoachAssignRoutine, {
      linkId,
      studentName: name,
      ...(editCopyOf ? { editCopyOf } : {}),
    });

  let body;
  if (query.isError) {
    body = (
      <BlockError
        message={coachErrorMessage(query.error, language)}
        onRetry={() => {
          query.refetch().catch(() => undefined);
        }}
      />
    );
  } else if (!detail) {
    body = (
      <SkeletonGroup>
        <View style={styles.skeleton}>
          <View style={styles.skeletonHead}>
            <Skeleton width={72} height={72} radius={36} />
            <View style={styles.flexGap}>
              <Skeleton width="70%" height={26} />
              <Skeleton width="50%" height={14} />
            </View>
          </View>
          <Skeleton height={36} radius={18} width="80%" />
          <Skeleton height={150} radius={22} />
          <Skeleton height={260} radius={22} />
        </View>
      </SkeletonGroup>
    );
  } else {
    const active = detail.status === 'active';
    body = (
      <>
        <View style={styles.head}>
          <CoachAvatar name={name} avatar={detail.profile.avatar} size={72} dark />
          <View style={styles.flex}>
            <TextV2 variant="title28" numberOfLines={2} accessibilityRole="header">
              {name}
            </TextV2>
            {profileLine(language, detail.profile.level, detail.profile.goal) ? (
              <TextV2 variant="bodyL" tone="secondary">
                {profileLine(language, detail.profile.level, detail.profile.goal)}
              </TextV2>
            ) : null}
          </View>
        </View>

        {detail.status === 'pending' ? (
          <Card>
            <TextV2 variant="bodyStrong">{t('coach.list.invitePending')}</TextV2>
            <TextV2 variant="body" tone="secondary">
              {t('coach.detail.pending.body')}
            </TextV2>
            <Button label={t('coach.invite.resend')} icon={Share2} size="md" onPress={() => setInvite('resend')} />
            <Button
              label={t('coach.invite.cancel')}
              variant="text"
              size="md"
              loading={mutations.endLink.isPending}
              onPress={() =>
                mutations.endLink.mutate(linkId, {
                  onSuccess: () => {
                    toast.show(t('coach.invite.cancelled'));
                    back();
                  },
                  onError: error => toast.show(coachErrorMessage(error, language), { tone: 'error' }),
                })
              }
            />
          </Card>
        ) : null}

        {detail.status === 'ended' ? (
          <Card>
            <TextV2 variant="bodyStrong">
              {detail.endedAt
                ? t('coach.detail.ended.on', { date: shortDate(language, detail.endedAt) })
                : t('coach.detail.ended.body')}
            </TextV2>
            <Button label={t('coach.invite.again')} size="md" onPress={() => setInvite('again')} />
          </Card>
        ) : null}

        {active ? (
          <>
            <View style={styles.block}>
              <Eyebrow>{t('coach.detail.shares')}</Eyebrow>
              <View style={styles.chips}>
                <ShareChip label={t('coach.share.training')} on />
                <ShareChip label={t('coach.share.nutrition')} on={detail.shares.nutrition} />
                <ShareChip label={t('coach.share.body')} on={detail.shares.body} />
              </View>
            </View>

            <WeekBlock detail={detail} t={t} language={language} />

            <View style={styles.block}>
              <SectionTitle title={t('coach.detail.routine')} />
              {detail.routine ? (
                <RoutineCard
                  detail={detail}
                  t={t}
                  language={language}
                  onChange={() => assignRoutine()}
                  onEditCopy={() => assignRoutine(detail.routine?.studentTemplateId ?? undefined)}
                  onEnd={() => setEndRoutineOpen(true)}
                />
              ) : (
                <Card>
                  <TextV2 variant="body" tone="secondary">
                    {t('coach.detail.noRoutine', { name: first })}
                  </TextV2>
                  <Button label={t('coach.detail.assignRoutine')} size="md" onPress={() => assignRoutine()} />
                </Card>
              )}
            </View>

            <NutritionBlock
              detail={detail}
              t={t}
              language={language}
              name={first}
              onAssign={() => navigation.navigate(APP_ROUTES.CoachAssignNutrition, { linkId })}
            />

            {detail.discomforts !== null ? (
              <View style={styles.block}>
                <SectionTitle title={t('coach.detail.discomfort')} />
                {detail.discomforts.length === 0 ? (
                  <TextV2 variant="body" tone="secondary">
                    {t('coach.detail.discomfort.none')}
                  </TextV2>
                ) : (
                  <Card style={styles.listCard}>
                    {detail.discomforts.map((item, index) => (
                      <View
                        key={`${item.zone}-${index}`}
                        style={[
                          styles.discomfort,
                          index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                        ]}
                      >
                        <View style={styles.flex}>
                          <TextV2 variant="bodyStrong">{zoneLabel(language, item.zone)}</TextV2>
                          {item.note ? (
                            <TextV2 variant="meta" tone="secondary">
                              {item.note}
                            </TextV2>
                          ) : null}
                        </View>
                        {item.date ? (
                          <TextV2 variant="meta" tone="secondary">
                            {shortDate(language, item.date)}
                          </TextV2>
                        ) : null}
                      </View>
                    ))}
                  </Card>
                )}
              </View>
            ) : null}

            <BodyBlock detail={detail} t={t} name={first} />
          </>
        ) : null}
      </>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title={t('coach.detail.header')}
        left={<BackButton onPress={back} />}
        right={
          detail && detail.status !== 'ended' ? (
            <IconButton icon={MoreHorizontal} accessibilityLabel={t('coach.detail.menu')} onPress={openMenu} />
          ) : undefined
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 8,
          paddingBottom: insets.bottom + 40,
          gap: 28,
        }}
      >
        {body}
      </ScrollView>
      <ConfirmSheet
        open={unlinkOpen}
        title={t('coach.detail.unlink.title', { name: first })}
        body={t('coach.detail.unlink.body')}
        confirmLabel={t('coach.detail.unlink.cta')}
        cancelLabel={t('coach.cancel')}
        loading={mutations.endLink.isPending}
        onConfirm={unlink}
        onClose={() => setUnlinkOpen(false)}
      />
      <ConfirmSheet
        open={endRoutineOpen}
        title={t('coach.detail.endRoutine.title')}
        body={t('coach.detail.endRoutine.body', { name: first })}
        confirmLabel={t('coach.detail.endRoutine')}
        cancelLabel={t('coach.cancel')}
        loading={mutations.endRoutine.isPending}
        onConfirm={endRoutine}
        onClose={() => setEndRoutineOpen(false)}
      />
      <InviteSheet open={invite !== null} regenerate={invite === 'again'} onClose={() => setInvite(null)} />
    </View>
  );
}

// ── This week ───────────────────────────────────────────────────────────────

type DayState = 'done' | 'planned' | 'missed' | 'rest';

function dayStates(days: CoachWeekDay[]): DayState[] {
  return ISO_DAYS.map(iso => {
    const day = days.find(item => item.date && isoWeekday(item.date) === iso);
    if (!day) {
      return 'rest';
    }
    if (day.done) {
      return 'done';
    }
    if (day.missed) {
      return 'missed';
    }
    return day.planned ? 'planned' : 'rest';
  });
}

function WeekBlock({ detail, t, language }: { detail: CoachStudentDetail; t: CoachT; language: EllieLanguage }) {
  const { colors, fonts, mode } = useThemeV2();
  const today = getLocalDateKey();
  const todayIso = isoWeekday(today);
  const states = dayStates(detail.week.days);
  const planned = states.filter(state => state !== 'rest').length;
  const done = states.filter(state => state === 'done').length;
  const missed = states.filter(state => state === 'missed').length;
  const adherence = detail.week.adherencePct ?? (planned > 0 ? Math.round((done / planned) * 100) : 0);
  const last = detail.week.lastSession;
  const emberText = mode === 'light' ? colors.ember.deep : colors.ember.textOnDark;

  return (
    <View style={styles.block}>
      <View style={styles.weekHead}>
        <TextV2 variant="section" accessibilityRole="header" style={styles.flex}>
          {t('coach.detail.week')}
        </TextV2>
        <TextV2 style={antonStyle(fonts.display, 44)}>{`${adherence}%`}</TextV2>
        <TextV2 variant="body" tone="secondary">
          {t('coach.detail.adherence')}
        </TextV2>
      </View>
      <View style={styles.weekRow}>
        {states.map((state, index) => {
          const iso = index + 1;
          const isToday = iso === todayIso;
          return (
            <View key={iso} style={styles.weekDay}>
              <TextV2 variant="bodyStrong" color={isToday ? emberText : colors.text.secondary}>
                {isToday ? t('coach.detail.today') : dayLetter(language, iso)}
              </TextV2>
              {state === 'done' ? (
                <View style={[styles.circle, { backgroundColor: colors.ember.base }]}>
                  <Check size={18} color="#141312" strokeWidth={2.6} />
                </View>
              ) : state === 'missed' ? (
                <View style={[styles.circle, { backgroundColor: colors.surface.muted }]}>
                  <X size={16} color={colors.text.tertiary} strokeWidth={2.4} />
                </View>
              ) : state === 'planned' ? (
                <View style={[styles.circle, styles.planned, { borderColor: colors.outline.strong }]} />
              ) : (
                <View style={styles.circle}>
                  <View style={[styles.dash, { backgroundColor: colors.outline.strong }]} />
                </View>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <Legend color={colors.ember.base} label={t('coach.detail.legend.done')} />
        <Legend outline={colors.outline.strong} label={t('coach.detail.legend.planned')} />
        <Legend color={colors.surface.muted} label={t('coach.detail.legend.missed')} />
        <TextV2 variant="bodyStrong" style={styles.legendCount}>
          {[
            t('coach.detail.sessions', { done, planned }),
            missed > 0 ? plural(t, 'coach.detail.missed.one', 'coach.detail.missed.other', missed) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </TextV2>
      </View>
      {last ? (
        <Card style={styles.lastCard}>
          <View style={styles.flex}>
            <TextV2 variant="body" tone="secondary">
              {t('coach.detail.lastSession', { when: sessionWhen(language, last.date, today) })}
            </TextV2>
            <TextV2 variant="sub" numberOfLines={2}>
              {[last.title, last.duration ? `${last.duration} min` : null].filter(Boolean).join(' · ')}
            </TextV2>
          </View>
          {last.rating !== null ? (
            <View style={styles.rating}>
              <RatingBars value={last.rating} />
              <TextV2 variant="meta" tone="secondary">
                {t('coach.detail.rating', { n: last.rating })}
              </TextV2>
            </View>
          ) : null}
        </Card>
      ) : (
        <TextV2 variant="body" tone="secondary">
          {t('coach.detail.noSessions')}
        </TextV2>
      )}
    </View>
  );
}

function Legend({ color, outline, label }: { color?: string; outline?: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          color ? { backgroundColor: color } : { borderWidth: 1.5, borderColor: outline },
        ]}
      />
      <TextV2 variant="body" tone="secondary">
        {label}
      </TextV2>
    </View>
  );
}

// ── Assigned routine ────────────────────────────────────────────────────────

function RoutineCard({
  detail,
  t,
  language,
  onChange,
  onEditCopy,
  onEnd,
}: {
  detail: CoachStudentDetail;
  t: CoachT;
  language: EllieLanguage;
  onChange: () => void;
  onEditCopy: () => void;
  onEnd: () => void;
}) {
  const { colors } = useThemeV2();
  const routine = detail.routine;
  if (!routine) {
    return null;
  }
  const days = new Set(routine.days);
  const since = routine.startDate ? t('coach.since', { date: shortDate(language, routine.startDate) }) : null;
  const length =
    routine.weeks && routine.weeks > 0
      ? plural(t, 'coach.weeks.one', 'coach.weeks.other', routine.weeks)
      : t('coach.weeks.none');
  return (
    <View style={[styles.routineCard, { backgroundColor: colors.surface.raised, borderColor: colors.border.card }]}>
      <View style={styles.routineCover}>
        <AppImage
          source={routineCoverSource(parseRoutineFocus(routine.routineFocus), null)}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(20,19,18,0)', 'rgba(20,19,18,.88)']}
          locations={[0.2, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.routineCoverText}>
          <TextV2 variant="eyebrow" color="#C9C6C0">
            {plural(t, 'coach.days.perWeek.one', 'coach.days.perWeek.other', routine.days.length)}
          </TextV2>
          <TextV2 variant="title24" color="#FFFFFF" numberOfLines={2}>
            {routine.title}
          </TextV2>
        </View>
      </View>
      <View style={styles.routineBody}>
        <View style={styles.dayRow}>
          {ISO_DAYS.map(iso => (
            <DayPill key={iso} label={dayLetter(language, iso)} on={days.has(iso)} size={40} />
          ))}
        </View>
        <TextV2 variant="body" tone="secondary">
          {[since, length].filter(Boolean).join(' · ')}
        </TextV2>
        {routine.note ? (
          <View style={[styles.note, { backgroundColor: colors.surface.muted }]}>
            <Eyebrow>{t('coach.detail.yourNote')}</Eyebrow>
            <TextV2 variant="bodyL">{routine.note}</TextV2>
          </View>
        ) : null}
        <View style={styles.actions}>
          <Button label={t('coach.detail.change')} icon={ArrowLeftRight} variant="secondary" size="md" onPress={onChange} style={styles.flex} />
          <Button
            label={t('coach.detail.editCopy')}
            icon={Pencil}
            variant="secondary"
            size="md"
            disabled={!routine.studentTemplateId}
            onPress={onEditCopy}
            style={styles.flex}
          />
        </View>
        <Button label={t('coach.detail.endRoutine')} variant="text" size="sm" onPress={onEnd} />
      </View>
    </View>
  );
}

// ── Nutrition ───────────────────────────────────────────────────────────────

function NutritionBlock({
  detail,
  t,
  language,
  name,
  onAssign,
}: {
  detail: CoachStudentDetail;
  t: CoachT;
  language: EllieLanguage;
  name: string;
  onAssign: () => void;
}) {
  const { fonts } = useThemeV2();
  const nutrition = detail.nutrition;
  const assignment: CoachNutritionAssignment | null = nutrition.locked ? null : nutrition.assignment;
  const live = assignment && assignment.status !== 'replaced' && assignment.status !== 'ended' ? assignment : null;
  const chip = nutrition.locked ? null : live?.status === 'accepted' ? (
    <StatusChip label={t('coach.detail.nutrition.accepted')} tone="sage" />
  ) : live?.status === 'pending' ? (
    <StatusChip label={t('coach.detail.nutrition.pending')} tone="ember" />
  ) : live?.status === 'declined' ? (
    <StatusChip label={t('coach.detail.nutrition.declined')} tone="muted" />
  ) : (
    <StatusChip label={t('coach.detail.nutrition.none')} tone="muted" />
  );

  return (
    <View style={styles.block}>
      <SectionTitle title={t('coach.detail.nutrition')} trailing={chip} />
      {nutrition.locked ? (
        <LockedBlock title={t('coach.detail.locked')} body={t('coach.detail.locked.nutrition', { name })} />
      ) : live ? (
        <Card>
          <View style={styles.kcalRow}>
            <TextV2 style={antonStyle(fonts.display, 52)}>{formatKcal(language, live.train.kcal)}</TextV2>
            <TextV2 variant="body" tone="secondary">
              {live.mode === 'train_rest' ? t('coach.dayType.train') : t('coach.kcalDay')}
            </TextV2>
          </View>
          <View style={styles.macros}>
            {(['protein', 'carbs', 'fat'] as const).map(key => (
              <View key={key} style={styles.flex}>
                <TextV2 variant="body" tone="secondary">
                  {t(key === 'protein' ? 'coach.macro.protein' : key === 'carbs' ? 'coach.macro.carbs' : 'coach.macro.fat')}
                </TextV2>
                <TextV2 variant="title22">{`${Math.round(live.train[key])} g`}</TextV2>
                <TextV2 variant="body" tone="secondary">
                  {`${macroPct(live.train, key)} %`}
                </TextV2>
              </View>
            ))}
          </View>
          <TextV2 variant="body" tone="secondary">
            {live.mode === 'train_rest'
              ? `${t('coach.mode.trainRest')} · ${t('coach.dayType.rest').toLowerCase()} ${formatKcal(language, live.rest.kcal)} kcal`
              : t('coach.mode.same')}
          </TextV2>
          <Button label={t('coach.detail.nutrition.edit')} variant="secondary" size="md" onPress={onAssign} />
        </Card>
      ) : (
        <Card>
          <TextV2 variant="body" tone="secondary">
            {t('coach.detail.nutrition.noPlan')}
          </TextV2>
          <Button label={t('coach.detail.nutrition.assign')} size="md" onPress={onAssign} />
        </Card>
      )}
    </View>
  );
}

// ── Weight & sleep ──────────────────────────────────────────────────────────

function BodyBlock({ detail, t, name }: { detail: CoachStudentDetail; t: CoachT; name: string }) {
  const { fonts } = useThemeV2();
  const body = detail.body;
  return (
    <View style={styles.block}>
      <SectionTitle title={t('coach.detail.body')} />
      {body.locked ? (
        <LockedBlock title={t('coach.detail.locked')} body={t('coach.detail.locked.body', { name })} />
      ) : (
        <View style={styles.bodyRow}>
          <Card style={styles.flex}>
            <TextV2 variant="body" tone="secondary">
              {t('coach.detail.weight')}
            </TextV2>
            {body.weight?.current != null ? (
              <>
                <TextV2 style={antonStyle(fonts.display, 36)}>{`${body.weight.current.toFixed(1)} kg`}</TextV2>
                {body.weight.change != null ? (
                  <TextV2 variant="meta" color={body.weight.change <= 0 ? SAGE : undefined} tone="secondary">
                    {t('coach.detail.weight.trend', {
                      change: `${body.weight.change > 0 ? '+' : ''}${body.weight.change.toFixed(1)}`,
                    })}
                  </TextV2>
                ) : null}
              </>
            ) : (
              <TextV2 variant="bodyStrong">{t('coach.detail.weight.none')}</TextV2>
            )}
          </Card>
          <Card style={styles.flex}>
            <TextV2 variant="body" tone="secondary">
              {t('coach.detail.sleep')}
            </TextV2>
            {body.sleep?.avgHours != null ? (
              <>
                <TextV2 style={antonStyle(fonts.display, 36)}>{`${body.sleep.avgHours.toFixed(1)} h`}</TextV2>
                <TextV2 variant="meta" tone="secondary">
                  {t('coach.detail.sleep.avg')}
                </TextV2>
              </>
            ) : (
              <TextV2 variant="bodyStrong">{t('coach.detail.weight.none')}</TextV2>
            )}
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 10 },
  skeleton: { gap: 22 },
  skeletonHead: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  block: { gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weekHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 10, flex: 1 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  planned: { borderWidth: 1.5 },
  dash: { width: 14, height: 2, borderRadius: 1 },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendCount: { marginLeft: 'auto' },
  lastCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rating: { alignItems: 'flex-end', gap: 6 },
  routineCard: { borderRadius: 24, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  routineCover: { height: 150, backgroundColor: '#141312', justifyContent: 'flex-end' },
  routineCoverText: { padding: 18, gap: 4 },
  routineBody: { padding: 18, gap: 14 },
  dayRow: { flexDirection: 'row', gap: 6 },
  note: { borderRadius: 16, padding: 16, gap: 6 },
  actions: { flexDirection: 'row', gap: 10 },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  macros: { flexDirection: 'row', gap: 12 },
  listCard: { gap: 0, paddingVertical: 4 },
  discomfort: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  bodyRow: { flexDirection: 'row', gap: 12 },
});
