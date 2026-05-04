import {Check, Flame, RotateCcw, Trophy} from 'lucide-react-native';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Button, Card, CircularProgress} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {Core33State} from '@app/services/supabase/core33';

type Core33TrackerViewProps = {
  state: Core33State;
  onToggleHabit: (habitIndex: number) => void;
  onRestart: () => void;
  toggling?: boolean;
  restarting?: boolean;
};

const categoryLabels: Record<string, string> = {
  training: 'Entrenamiento',
  health: 'Salud',
  mind: 'Mentalidad',
};

export function Core33TrackerView({
  state,
  onToggleHabit,
  onRestart,
  toggling = false,
  restarting = false,
}: Core33TrackerViewProps) {
  const {theme} = useAppTheme();
  const challenge = state.challenge;

  if (!challenge) {
    return null;
  }

  const challengeCompleted = challenge.status === 'completed';

  const styles = StyleSheet.create({
    wrap: {
      gap: 16,
    },
    heroCard: {
      padding: 18,
      borderRadius: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    heroCopy: {
      flex: 1,
      gap: 8,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 22,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.6,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 20,
    },
    progressRail: {
      height: 6,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceMuted,
    },
    progressFill: {
      height: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.accent,
    },
    progressMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    progressMetaLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
    timelineCard: {
      padding: 14,
      borderRadius: 24,
      gap: 12,
    },
    sectionLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    timelineRow: {
      gap: 6,
      paddingRight: 4,
    },
    timelineItem: {
      gap: 6,
      alignItems: 'center',
    },
    timelineDot: {
      width: 28,
      height: 28,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    timelineDotPartial: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    timelineDotFull: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    timelineDotCurrent: {
      borderColor: theme.colors.textPrimary,
      borderWidth: 1,
    },
    timelineLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      textAlign: 'center',
    },
    timelineLabelActive: {
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.weights.semibold,
    },
    habitsSection: {
      gap: 10,
    },
    habitsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    habitsTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 18,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.4,
    },
    habitsCount: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    habitItem: {
      padding: 16,
      borderRadius: 22,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    habitCheck: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    habitCheckDone: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    habitCopy: {
      flex: 1,
      gap: 2,
    },
    habitCategory: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    habitName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 20,
    },
    habitDoneState: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
    successCard: {
      padding: 16,
      borderRadius: 24,
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.surfaceMuted,
    },
    successTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.bold,
    },
    successText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    statCard: {
      flex: 1,
      padding: 14,
      borderRadius: 22,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    statIcon: {
      width: 34,
      height: 34,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 18,
      fontWeight: theme.typography.weights.bold,
    },
    statLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
    footerText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
    },
  });

  return (
    <View style={styles.wrap}>
      <Card style={styles.heroCard}>
        <CircularProgress
          value={challenge.overallPct}
          size={88}
          strokeWidth={6}
          label={`${challenge.overallPct}%`}
        />
        <View style={styles.heroCopy}>
          <Text style={styles.title}>
            {challengeCompleted ? 'Core 33 completado' : 'Core · 33'}
          </Text>
          <Text style={styles.subtitle}>
            {challengeCompleted
              ? `Cerraste 33 días con ${challenge.completedDays} días completos.`
              : `Día ${challenge.challengeDay} de 33 · ${challenge.completedToday}/${challenge.totalHabits} hábitos hoy.`}
          </Text>
          <View style={styles.progressRail}>
            <View
              style={[
                styles.progressFill,
                {width: `${challenge.progressPct}%`},
              ]}
            />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.progressMetaLabel}>
              {challenge.progressPct}% del reto
            </Text>
            <Text style={styles.progressMetaLabel}>
              {challenge.completedDays} días cerrados
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.timelineCard}>
        <Text style={styles.sectionLabel}>Línea de progreso</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timelineRow}>
          {state.timeline.map(day => {
            const full = day.status === 'full';
            const partial = day.status === 'partial';
            return (
              <View key={day.day} style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineDot,
                    partial ? styles.timelineDotPartial : null,
                    full ? styles.timelineDotFull : null,
                    day.isCurrent ? styles.timelineDotCurrent : null,
                  ]}>
                  {full ? (
                    <Check
                      color={theme.colors.accentContrast}
                      size={12}
                      strokeWidth={2.8}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.timelineLabel,
                        day.isCurrent ? styles.timelineLabelActive : null,
                      ]}>
                      {day.day}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.timelineLabel,
                    day.isCurrent ? styles.timelineLabelActive : null,
                  ]}>
                  {day.day}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </Card>

      <View style={styles.habitsSection}>
        <View style={styles.habitsHeader}>
          <Text style={styles.habitsTitle}>
            {challengeCompleted ? 'Hábitos completados' : 'Hábitos de hoy'}
          </Text>
          <Text style={styles.habitsCount}>
            {state.todayLogs.filter(Boolean).length}/{challenge.totalHabits}
          </Text>
        </View>

        {challenge.habits.map((habit, index) => {
          const done = state.todayLogs[index] || false;
          return (
            <Pressable
              key={habit.id}
              disabled={challengeCompleted || toggling}
              onPress={() => onToggleHabit(index)}
              style={({pressed}) => [pressed ? {opacity: 0.92} : null]}>
              <Card style={styles.habitItem}>
                <View
                  style={[
                    styles.habitCheck,
                    done ? styles.habitCheckDone : null,
                  ]}>
                  {done ? (
                    <Check
                      color={theme.colors.accentContrast}
                      size={15}
                      strokeWidth={2.6}
                    />
                  ) : null}
                </View>

                <View style={styles.habitCopy}>
                  <Text style={styles.habitCategory}>
                    {categoryLabels[habit.category] || 'Hábito'}
                  </Text>
                  <Text style={styles.habitName}>{habit.name}</Text>
                  <Text style={styles.habitDoneState}>
                    {done ? 'Completado hoy' : 'Pendiente'}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      {state.todayLogs.length > 0 && state.todayLogs.every(Boolean) ? (
        <Card style={styles.successCard}>
          <Text style={styles.successTitle}>Todo listo por hoy</Text>
          <Text style={styles.successText}>
            Cerraste tu día de Core 33. Mantén la racha y vuelve mañana.
          </Text>
        </Card>
      ) : null}

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <View style={styles.statIcon}>
            <Flame
              color={theme.colors.textPrimary}
              size={16}
              strokeWidth={2.1}
            />
          </View>
          <View>
            <Text style={styles.statValue}>{challenge.currentStreak}</Text>
            <Text style={styles.statLabel}>Racha actual</Text>
          </View>
        </Card>
        <Card style={styles.statCard}>
          <View style={styles.statIcon}>
            <Trophy
              color={theme.colors.textPrimary}
              size={16}
              strokeWidth={2.1}
            />
          </View>
          <View>
            <Text style={styles.statValue}>{challenge.longestStreak}</Text>
            <Text style={styles.statLabel}>Mejor racha</Text>
          </View>
        </Card>
      </View>

      <Text style={styles.footerText}>
        {challengeCompleted
          ? 'Terminaste el reto. Puedes revisarlo completo o empezar una nueva versión.'
          : 'Completa tus 3 hábitos de hoy para mantener la disciplina.'}
      </Text>

      <Button
        label={challengeCompleted ? 'Empezar otra vez' : 'Reiniciar reto'}
        onPress={onRestart}
        loading={restarting}
        variant="secondary"
        accessoryRight={
          <RotateCcw
            color={theme.colors.textPrimary}
            size={15}
            strokeWidth={2.1}
          />
        }
        style={{borderRadius: theme.radii.pill}}
      />
    </View>
  );
}
