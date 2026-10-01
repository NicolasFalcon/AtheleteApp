import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { AppHeader, ScreenContainer } from '@app/components';
import { Card, Loader } from '@app/components/ui';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { PrForm } from '@app/features/pr/components/PrForm';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { usePersonalRecords } from '@app/hooks/usePersonalRecords';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'RegisterPr'>;

const BACK_FALLBACKS = [APP_ROUTES.PersonalRecords, ROOT_ROUTES.MainTabs];

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
        backFallbacks={BACK_FALLBACKS}
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
                [
                  {
                    text: 'Continuar',
                    onPress: () => safeGoBack(navigation, BACK_FALLBACKS),
                  },
                ],
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
