import {Clock3, Dumbbell, Flame, Play} from 'lucide-react-native';
import {StyleSheet, Text, View} from 'react-native';
import {Button, Card, CircularProgress} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {WorkoutSession} from '@app/shared';

type TodayWorkoutCardProps = {
  session: WorkoutSession | null;
  onPress: () => void;
};

export function TodayWorkoutCard({session, onPress}: TodayWorkoutCardProps) {
  const {theme} = useAppTheme();
  const status = session?.status ?? 'idle';
  const completedCount = session?.completedExercises.length || 0;
  const totalExercises = session?.totalExercises || completedCount || 0;
  const progressPct =
    totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

  const styles = StyleSheet.create({
    card: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.semibold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 18,
    },
    hint: {
      color: '#9A978F',
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    content: {
      flex: 1,
      gap: 4,
    },
    summaryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    summaryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    summaryLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
    },
    filledButton: {
      minHeight: 44,
      borderRadius: theme.radii.pill,
    },
    outlineButton: {
      minHeight: 42,
      borderRadius: theme.radii.pill,
    },
  });

  if (!session || (status !== 'in_progress' && status !== 'completed' && status !== 'canceled')) {
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.content}>
            <Text style={styles.title}>Entrenamiento de hoy</Text>
            <Text style={styles.subtitle}>Aún no has entrenado hoy.</Text>
            <Text style={styles.hint}>
              Estás a una sesión de un mejor día. ¿Listo para entrenar?
            </Text>
          </View>
          <CircularProgress value={0} label="0%" size={64} strokeWidth={5} />
        </View>
        <Button
          label="Elegir un entreno"
          onPress={onPress}
          style={styles.filledButton}
          accessoryRight={
            <Dumbbell
              color={theme.colors.accentContrast}
              size={16}
              strokeWidth={2.2}
            />
          }
        />
      </Card>
    );
  }

  if (status === 'completed') {
    return (
      <Card
        style={[styles.card, {backgroundColor: theme.colors.surface}]}>
        <View style={styles.row}>
          <View style={styles.content}>
            <Text style={styles.title}>Entrenamiento completado</Text>
            <Text style={[styles.subtitle, {color: theme.colors.textPrimary}]}>
              {session.workoutTitle}
            </Text>
            <Text style={styles.hint}>
              Ya cerraste tu sesión de hoy. Buen trabajo.
            </Text>
          </View>
          <CircularProgress value={100} label="100%" size={64} strokeWidth={5} />
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Clock3 color={theme.colors.textSecondary} size={14} />
            <Text style={styles.summaryLabel}>{session.duration} min</Text>
          </View>
          <View style={styles.summaryItem}>
            <Flame color={theme.colors.textSecondary} size={14} />
            <Text style={styles.summaryLabel}>
              {session.caloriesBurned || 0} kcal
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Dumbbell color={theme.colors.textSecondary} size={14} />
            <Text style={styles.summaryLabel}>
              {completedCount} de {totalExercises} ejercicios
            </Text>
          </View>
        </View>
        <Button
          label="Ver sesión"
          variant="outline"
          onPress={onPress}
          style={styles.outlineButton}
        />
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.content}>
          <Text style={styles.title}>Entrenamiento de hoy</Text>
          <Text style={[styles.subtitle, {color: theme.colors.textPrimary}]}>
            {session.workoutTitle}
          </Text>
          <Text style={styles.hint}>
            {status === 'in_progress'
              ? `En progreso · ${completedCount} de ${totalExercises} ejercicios`
              : `Sesión guardada · ${completedCount} de ${totalExercises} ejercicios`}
          </Text>
        </View>
        <CircularProgress
          value={progressPct}
          label={`${progressPct}%`}
          size={64}
          strokeWidth={5}
        />
      </View>
      <Button
        label={status === 'canceled' ? 'Reanudar sesión' : 'Continuar entreno'}
        onPress={onPress}
        style={styles.filledButton}
        accessoryRight={
          <Play
            color={theme.colors.accentContrast}
            size={16}
            strokeWidth={2.2}
          />
        }
      />
    </Card>
  );
}
