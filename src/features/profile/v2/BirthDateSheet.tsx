import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Sheet, useThemeV2 } from '@app/components/v2';
import {
  BIRTH_YEAR_MIN,
  fromDateKey,
  toDateKey,
} from '@app/features/profile/profileModel';

// Birth date picker: the system picker in a sheet (iOS) or its dialog
// (Android), the same pattern as the onboarding.
export function BirthDateSheet({
  open,
  value,
  onClose,
  onPick,
}: {
  open: boolean;
  value: string | null;
  onClose: () => void;
  onPick: (dateKey: string) => void;
}) {
  const { mode } = useThemeV2();
  const today = new Date();
  const fallback = new Date(today.getFullYear() - 25, 0, 1);
  const [draft, setDraft] = useState<Date>(fromDateKey(value) ?? fallback);

  useEffect(() => {
    if (open) {
      setDraft(fromDateKey(value) ?? fallback);
    }
    // The date is read when the picker opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (Platform.OS === 'android') {
    return open ? (
      <DateTimePicker
        mode="date"
        display="default"
        value={draft}
        maximumDate={today}
        minimumDate={new Date(BIRTH_YEAR_MIN, 0, 1)}
        onChange={(event, date) => {
          onClose();
          if (event.type === 'set' && date) {
            onPick(toDateKey(date));
          }
        }}
      />
    ) : null;
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Fecha de nacimiento"
      footer={
        <Button
          label="Listo"
          style={styles.flex}
          onPress={() => {
            onPick(toDateKey(draft));
            onClose();
          }}
        />
      }
    >
      <DateTimePicker
        mode="date"
        display="spinner"
        locale="es-ES"
        themeVariant={mode === 'light' ? 'light' : 'dark'}
        value={draft}
        maximumDate={today}
        minimumDate={new Date(BIRTH_YEAR_MIN, 0, 1)}
        onChange={(_event, date) => date && setDraft(date)}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
