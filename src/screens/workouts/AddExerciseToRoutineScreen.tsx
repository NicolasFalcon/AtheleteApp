import { useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { ChevronRight, Plus } from 'lucide-react-native';
import { AppHeader } from '@app/components';
import { Button, Card, EmptyState, Loader } from '@app/components/ui';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { routineErrorCopy } from '@app/features/workouts/routineErrors';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { useRoutineList, useRoutineMutations } from '@app/hooks/useRoutines';
import {
  routineInputFrom,
  routinesService,
} from '@app/services/routines/routinesService';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'AddExerciseToRoutine'>;

export function AddExerciseToRoutineScreen({navigation, route}: Props) {
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();
  const language = useProfileLanguage();
  // The user's own routines (list_routines · mine), every page.
  const mineQuery = useRoutineList('mine', { exhaust: true });
  const mutations = useRoutineMutations();

  const editableRoutines = useMemo(
    () => mineQuery.items.filter(workout => workout.canEdit !== false),
    [mineQuery.items],
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
    navigation.navigate(APP_ROUTES.CreateRoutine, {
      initialExerciseId: route.params.exerciseId,
      initialExerciseName: route.params.exerciseName,
    });
  };

  // get_routine (fresh) + the exercise at the end → update_user_routine.
  const handleAppendToRoutine = async (workoutId: string) => {
    try {
      const routine = await routinesService.getRoutine(workoutId);
      const input = routineInputFrom(routine);
      await mutations.updateRoutine({
        id: workoutId,
        input: {
          ...input,
          exercises: [
            ...input.exercises,
            {
              exerciseId: route.params.exerciseId,
              block: 'main',
              sets: 3,
              reps: 10,
              restTime: 60,
            },
          ],
        },
      });

      navigation.replace(APP_ROUTES.EditRoutine, { workoutId });
    } catch (error) {
      Alert.alert(
        'No pudimos agregar el ejercicio',
        routineErrorCopy(error, language).message,
      );
    }
  };

  if (mineQuery.isLoading) {
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
          backFallbacks={[ROOT_ROUTES.MainTabs]}
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
                    {workout.exerciseCount ?? 0} ejercicio
                    {workout.exerciseCount === 1 ? '' : 's'} · {workout.duration}{' '}
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
