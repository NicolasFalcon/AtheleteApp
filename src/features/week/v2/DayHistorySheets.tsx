import { StyleSheet, View } from 'react-native';
import {
  Check,
  ChevronRight,
  Droplet,
  Moon,
  Utensils,
} from 'lucide-react-native';
import {
  PressableScale,
  Sheet,
  Skeleton,
  SkeletonGroup,
  TextV2,
  haptics,
  useThemeV2,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { clock, sleepDuration } from '@app/features/sleep/sleepModel';
import { useDayHistoryText } from '@app/features/week/dayHistoryCopy';
import { useDaySummary } from '@app/features/week/useDayHistory';
import type { DaySession } from '@app/services/supabase/session';

// Tu semana · several sessions on a past day: a short list ordered by start
// time; each one opens its summary.
export function DaySessionsSheet({
  open,
  title,
  sessions,
  onClose,
  onOpenSession,
}: {
  open: boolean;
  title: string;
  sessions: DaySession[];
  onClose: () => void;
  onOpenSession: (sessionId: string) => void;
}) {
  const { colors } = useThemeV2();
  const { t } = useDayHistoryText();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={title}
      title={t('day.sessionsTitle')}
    >
      <View>
        {sessions.map((session, index) => (
          <PressableScale
            key={session.id}
            accessibilityRole="button"
            onPress={() => {
              haptics.light();
              onOpenSession(session.id);
            }}
            style={[
              styles.row,
              index > 0
                ? {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.divider,
                  }
                : null,
            ]}
          >
            <View style={styles.rowTexts}>
              <TextV2 variant="bodyStrong" numberOfLines={2}>
                {session.title}
              </TextV2>
              <TextV2 variant="meta" tone="secondary">
                {[
                  session.startedAt ? clock(session.startedAt) : null,
                  session.durationMin > 0
                    ? t('day.session.minutes', { n: session.durationMin })
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </TextV2>
            </View>
            <ChevronRight
              size={18}
              color={colors.text.tertiary}
              strokeWidth={2}
            />
          </PressableScale>
        ))}
      </View>
    </Sheet>
  );
}

// Tu semana · a past day without a session (empty, rest or nothing done):
// Core 33, last night's sleep, nutrition and hydration. Only the blocks with
// real data; nothing at all → "Sin actividad registrada este día".
export function DaySummarySheet({
  date,
  title,
  onClose,
  onCore33,
}: {
  date: string | null;
  title: string;
  onClose: () => void;
  onCore33: (date: string) => void;
}) {
  const { colors } = useThemeV2();
  const { t } = useDayHistoryText();
  const { summary, loading, failed, empty, retry } = useDaySummary(date);

  return (
    <Sheet
      open={Boolean(date)}
      onClose={onClose}
      eyebrow={title}
      title={t('day.summaryTitle')}
      scrollable
    >
      {loading ? (
        <SkeletonGroup>
          <View style={styles.blocks}>
            <Skeleton height={56} radius={16} />
            <Skeleton height={56} radius={16} />
          </View>
        </SkeletonGroup>
      ) : failed ? (
        <BlockError message={t('day.error')} onRetry={retry} />
      ) : empty || !summary ? (
        <TextV2 variant="body" tone="secondary" style={styles.empty}>
          {t('day.empty')}
        </TextV2>
      ) : (
        <View style={styles.blocks}>
          {summary.core33 ? (
            <PressableScale
              accessibilityRole="button"
              onPress={() => {
                haptics.light();
                if (date) {
                  onCore33(date);
                }
              }}
              style={[styles.block, { backgroundColor: colors.surface.muted }]}
            >
              <View style={styles.blockHead}>
                <TextV2 variant="eyebrow" color={colors.text.secondary}>
                  {t('day.core33', { n: summary.core33.day })}
                </TextV2>
                <ChevronRight
                  size={16}
                  color={colors.text.tertiary}
                  strokeWidth={2}
                />
              </View>
              {summary.core33.habits.map(habit => (
                <View key={habit.name} style={styles.habit}>
                  <View
                    style={[
                      styles.habitDot,
                      habit.done
                        ? { backgroundColor: colors.ember.base }
                        : {
                            boxShadow: `inset 0 0 0 1.5px ${colors.outline.control}`,
                          },
                    ]}
                  >
                    {habit.done ? (
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    ) : null}
                  </View>
                  <TextV2
                    variant="body"
                    numberOfLines={2}
                    color={
                      habit.done ? colors.text.primary : colors.text.secondary
                    }
                    style={styles.flex1}
                    accessibilityLabel={`${habit.name}, ${
                      habit.done
                        ? t('day.core33.done')
                        : t('day.core33.notDone')
                    }`}
                  >
                    {habit.name}
                  </TextV2>
                </View>
              ))}
            </PressableScale>
          ) : null}

          {summary.sleep ? (
            <Fact
              icon={
                <Moon size={18} color={colors.text.secondary} strokeWidth={2} />
              }
              label={t('day.sleep')}
              value={sleepDuration(summary.sleep.durationMin)}
              detail={t('day.sleep.window', {
                bed: clock(summary.sleep.bedtimeAt),
                wake: clock(summary.sleep.wakeAt),
              })}
            />
          ) : null}

          {summary.nutrition ? (
            <Fact
              icon={
                <Utensils
                  size={18}
                  color={colors.text.secondary}
                  strokeWidth={2}
                />
              }
              label={t('day.nutrition')}
              value={`${summary.nutrition.kcal.toLocaleString('es-ES')} ${t(
                'day.nutrition.kcal',
              )}`}
              detail={
                summary.nutrition.proteinG !== null
                  ? `${summary.nutrition.proteinG} ${t(
                      'day.nutrition.protein',
                    )}`
                  : null
              }
            />
          ) : null}

          {summary.hydration ? (
            <Fact
              icon={
                <Droplet
                  size={18}
                  color={colors.text.secondary}
                  strokeWidth={2}
                />
              }
              label={t('day.hydration')}
              value={`${summary.hydration.ml.toLocaleString('es-ES')} ml`}
              detail={null}
            />
          ) : null}
        </View>
      )}
    </Sheet>
  );
}

function Fact({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string | null;
}) {
  const { colors } = useThemeV2();
  return (
    <View
      style={[
        styles.block,
        styles.fact,
        { backgroundColor: colors.surface.muted },
      ]}
    >
      {icon}
      <View style={styles.flex1}>
        <TextV2 variant="meta" tone="secondary">
          {label}
        </TextV2>
        {detail ? (
          <TextV2 variant="caption" tone="secondary">
            {detail}
          </TextV2>
        ) : null}
      </View>
      <TextV2 variant="bodyStrong">{value}</TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  rowTexts: { flex: 1, gap: 2 },
  blocks: { gap: 10, paddingBottom: 8 },
  block: { borderRadius: 18, padding: 16, gap: 10 },
  blockHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habit: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  habitDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  empty: { paddingVertical: 16 },
});
