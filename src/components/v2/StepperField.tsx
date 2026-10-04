import { useEffect, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type StepperFieldProps = {
  label: string;
  value: number;
  unit: string;
  step: number;
  min?: number;
  max?: number;
  // Shown instead of the number (e.g. "1:35" for a time in seconds).
  display?: string;
  keyboardType?: KeyboardTypeOptions;
  onChange: (value: number) => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// Number field with +/− buttons (Registrar récord): label above, a 56 pt
// box with the value and its unit, the buttons stacked on the right.
export function StepperField({
  label,
  value,
  unit,
  step,
  min = 0,
  max = 9999,
  display,
  keyboardType = 'decimal-pad',
  onChange,
}: StepperFieldProps) {
  const { colors } = useThemeV2();
  const [text, setText] = useState(String(value).replace('.', ','));
  const [focused, setFocused] = useState(false);

  // Follows the buttons and external changes while the user is not typing.
  useEffect(() => {
    if (!focused) {
      setText(String(value).replace('.', ','));
    }
  }, [focused, value]);

  const set = (next: number) =>
    onChange(clamp(Math.round(next * 100) / 100, min, max));

  return (
    <View style={styles.wrap}>
      <TextV2 variant="meta" color={colors.text.secondary}>
        {label}
      </TextV2>
      <View style={[styles.box, { backgroundColor: colors.surface.field }]}>
        <View style={styles.valueRow}>
          {display && !focused ? (
            <TextV2 variant="title24" style={styles.value}>
              {display}
            </TextV2>
          ) : (
            <TextInput
              accessibilityLabel={label}
              value={text}
              keyboardType={keyboardType}
              selectTextOnFocus
              maxLength={6}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChangeText={next => {
                setText(next);
                const parsed = Number(next.replace(',', '.'));
                if (next.trim() !== '' && Number.isFinite(parsed)) {
                  set(parsed);
                }
              }}
              style={[
                styles.input,
                {
                  color: colors.text.primary,
                  width: Math.max(44, text.length * 15 + 6),
                },
              ]}
            />
          )}
          <TextV2 variant="body" color={colors.text.secondary}>
            {unit}
          </TextV2>
        </View>
        <View style={styles.buttons}>
          <StepButton
            icon={Plus}
            label={`Sumar a ${label}`}
            onPress={() => set(value + step)}
          />
          <StepButton
            icon={Minus}
            label={`Restar a ${label}`}
            onPress={() => set(value - step)}
          />
        </View>
      </View>
    </View>
  );
}

function StepButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Plus;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={[styles.step, { backgroundColor: colors.surface.raised }]}
    >
      <Icon size={14} color={colors.text.primary} strokeWidth={2.4} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 8 },
  box: {
    height: 64,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueRow: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  value: { fontWeight: '600' },
  input: {
    padding: 0,
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  buttons: { gap: 4 },
  step: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
