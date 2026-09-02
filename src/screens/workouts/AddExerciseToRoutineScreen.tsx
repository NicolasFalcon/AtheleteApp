import {useMemo} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {ChevronRight, Plus} from 'lucide-react-native';
import {AppHeader} from '@app/components';
import {Button, Card, EmptyState, Loader} from '@app/components/ui';
import {
  HOME_ROUTES,
  WORKOUTS_ROUTES,
} from '@app/constants/routes';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {useRoutineBuilder} from '@app/hooks/useRoutineBuilder';
import type {
  HomeStackParamList,
  WorkoutsStackParamList,
} from '@app/types/navigation';

type Props =
  | NativeStackScreenProps<HomeStackParamList, 'AddExerciseToRoutine'>
  | NativeStackScreenProps<WorkoutsStackParamList, 'AddExerciseToRoutine'>;

export function AddExerciseToRoutineScreen({navigation, route}: Props) {
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();
  const routineBuilder = useRoutineBuilder();

  const routeNames = navigation.getState().routeNames as string[];
  const createRouteName = routeNames.includes(WORKOUTS_ROUTES.CreateRoutine)
    ? WORKOUTS_ROUTES.CreateRoutine
    : HOME_ROUTES.CreateRoutine;
  const editRouteName = routeNames.includes(WORKOUTS_ROUTES.EditRoutine)
    ? WORKOUTS_ROUTES.EditRoutine
    : HOME_ROUTES.EditRoutine;

  const editableRoutines = useMemo(
    () => routineBuilder.editableWorkouts,
    [routineBuilder.editableWorkouts],
  );

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: Math.max(insets.bottom, theme.spacing.xl),
      gap: theme.spacing.md,
    },
    list: {
      gap: theme.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    rowTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    rowMeta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      marginTop: 2,
    },
    rowContent: {
      flex: 1,
    },
  });

  const handleCreateNew = () => {
    (navigation as any).navigate(createRouteName, {
      initialExerciseId: route.params.exerciseId,
      initialExerciseName: route.params.exerciseName,
    });
  };

  const handleAppendToRoutine = async (workoutId: string) => {
    try {
      await routineBuilder.appendExerciseToRoutine({
        workoutId,
        exerciseId: route.params.exerciseId,
        exerciseName: route.params.exerciseName,
      });

      (navigation as any).replace(editRouteName, {workoutId});
    } catch (error) {
      Alert.alert(
        'No pudimos agregar el ejercicio',
        error instanceof Error ? error.message : 'Inténtalo otra vez.',
      );
    }
  };

  if (routineBuilder.isLoadingEditableWorkouts) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loader label="Cargando tus rutinas..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <AppHeader
          showBackButton
          title="Agregar a rutina"
          backFallbacks={[WORKOUTS_ROUTES.Workouts, HOME_ROUTES.Home]}
        />

        <Card>
          <Button
            label="Crear nueva rutina"
            onPress={handleCreateNew}
            accessoryRight={
              <Plus
                color={theme.colors.accentContrast}
                size={16}
                strokeWidth={2.2}
              />
            }
          />
        </Card>

        {editableRoutines.length === 0 ? (
          <EmptyState
            title="Aún no tienes rutinas editables"
            description="Crea tu primera rutina y este ejercicio quedará dentro desde el inicio."
          />
        ) : (
          <View style={styles.list}>
            {editableRoutines.map(workout => (
              <Pressable
                key={workout.id}
                onPress={() => handleAppendToRoutine(workout.id)}
                style={styles.row}>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{workout.title}</Text>
                  <Text style={styles.rowMeta}>
                    {workout.exercises.length} ejercicio
                    {workout.exercises.length === 1 ? '' : 's'} · {workout.duration}{' '}
                    min
                  </Text>
                </View>
                <ChevronRight color={theme.colors.textSecondary} size={18} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
