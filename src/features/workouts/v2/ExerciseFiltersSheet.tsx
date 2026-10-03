import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Eyebrow,
  FilterChip,
  Sheet,
  SwitchV2,
  TextV2,
} from '@app/components/v2';
import {
  EQUIPMENT,
  LEVEL_KEYS,
  LEVEL_LABELS,
  type EquipmentKey,
  type ExerciseFilters,
} from '@app/features/workouts/workoutsModel';

type ExerciseFiltersSheetProps = {
  open: boolean;
  filters: ExerciseFilters;
  // Live count of the draft filters ("Ver 8 ejercicios").
  countFor: (filters: ExerciseFilters) => number;
  onApply: (filters: ExerciseFilters) => void;
  onClose: () => void;
};

// Filtros (WORKOUTS_05, Overlays.dc.html): Nivel, Equipamiento and Solo
// favoritos. Applied with the primary CTA; closing discards the draft.
export function ExerciseFiltersSheet({
  open,
  filters,
  countFor,
  onApply,
  onClose,
}: ExerciseFiltersSheetProps) {
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (open) {
      setDraft(filters);
    }
  }, [filters, open]);

  const toggleEquipment = (key: EquipmentKey) =>
    setDraft(current => ({
      ...current,
      equipment: current.equipment.includes(key)
        ? current.equipment.filter(item => item !== key)
        : [...current.equipment, key],
    }));

  const count = countFor(draft);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="Ejercicios"
      title="Filtros"
      footer={
        <Button
          label={`Ver ${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}`}
          fullWidth
          style={styles.cta}
          onPress={() => onApply(draft)}
        />
      }
    >
      <View style={styles.content}>
        <View style={styles.group}>
          <Eyebrow>Nivel</Eyebrow>
          <View style={styles.chips}>
            {LEVEL_KEYS.map(level => (
              <FilterChip
                key={level}
                size={40}
                label={LEVEL_LABELS[level]}
                selected={draft.level === level}
                onPress={() =>
                  setDraft(current => ({
                    ...current,
                    level: current.level === level ? null : level,
                  }))
                }
              />
            ))}
          </View>
        </View>
        <View style={styles.group}>
          <Eyebrow>Equipamiento</Eyebrow>
          <View style={styles.chips}>
            {EQUIPMENT.map(item => (
              <FilterChip
                key={item.key}
                size={40}
                label={item.label}
                selected={draft.equipment.includes(item.key)}
                onPress={() => toggleEquipment(item.key)}
              />
            ))}
          </View>
        </View>
        <View style={styles.switchRow}>
          <TextV2 variant="body">Solo favoritos</TextV2>
          <SwitchV2
            accessibilityLabel="Solo favoritos"
            value={draft.favoritesOnly}
            onValueChange={value =>
              setDraft(current => ({ ...current, favoritesOnly: value }))
            }
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cta: {
    flex: 1,
  },
  content: {
    gap: 18,
    paddingTop: 6,
  },
  group: {
    gap: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
});
