import {useMemo, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ChevronRight, Trophy} from 'lucide-react-native';
import {AppHeader, ScreenContainer} from '@app/components';
import {Button, Card, Chip, EmptyState, Loader} from '@app/components/ui';
import {
  HOME_ROUTES,
  PROGRESS_ROUTES,
  WORKOUTS_ROUTES,
} from '@app/constants/routes';
import {PrHistoryList} from '@app/features/pr/components/PrHistoryList';
import {ProgressBarChart} from '@app/features/progress/components/ProgressBarChart';
import {useExerciseLibrary} from '@app/hooks/useExerciseLibrary';
import {usePersonalRecords} from '@app/hooks/usePersonalRecords';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {
  formatPRValue,
  getBestPR,
  getPRMainValue,
  prTypeLabels,
  type PersonalRecord,
  type PRType,
} from '@app/shared';
import type {
  HomeStackParamList,
  ProgressStackParamList,
  WorkoutsStackParamList,
} from '@app/types/navigation';

type Props =
  | NativeStackScreenProps<HomeStackParamList, 'PersonalRecords'>
  | NativeStackScreenProps<ProgressStackParamList, 'ProgressPersonalRecords'>
  | NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutPersonalRecords'>;

function formatHistoryDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
  });
}

export function PersonalRecordsScreen({navigation, route}: Props) {
  const {theme} = useAppTheme();
  const exerciseId = route.params?.exerciseId;
  const initialExerciseName = route.params?.exerciseName;
  const [activeType, setActiveType] = useState<PRType | null>(null);
  const recordsQuery = usePersonalRecords(exerciseId);
  const exercisesQuery = useExerciseLibrary();

  const styles = StyleSheet.create({
    summaryCard: {
      gap: theme.spacing.md,
    },
    summaryTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    summaryLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    summaryValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.titleSm,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.5,
    },
    summaryMeta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 20,
    },
    typeRail: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    chartShell: {
      gap: theme.spacing.sm,
    },
    chartTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    groupList: {
      gap: theme.spacing.md,
    },
    groupCard: {
      gap: theme.spacing.sm,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    groupTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
      flex: 1,
    },
    groupValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.semibold,
    },
    groupMeta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      lineHeight: 18,
    },
    groupFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    groupCount: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
  });

  const routeNames = navigation.getState().routeNames as string[];
  const registerRouteName = routeNames.includes(HOME_ROUTES.RegisterPr)
    ? HOME_ROUTES.RegisterPr
    : routeNames.includes(WORKOUTS_ROUTES.RegisterPr)
      ? WORKOUTS_ROUTES.RegisterPr
      : PROGRESS_ROUTES.RegisterPr;

  const allExercises = useMemo(() => exercisesQuery.data || [], [exercisesQuery.data]);
  const resolvedExerciseName =
    initialExerciseName ||
    allExercises.find(item => item.id === exerciseId)?.name ||
    'Ejercicio';

  const groupedRecords = useMemo(() => {
    const groups = new Map<
      string,
      {exerciseName: string; records: PersonalRecord[]; latest: PersonalRecord}
    >();

    recordsQuery.records.forEach(record => {
      const exerciseName =
        allExercises.find(item => item.id === record.exerciseId)?.name ||
        'Ejercicio';
      const current = groups.get(record.exerciseId);

      if (!current) {
        groups.set(record.exerciseId, {
          exerciseName,
          records: [record],
          latest: record,
        });
        return;
      }

      current.records.push(record);

      if (record.recordedAt.localeCompare(current.latest.recordedAt) > 0) {
        current.latest = record;
      }
    });

    return Array.from(groups.entries())
      .map(([key, value]) => ({
        exerciseId: key,
        exerciseName: value.exerciseName,
        records: value.records,
        latest: value.latest,
      }))
      .sort((left, right) =>
        right.latest.recordedAt.localeCompare(left.latest.recordedAt),
      );
  }, [allExercises, recordsQuery.records]);

  const types = useMemo(
    () => [...new Set(recordsQuery.records.map(record => record.prType))] as PRType[],
    [recordsQuery.records],
  );
  const resolvedType =
    activeType && types.includes(activeType)
      ? activeType
      : types[0] || 'weight_reps';
  const filteredRecords = useMemo(
    () =>
      [...recordsQuery.records]
        .filter(record => record.prType === resolvedType)
        .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt)),
    [recordsQuery.records, resolvedType],
  );
  const bestRecord = getBestPR(recordsQuery.records, resolvedType);
  const chartPoints = useMemo(
    () =>
      [...filteredRecords]
        .reverse()
        .map(record => ({
          id: record.id,
          label: formatHistoryDate(record.recordedAt),
          tooltipTitle: formatPRValue(record),
          tooltipLines: [
            new Date(record.recordedAt).toLocaleDateString('es-CL', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
            record.notes || prTypeLabels[record.prType],
          ],
          primaryValue: getPRMainValue(record),
        })),
    [filteredRecords],
  );

  const openRegister = () => {
    (navigation as any).navigate(registerRouteName, {
      exerciseId,
      exerciseName: resolvedExerciseName,
      showExercisePicker: !exerciseId,
    });
  };

  const openExerciseHistory = (nextExerciseId: string, nextExerciseName: string) => {
    (navigation as any).navigate(route.name, {
      exerciseId: nextExerciseId,
      exerciseName: nextExerciseName,
    });
  };

  const handleDelete = (recordId: string) => {
    Alert.alert(
      'Eliminar PR',
      'Esta marca se eliminará de tu historial. ¿Quieres continuar?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await recordsQuery.deleteRecord(recordId);
            } catch (error) {
              Alert.alert(
                'No pudimos eliminar el PR',
                error instanceof Error
                  ? error.message
                  : 'Inténtalo nuevamente.',
              );
            }
          },
        },
      ],
    );
  };

  if (recordsQuery.isLoading || exercisesQuery.isLoading) {
    return (
      <ScreenContainer>
        <Loader label="Cargando récords..." />
      </ScreenContainer>
    );
  }

  if (recordsQuery.records.length === 0) {
    return (
      <ScreenContainer scrollable>
        <AppHeader showBackButton title="Récords personales" backFallbacks={[
          HOME_ROUTES.Home,
          PROGRESS_ROUTES.Progress,
          WORKOUTS_ROUTES.Workouts,
        ]} />
        <EmptyState
          title="Aún no tienes PRs registrados"
          description="Registra tu primera marca para empezar a seguir progreso por ejercicio, ver mejores marcas y consultar tu historial."
        />
        <Button label="Registrar primer PR" onPress={openRegister} />
      </ScreenContainer>
    );
  }

  if (!exerciseId) {
    const latestRecord = recordsQuery.latestRecord;
    const latestExerciseName =
      latestRecord &&
      (allExercises.find(item => item.id === latestRecord.exerciseId)?.name ||
        'Ejercicio');

    return (
      <ScreenContainer scrollable>
        <AppHeader showBackButton title="Récords personales" backFallbacks={[
          HOME_ROUTES.Home,
          PROGRESS_ROUTES.Progress,
          WORKOUTS_ROUTES.Workouts,
        ]} />

        <Card style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summaryLabel}>PR más reciente</Text>
              <Text style={styles.summaryValue}>
                {latestRecord ? formatPRValue(latestRecord) : 'Sin datos'}
              </Text>
            </View>
            <Trophy color={theme.colors.textPrimary} size={22} strokeWidth={2} />
          </View>
          <Text style={styles.summaryMeta}>
            {latestRecord && latestExerciseName
              ? `${latestExerciseName} · ${new Date(
                  latestRecord.recordedAt,
                ).toLocaleDateString('es-CL', {
                  day: 'numeric',
                  month: 'short',
                })}`
              : 'Todavía no tienes marcas registradas.'}
          </Text>
          <Text style={styles.summaryMeta}>
            {groupedRecords.length} ejercicio
            {groupedRecords.length === 1 ? '' : 's'} con PRs y{' '}
            {recordsQuery.records.length} registro
            {recordsQuery.records.length === 1 ? '' : 's'} en total.
          </Text>
        </Card>

        <View style={styles.groupList}>
          {groupedRecords.map(group => (
            <Pressable
              key={group.exerciseId}
              onPress={() => openExerciseHistory(group.exerciseId, group.exerciseName)}
              style={({pressed}) => [pressed ? {opacity: 0.9} : null]}>
              <Card style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{group.exerciseName}</Text>
                  <ChevronRight
                    color={theme.colors.textSecondary}
                    size={16}
                    strokeWidth={2}
                  />
                </View>
                <Text style={styles.groupValue}>{formatPRValue(group.latest)}</Text>
                <View style={styles.groupFooter}>
                  <Text style={styles.groupMeta}>
                    Último registro {formatHistoryDate(group.latest.recordedAt)}
                  </Text>
                  <Text style={styles.groupCount}>
                    {group.records.length} PR{group.records.length === 1 ? '' : 's'}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>

        <Button label="Registrar nuevo PR" onPress={openRegister} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <AppHeader showBackButton title="Récords personales" backFallbacks={[
        HOME_ROUTES.Home,
        PROGRESS_ROUTES.Progress,
        WORKOUTS_ROUTES.Workouts,
      ]} />

      {bestRecord ? (
        <Card style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summaryLabel}>Mejor marca</Text>
              <Text style={styles.summaryValue}>{formatPRValue(bestRecord)}</Text>
            </View>
            <Trophy color={theme.colors.textPrimary} size={22} strokeWidth={2} />
          </View>
          <Text style={styles.summaryMeta}>
            {prTypeLabels[resolvedType]} ·{' '}
            {new Date(bestRecord.recordedAt).toLocaleDateString('es-CL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          {types.length > 1 ? (
            <View style={styles.typeRail}>
              {types.map(type => (
                <Chip
                  key={type}
                  selected={type === resolvedType}
                  onPress={() => setActiveType(type)}>
                  {prTypeLabels[type]}
                </Chip>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      {chartPoints.length >= 2 ? (
        <Card style={styles.chartShell}>
          <Text style={styles.chartTitle}>Progreso</Text>
          <ProgressBarChart
            points={chartPoints}
            primaryColor={theme.colors.accent}
          />
        </Card>
      ) : null}

      <PrHistoryList
        title={prTypeLabels[resolvedType]}
        records={filteredRecords}
        onDelete={handleDelete}
      />

      <Button label="Registrar nuevo PR" onPress={openRegister} />
    </ScreenContainer>
  );
}
