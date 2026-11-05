import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChevronRight, UserPlus, Users } from 'lucide-react-native';
import {
  Button,
  PressableScale,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { useCoachText } from '@app/features/coach/coachCopy';
import { coachErrorMessage, plural, relativeDays } from '@app/features/coach/coachModel';
import { useCoachStudents } from '@app/features/coach/useCoach';
import {
  CoachAvatar,
  Notice,
  ProgressLine,
  SCENE,
  antonStyle,
} from '@app/features/coach/v2/CoachParts';
import { InviteSheet } from '@app/features/coach/v2/InviteSheet';
import { BlockError } from '@app/features/home/v2/BlockError';
import type { CoachStudentItem, CoachStudentList } from '@app/services/coach/coachService';

// Mis alumnos (§30.3): title + "Invitar alumno", the dark block of figures
// with the beta occupancy, and the list "Alumnos · Semana actual" with the
// week's adherence and its notices. Used by the coach's Entrenos segment and
// by the CoachStudents screen. `showTitle`: the big title (the screen); in
// Entrenos the tab already says where you are.
export function CoachStudentsView({
  showTitle,
  onOpenStudent,
}: {
  showTitle: boolean;
  onOpenStudent: (student: CoachStudentItem) => void;
}) {
  const { t, language } = useCoachText();
  const query = useCoachStudents();
  const [inviteOpen, setInviteOpen] = useState(false);
  const data = query.data ?? null;
  const full = data ? data.stats.students >= data.stats.max : false;

  const header = (
    <View style={styles.header}>
      <View style={styles.flex}>
        {showTitle ? (
          <TextV2 variant="title28" accessibilityRole="header">
            {t('coach.students.title')}
          </TextV2>
        ) : null}
        <TextV2 variant={showTitle ? 'body' : 'bodyStrong'} tone="secondary">
          {t('coach.students.subtitle')}
        </TextV2>
      </View>
      <Button
        label={t('coach.students.invite')}
        icon={UserPlus}
        size="md"
        disabled={!data || full}
        onPress={() => setInviteOpen(true)}
      />
    </View>
  );

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
  } else if (!data) {
    body = (
      <SkeletonGroup>
        <View style={styles.skeleton}>
          <Skeleton height={190} radius={26} />
          <Skeleton width={140} height={22} radius={11} />
          {[0, 1, 2].map(index => (
            <View key={index} style={styles.skeletonRow}>
              <Skeleton width={56} height={56} radius={28} />
              <View style={styles.flexGap}>
                <Skeleton width="60%" height={16} />
                <Skeleton width="40%" height={12} />
                <Skeleton height={4} />
              </View>
            </View>
          ))}
        </View>
      </SkeletonGroup>
    );
  } else {
    body = (
      <>
        <StatsBlock data={data} />
        {data.students.length === 0 ? (
          <Empty onInvite={() => setInviteOpen(true)} disabled={full} />
        ) : (
          <View style={styles.list}>
            <View style={styles.listHeader}>
              <TextV2 variant="section" accessibilityRole="header">
                {t('coach.list.title')}
              </TextV2>
              <TextV2 variant="body" tone="secondary">
                {t('coach.list.week')}
              </TextV2>
            </View>
            {data.students.map((student, index) => (
              <StudentRow
                key={student.linkId}
                student={student}
                last={index === data.students.length - 1}
                onPress={() => onOpenStudent(student)}
              />
            ))}
          </View>
        )}
      </>
    );
  }

  return (
    <View style={styles.root}>
      {header}
      {body}
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </View>
  );
}

function StatsBlock({ data }: { data: CoachStudentList }) {
  const { fonts, colors } = useThemeV2();
  const { t } = useCoachText();
  const { students, max, withRoutine, withNutrition } = data.stats;
  const left = Math.max(0, max - students);
  return (
    <View style={[styles.stats, { backgroundColor: SCENE }]}>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <View style={styles.statFigure}>
            <TextV2 color="#FFFFFF" style={antonStyle(fonts.display, 52)}>
              {String(students)}
            </TextV2>
            <TextV2 color="#8E8B85" style={antonStyle(fonts.display, 26)}>
              {`/${max}`}
            </TextV2>
          </View>
          <TextV2 variant="body" color="#A8A6A1">
            {t('coach.stats.students')}
          </TextV2>
        </View>
        <View style={styles.stat}>
          <TextV2 color="#FFFFFF" style={antonStyle(fonts.display, 52)}>
            {String(withRoutine)}
          </TextV2>
          <TextV2 variant="body" color="#A8A6A1">
            {t('coach.stats.withRoutine')}
          </TextV2>
        </View>
        <View style={styles.stat}>
          <TextV2 color="#FFFFFF" style={antonStyle(fonts.display, 52)}>
            {String(withNutrition)}
          </TextV2>
          <TextV2 variant="body" color="#A8A6A1">
            {t('coach.stats.withNutrition')}
          </TextV2>
        </View>
      </View>
      <View style={[styles.occupancy, { backgroundColor: '#2A2826' }]}>
        <View
          style={[
            styles.occupancyFill,
            { width: `${max > 0 ? Math.min(100, (students / max) * 100) : 0}%`, backgroundColor: colors.ember.base },
          ]}
        />
      </View>
      <TextV2 variant="body" color="#A8A6A1">
        {left === 0
          ? t('coach.stats.full', { max })
          : plural(t, 'coach.stats.left.one', 'coach.stats.left.other', left)}
      </TextV2>
    </View>
  );
}

