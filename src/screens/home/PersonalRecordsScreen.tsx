import {StyleSheet, Text, View} from 'react-native';
import {AppHeader, ScreenContainer} from '@app/components';
import {EmptyState, Loader} from '@app/components/ui';
import {useExerciseLibrary} from '@app/hooks/useExerciseLibrary';
import {usePersonalRecords} from '@app/hooks/usePersonalRecords';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {formatPRValue} from '@app/shared';

export function PersonalRecordsScreen() {
  const {theme} = useAppTheme();
  const recordsQuery = usePersonalRecords();
  const exercisesQuery = useExerciseLibrary();

  const styles = StyleSheet.create({
    card: {
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    row: {
      paddingBottom: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      gap: 4,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
    },
    helper: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    rowLast: {
      paddingBottom: 0,
      borderBottomWidth: 0,
    },
  });

  if (recordsQuery.isLoading || exercisesQuery.isLoading) {
    return (
      <ScreenContainer>
        <Loader label="Cargando récords..." />
      </ScreenContainer>
    );
  }

  const records = recordsQuery.records;
  const exercises = exercisesQuery.data || [];
  const visibleRecords = records.slice(0, 12);

  return (
    <ScreenContainer scrollable>
      <AppHeader
        showBackButton
        title="Récords personales"
        subtitle="Tu historial de PRs y el punto de entrada al registro futuro."
      />

      {records.length === 0 ? (
        <EmptyState
          title="Aún no tienes PRs registrados"
          description="Cuando registres tu primer récord personal, aparecerá aquí con su historial."
        />
      ) : (
        <View style={styles.card}>
          {visibleRecords.map((record, index) => {
            const exercise = exercises.find(item => item.id === record.exerciseId);

            return (
              <View
                key={record.id}
                style={[
                  styles.row,
                  index === visibleRecords.length - 1 ? styles.rowLast : null,
                ]}>
                <Text style={styles.title}>{exercise?.name || 'Ejercicio'}</Text>
                <Text style={styles.subtitle}>{formatPRValue(record)}</Text>
                <Text style={styles.helper}>
                  {new Date(record.recordedAt).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {record.notes ? ` · ${record.notes}` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}
