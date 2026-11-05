import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Dumbbell, LogOut, Utensils, type LucideIcon } from 'lucide-react-native';
import {
  BackButton,
  Button,
  Eyebrow,
  GlassHeader,
  PressableScale,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { useCoachText } from '@app/features/coach/coachCopy';
import {
  capitalize,
  coachErrorMessage,
  daysLine,
  firstName,
  formatKcal,
  plural,
  shortDate,
} from '@app/features/coach/coachModel';
import { useCoachMutations, useMyCoach } from '@app/features/coach/useCoach';
import { CoachAvatar, ConfirmSheet } from '@app/features/coach/v2/CoachParts';
import { ShareRows } from '@app/features/coach/v2/ShareRows';
import { BlockError } from '@app/features/home/v2/BlockError';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'MyCoach'>;

// Perfil › Mi coach (§30.4): the coach and since when, what they assigned
// (routine → its detail; nutrition targets with their state), the three
// share switches (applied at once with student_update_shares) and
// "Desvincularme" with its confirmation.
export function MyCoachScreen({ navigation }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t, language } = useCoachText();
  const query = useMyCoach();
  const { updateShares, endMyLink } = useCoachMutations();
  const [confirm, setConfirm] = useState(false);
  const data = query.data ?? null;
  const [shares, setShares] = useState({ nutrition: false, body: false });
  const back = () => safeGoBack(navigation, [ROOT_ROUTES.MainTabs]);

  useEffect(() => {
    if (data) {
      setShares({ nutrition: data.shares.nutrition, body: data.shares.body });
    }
  }, [data]);

  const coachName = data?.coach?.name ?? '';
  const coachFirst = firstName(coachName);

  const changeShares = (next: { nutrition: boolean; body: boolean }) => {
    const previous = shares;
    setShares(next);
    updateShares.mutate(
      { shareNutrition: next.nutrition, shareBody: next.body },
      {
        onError: () => {
          setShares(previous);
          toast.show(t('coach.mine.shares.failed'), { tone: 'error' });
        },
      },
    );
  };

  const unlink = () =>
    endMyLink.mutate(undefined, {
      onSuccess: () => {
        setConfirm(false);
        toast.show(t('coach.mine.unlinked', { name: coachName }));
        back();
      },
      onError: error => {
        setConfirm(false);
        toast.show(coachErrorMessage(error, language), { tone: 'error' });
      },
    });

  let body;
  if (query.isError) {
    body = <BlockError message={t('coach.loadError')} onRetry={() => query.refetch().catch(() => undefined)} />;
  } else if (!data) {
    body = (
      <SkeletonGroup>
        <View style={styles.skeleton}>
          <View style={styles.head}>
            <Skeleton width={88} height={88} radius={44} />
            <View style={styles.flexGap}>
              <Skeleton width="70%" height={26} />
              <Skeleton width="50%" height={14} />
            </View>
          </View>
          <Skeleton height={140} radius={20} />
          <Skeleton height={300} radius={24} />
        </View>
      </SkeletonGroup>
    );
  } else if (!data.coach) {
    body = (
      <View style={styles.none}>
        <TextV2 variant="bodyL" tone="secondary">
          {t('coach.mine.none')}
        </TextV2>
        <Button label={t('coach.profile.join')} onPress={() => navigation.replace(APP_ROUTES.CoachJoin)} />
      </View>
    );
  } else {
    const routine = data.routineAssignment;
    const nutrition = data.nutritionAssignment;
    const nutritionLine = !shares.nutrition
      ? { text: t('coach.mine.nutrition.notShared'), ember: false }
      : nutrition?.status === 'pending'
      ? { text: t('coach.mine.nutrition.pending'), ember: true }
      : nutrition?.status === 'accepted'
      ? { text: t('coach.mine.nutrition.active', { kcal: formatKcal(language, nutrition.train.kcal) }), ember: false }
      : { text: t('coach.mine.nutrition.none'), ember: false };

    body = (
      <>
        <View style={styles.head}>
          <CoachAvatar name={coachName} avatar={data.coach.avatar} size={88} ring dark />
          <View style={styles.flex}>
            <TextV2 variant="title28" numberOfLines={2}>
              {coachName}
            </TextV2>
            {data.since ? (
              <TextV2 variant="bodyL" tone="secondary">
                {t('coach.mine.since', { date: shortDate(language, data.since) })}
              </TextV2>
            ) : null}
          </View>
        </View>

        <View style={styles.block}>
          <Eyebrow>{t('coach.mine.assignedBy', { name: coachFirst })}</Eyebrow>
          <View>
            <AssignedRow
              icon={Dumbbell}
              title={
                routine
                  ? `${routine.title} · ${plural(t, 'coach.days.perWeek.one', 'coach.days.perWeek.other', routine.days.length)}`
                  : t('coach.mine.noRoutine')
              }
              subtitle={
                routine
                  ? [
                      capitalize(daysLine(language, routine.days)),
                      routine.startDate ? t('coach.since', { date: shortDate(language, routine.startDate) }).toLowerCase() : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : t('coach.mine.noRoutine.sub', { name: coachFirst })
              }
              onPress={
                routine?.studentTemplateId
                  ? () => navigation.navigate(APP_ROUTES.WorkoutDetail, { workoutId: routine.studentTemplateId as string })
                  : undefined
              }
            />
            <AssignedRow
              icon={Utensils}
              title={t('coach.mine.nutrition')}
              subtitle={nutritionLine.text}
              emberSubtitle={nutritionLine.ember}
              onPress={shares.nutrition ? () => navigation.navigate(APP_ROUTES.NutritionPlan) : undefined}
            />
          </View>
        </View>

        <View style={styles.block}>
          <Eyebrow>{t('coach.mine.shares')}</Eyebrow>
          <ShareRows nutrition={shares.nutrition} body={shares.body} onChange={changeShares} />
          <TextV2 variant="body" tone="secondary">
            {t('coach.mine.shares.note', { name: coachFirst })}
          </TextV2>
        </View>

        <PressableScale
          accessibilityRole="button"
          onPress={() => setConfirm(true)}
          style={[styles.unlink, { backgroundColor: colors.surface.muted }]}
        >
          <LogOut size={20} color={colors.text.primary} strokeWidth={1.8} />
          <TextV2 variant="cta" tone="ember">
            {t('coach.mine.unlink')}
          </TextV2>
        </PressableScale>
      </>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader title={t('coach.mine.title')} left={<BackButton onPress={back} />} />
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
        open={confirm}
        title={t('coach.mine.unlink.title', { name: coachFirst })}
        body={t('coach.mine.unlink.body')}
        confirmLabel={t('coach.mine.unlink')}
        cancelLabel={t('coach.cancel')}
        loading={endMyLink.isPending}
        onConfirm={unlink}
        onClose={() => setConfirm(false)}
      />
    </View>
  );
}

function AssignedRow({
  icon: Icon,
  title,
  subtitle,
  emberSubtitle = false,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  emberSubtitle?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useThemeV2();
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: colors.surface.muted }]}>
        <Icon size={20} color={colors.text.primary} strokeWidth={1.8} />
      </View>
      <View style={styles.flex}>
        <TextV2 variant="sub" numberOfLines={2}>
          {title}
        </TextV2>
        <TextV2 variant="body" tone={emberSubtitle ? 'ember' : 'secondary'}>
          {subtitle}
        </TextV2>
      </View>
      {onPress ? <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2} /> : null}
    </>
  );
  const style = [styles.row, { borderBottomColor: colors.divider }];
  return onPress ? (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`} onPress={onPress} style={style}>
      {content}
    </PressableScale>
  ) : (
    <View style={style}>{content}</View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 10 },
  skeleton: { gap: 24 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  block: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  unlink: { height: 60, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  none: { gap: 16, paddingTop: 12 },
});
