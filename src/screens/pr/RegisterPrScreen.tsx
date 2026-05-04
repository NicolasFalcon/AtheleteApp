import {useMemo, useState} from 'react';
import {Alert} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppHeader, ScreenContainer} from '@app/components';
import {Card, Loader} from '@app/components/ui';
import {PrForm} from '@app/features/pr/components/PrForm';
import {useExerciseLibrary} from '@app/hooks/useExerciseLibrary';
import {usePersonalRecords} from '@app/hooks/usePersonalRecords';
import type {
  HomeStackParamList,
  ProgressStackParamList,
  WorkoutsStackParamList,
} from '@app/types/navigation';

type Props =
  | NativeStackScreenProps<HomeStackParamList, 'RegisterPr'>
  | NativeStackScreenProps<ProgressStackParamList, 'ProgressRegisterPr'>
  | NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutRegisterPr'>;

export function RegisterPrScreen({navigation, route}: Props) {
  const exercisesQuery = useExerciseLibrary();
  const recordsQuery = usePersonalRecords();
  const [selectedExerciseId, setSelectedExerciseId] = useState(
    route.params?.exerciseId || null,
  );

  const selectedExercise = useMemo(
    () =>
      (exercisesQuery.data || []).find(
        exercise => exercise.id === selectedExerciseId,
      ) || null,
    [exercisesQuery.data, selectedExerciseId],
  );

  if (exercisesQuery.isLoading) {
    return (
      <ScreenContainer>
        <Loader label="Cargando ejercicios..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <AppHeader
        showBackButton
        title="Registrar PR"
        subtitle={
          selectedExercise
            ? `Nueva marca para ${selectedExercise.name}`
            : 'Guarda una nueva mejor marca y sincronízala con tu progreso.'
        }
      />

      <Card>
        <PrForm
          exercises={exercisesQuery.data || []}
          selectedExercise={selectedExercise}
          onSelectExercise={exercise => setSelectedExerciseId(exercise.id)}
          showExercisePicker={route.params?.showExercisePicker || !selectedExercise}
          loading={recordsQuery.isAddingRecord}
          onSubmit={async payload => {
            try {
              await recordsQuery.addRecord(payload);
              Alert.alert(
                'PR registrado',
                'Tu nueva marca ya quedó guardada y se reflejará en tu progreso.',
                [{text: 'Continuar', onPress: () => navigation.goBack()}],
              );
            } catch (error) {
              Alert.alert(
                'No pudimos guardar tu PR',
                error instanceof Error
                  ? error.message
                  : 'Inténtalo nuevamente.',
              );
            }
          }}
        />
      </Card>
    </ScreenContainer>
  );
}