function Empty({ onInvite, disabled }: { onInvite: () => void; disabled: boolean }) {
  const { colors } = useThemeV2();
  const { t } = useCoachText();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface.muted }]}>
        <Users size={26} color={colors.text.primary} strokeWidth={1.8} />
      </View>
      <TextV2 variant="title22" align="center">
        {t('coach.empty.title')}
      </TextV2>
      <TextV2 variant="body" tone="secondary" align="center">
        {t('coach.empty.body')}
      </TextV2>
      <Button label={t('coach.students.invite')} icon={UserPlus} size="md" disabled={disabled} onPress={onInvite} />
    </View>
  );
}

function StudentRow({
  student,
  last,
  onPress,
}: {
  student: CoachStudentItem;
  last: boolean;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();
  const { t, language } = useCoachText();
  const pending = student.status === 'pending' || student.flags.includes('invite_pending');
  const ended = student.status === 'ended';
  const inactive = !pending && !ended && student.flags.includes('inactive_7d');
  const nutritionPending = !pending && !ended && student.nutritionStatus === 'pending';
  const { done, planned } = student.week;
  const pct = planned > 0 ? Math.round((done / planned) * 100) : 0;
  const meta = student.routine
    ? `${student.routine.title} · ${plural(t, 'coach.days.perWeek.one', 'coach.days.perWeek.other', student.routine.daysPerWeek)}`
    : t('coach.list.noRoutine');

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${student.name}. ${meta}`}
      onPress={onPress}
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
        ended && styles.ended,
      ]}
    >
      <CoachAvatar name={student.name} avatar={student.avatar} size={56} ring={inactive} outline={pending} />
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <TextV2 variant="sub" numberOfLines={1} style={styles.flex}>
            {student.name}
          </TextV2>
          {!pending && !ended ? (
            <TextV2 variant="metaStrong" tone="secondary">
              {`${pct} %`}
            </TextV2>
          ) : null}
        </View>
        {pending ? (
          <>
            {student.inviteCreatedAt ? (
              <TextV2 variant="body" tone="secondary">
                {t('coach.list.inviteSent', { when: relativeDays(language, student.inviteCreatedAt) })}
              </TextV2>
            ) : null}
            <Notice label={t('coach.list.invitePending')} />
          </>
        ) : ended ? (
          <>
            <TextV2 variant="body" tone="secondary">
              {t('coach.list.endedBody')}
            </TextV2>
            <Notice label={t('coach.list.ended')} />
          </>
        ) : (
          <>
            <TextV2 variant="body" tone="secondary" numberOfLines={1}>
              {meta}
            </TextV2>
            <View style={styles.progress}>
              <ProgressLine ratio={planned > 0 ? done / planned : 0} ember={inactive} />
              <TextV2 variant="metaStrong">{t('coach.list.sessions', { done, planned })}</TextV2>
            </View>
            {inactive ? (
              <Notice strong label={t('coach.list.inactive', { n: student.daysInactive ?? 7 })} />
            ) : null}
            {nutritionPending ? <Notice label={t('coach.list.nutritionPending')} /> : null}
          </>
        )}
      </View>
      <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { gap: 24 },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeleton: { gap: 18 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stats: { borderRadius: 26, padding: 22, gap: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 2 },
  statFigure: { flexDirection: 'row', alignItems: 'baseline' },
  occupancy: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  occupancyFill: { height: 4, borderRadius: 2 },
  list: { gap: 2 },
  listHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  ended: { opacity: 0.5 },
  rowMain: { flex: 1, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 24, paddingHorizontal: 12 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
