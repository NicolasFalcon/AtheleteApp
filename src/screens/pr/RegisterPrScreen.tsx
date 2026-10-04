import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Trophy } from 'lucide-react-native';
import {
  Celebration,
  StatusBarV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { ROOT_ROUTES } from '@app/constants/routes';
import { formatRecord } from '@app/features/progress/recordsModel';
import {
  RegisterRecordSheet,
  type RecordExercise,
} from '@app/features/progress/v2/RegisterRecordSheet';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { usePersonalRecords } from '@app/hooks/usePersonalRecords';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { PRInsert } from '@app/shared';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'RegisterPr'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// "Registrar récord" from Inicio or Progreso: the same sheet as the record
// detail (RECORDS_02), over the screen it came from. Closing it goes back.
export function RegisterPrScreen({ navigation, route }: Props) {
  const { colors } = useThemeV2();
  const toast = useToast();
  const exercisesQuery = useExerciseLibrary();
  const recordsQuery = usePersonalRecords();
  const [open, setOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    value: string;
    unit: string;
    name: string;
  } | null>(null);

  const exercise: RecordExercise | null = useMemo(() => {
    const id = route.params?.exerciseId;
    if (!id || route.params?.showExercisePicker) {
      return null;
    }
    return {
      id,
      name:
        route.params?.exerciseName ??
        exercisesQuery.data?.find(item => item.id === id)?.name ??
        'Ejercicio',
    };
  }, [
    exercisesQuery.data,
    route.params?.exerciseId,
    route.params?.exerciseName,
    route.params?.showExercisePicker,
  ]);

  const close = () => safeGoBack(navigation, BACK_FALLBACKS);

  useEffect(() => {
    if (!open && !celebration) {
      close();
    }
    // close only reads navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, celebration]);

  const save = async (
    insert: PRInsert,
    beatsBest: boolean,
    chosen: RecordExercise,
  ) => {
    setError(null);
    try {
      // personal_records (source 'manual') + `personal_record_created`.
      await recordsQuery.addRecord(insert);
      const shown = formatRecord({
        prType: insert.prType,
        valueWeight: insert.valueWeight ?? null,
        valueReps: insert.valueReps ?? null,
        valueDurationSec: insert.valueDurationSec ?? null,
        valueDistanceM: insert.valueDistanceM ?? null,
      });
      if (beatsBest) {
        setCelebration({
          value: shown.value,
          unit: shown.unit,
          name: chosen.name,
        });
      } else {
        toast.show('Récord guardado');
      }
      setOpen(false);
    } catch (saveError) {
      console.warn('[records] No se pudo guardar el récord.', saveError);
      setError('No pudimos guardar el récord. Inténtalo otra vez.');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <RegisterRecordSheet
        open={open}
        onClose={() => setOpen(false)}
        exercise={exercise}
        exercises={exercisesQuery.data ?? []}
        records={recordsQuery.records}
        saving={recordsQuery.isAddingRecord}
        error={error}
        onSave={(insert, beats, chosen) => {
          save(insert, beats, chosen).catch(() => {});
        }}
      />
      <Celebration
        visible={Boolean(celebration)}
        icon={Trophy}
        eyebrow="Nuevo récord"
        value={celebration?.value ?? ''}
        unit={celebration?.unit}
        subtitle={celebration?.name}
        onClose={() => setCelebration(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });
