import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  Dumbbell,
  Repeat,
  Route,
  Timer,
  Weight,
  type LucideIcon,
} from 'lucide-react-native';
import {
  Button,
  FilterChip,
  PressableScale,
  SearchField,
  Sheet,
  StepperField,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import {
  bestRecord,
  compareDraft,
  defaultDraft,
  draftToInsert,
  formatSeconds,
  isDraftValid,
  PR_STEPS,
  PR_TYPES,
  prTypeLabels,
  type PrDraft,
} from '@app/features/progress/recordsModel';
import type {
  LibraryExercise,
  PersonalRecord,
  PRInsert,
  PRType,
} from '@app/shared';

const TYPE_ICONS: Record<PRType, LucideIcon> = {
  weight_reps: Dumbbell,
  max_weight: Weight,
  max_reps: Repeat,
  duration: Timer,
  distance: Route,
};

export type RecordExercise = { id: string; name: string };

// Registrar récord (RECORDS_02): type of record, the values with steppers in
// the right unit, the comparison with the best mark and optional notes. A
// manual record (source 'manual'); without an exercise it starts with a
// picker.
export function RegisterRecordSheet({
  open,
  onClose,
  exercise,
  exercises,
  records,
  saving,
  error,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  exercise: RecordExercise | null;
  exercises: LibraryExercise[];
  // Every record of the user (the best mark of each type comes from here).
  records: PersonalRecord[];
  saving: boolean;
  error: string | null;
  onSave: (
    insert: PRInsert,
    beatsBest: boolean,
    exercise: RecordExercise,
  ) => void;
}) {
  const { colors } = useThemeV2();
  const [picked, setPicked] = useState<RecordExercise | null>(null);
  const [query, setQuery] = useState('');
  const [prType, setPrType] = useState<PRType>('weight_reps');
  const [draft, setDraft] = useState<PrDraft>(() =>
    defaultDraft('weight_reps', null),
  );
  const [notes, setNotes] = useState('');

  const current = exercise ?? picked;
  const bestOf = (type: PRType) =>
    bestRecord(
      records.filter(
        record => record.exerciseId === current?.id && record.prType === type,
      ),
    );

  // Starting values every time the sheet opens or the type / exercise change.
  useEffect(() => {
    if (open) {
      setDraft(
        defaultDraft(
          prType,
          bestRecord(
            records.filter(
              record =>
                record.exerciseId === current?.id && record.prType === prType,
            ),
          ),
        ),
      );
    }
    // The records are read when the type or the exercise changes, not on
    // every refetch (it would reset what the user typed).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prType, current?.id]);

  useEffect(() => {
    if (!open) {
      setPicked(null);
      setQuery('');
      setNotes('');
    }
  }, [open]);

  // Opens on the type the exercise already has (its latest record).
  useEffect(() => {
    if (open && current) {
      const latest = [...records]
        .filter(record => record.exerciseId === current.id)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
      if (latest) {
        setPrType(latest.prType);
      }
    }
    // Only when the exercise is (re)chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, current?.id]);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return exercises
      .filter(item => !term || item.name.toLowerCase().includes(term))
      .slice(0, 40);
  }, [exercises, query]);

  const comparison = compareDraft(draft, bestOf(prType));
  const valid = Boolean(current) && isDraftValid(draft);

  const body = !current ? (
    <View style={styles.picker}>
      <SearchField
        placeholder="Buscar ejercicio"
        value={query}
        onChangeText={setQuery}
      />
      {matches.map(item => (
        <PressableScale
          key={item.id}
          accessibilityRole="button"
          onPress={() => setPicked({ id: item.id, name: item.name })}
          style={[styles.pickRow, { borderBottomColor: colors.divider }]}
        >
          <TextV2 variant="cta">{item.name}</TextV2>
          <TextV2 variant="meta" tone="secondary">
            {item.bodyPart}
          </TextV2>
        </PressableScale>
      ))}
    </View>
  ) : (
    <View style={styles.form}>
      <View style={styles.block}>
        <TextV2 variant="meta" color={colors.text.secondary}>
          Tipo de récord
        </TextV2>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.chips}
        >
          {PR_TYPES.map(type => (
            <FilterChip
              key={type}
              size={40}
              icon={TYPE_ICONS[type]}
              label={prTypeLabels[type]}
              selected={prType === type}
              onPress={() => setPrType(type)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.row}>
        {prType === 'weight_reps' || prType === 'max_weight' ? (
          <StepperField
            label="Peso"
            unit="kg"
            value={draft.weight}
            step={PR_STEPS.weight}
            onChange={weight => setDraft(value => ({ ...value, weight }))}
          />
        ) : null}
        {prType === 'weight_reps' || prType === 'max_reps' ? (
          <StepperField
            label="Repeticiones"
            unit={draft.reps === 1 ? 'rep' : 'reps'}
            value={draft.reps}
            step={PR_STEPS.reps}
            min={0}
            keyboardType="number-pad"
            onChange={reps =>
              setDraft(value => ({ ...value, reps: Math.round(reps) }))
            }
          />
        ) : null}
        {prType === 'duration' ? (
          <StepperField
            label="Tiempo"
            unit={formatSeconds(draft.durationSec).unit}
            value={draft.durationSec}
            display={formatSeconds(draft.durationSec).value}
            step={PR_STEPS.durationSec}
            keyboardType="number-pad"
            onChange={durationSec =>
              setDraft(value => ({ ...value, durationSec }))
            }
          />
        ) : null}
        {prType === 'distance' ? (
          <StepperField
            label="Distancia"
            unit="m"
            value={draft.distanceM}
            step={PR_STEPS.distanceM}
            onChange={distanceM => setDraft(value => ({ ...value, distanceM }))}
          />
        ) : null}
      </View>

      {comparison ? (
        <TextV2
          variant="bodyStrong"
          color={comparison.beats ? colors.text.primary : colors.text.secondary}
        >
          {comparison.text}
        </TextV2>
      ) : (
        <TextV2 variant="bodyStrong" color={colors.text.secondary}>
          {bestOf(prType) ? 'Es otro tipo de récord' : 'Será tu primera marca'}
        </TextV2>
      )}

      <View style={styles.block}>
        <TextV2 variant="meta" color={colors.text.secondary}>
          Notas · opcional
        </TextV2>
        <TextInput
          accessibilityLabel="Notas del récord"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Cómo te sentiste, agarre, calzado…"
          placeholderTextColor={colors.text.tertiary}
          style={[
            styles.notes,
            {
              backgroundColor: colors.surface.field,
              color: colors.text.primary,
            },
          ]}
        />
      </View>

      {error ? (
        <TextV2 variant="meta" color={colors.ember.deep}>
          {error}
        </TextV2>
      ) : null}
    </View>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      scrollable
      eyebrow={current ? `Récord · ${current.name}` : 'Registrar récord'}
      title={current ? 'Registrar récord' : '¿De qué ejercicio?'}
      footer={
        current ? (
          <Button
            label="Guardar récord"
            disabled={!valid}
            loading={saving}
            loadingLabel="Guardando"
            style={styles.flex}
            onPress={() =>
              onSave(
                draftToInsert(current.id, draft, notes),
                Boolean(comparison?.beats),
                current,
              )
            }
          />
        ) : undefined
      }
    >
      {body}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: 18 },
  block: { gap: 8 },
  bleed: { marginHorizontal: -20 },
  chips: { gap: 8, paddingHorizontal: 20 },
  row: { flexDirection: 'row', gap: 12 },
  notes: {
    minHeight: 76,
    borderRadius: 16,
    padding: 16,
    fontSize: 17,
    textAlignVertical: 'top',
  },
  picker: { gap: 8 },
  pickRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
});
