import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type FormRowProps = {
  label: string;
  // Content under the label (the value, an input, chips…).
  children: ReactNode;
  // Right side: a stepper, an icon…
  trailing?: ReactNode;
  error?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// Flat form row (Editar perfil): label 13 secondary, value below, hairline
// divider. It replaces boxed fields where the design uses plain rows.
export function FormRow({
  label,
  children,
  trailing,
  error,
  onPress,
  accessibilityLabel,
  style,
}: FormRowProps) {
  const { colors } = useThemeV2();
  const body = (
    <>
      <View style={styles.main}>
        <TextV2 variant="meta" color={colors.text.secondary}>
          {label}
        </TextV2>
        {children}
        {error ? (
          <TextV2 variant="caption" color={colors.ember.deep}>
            {error}
          </TextV2>
        ) : null}
      </View>
      {trailing}
    </>
  );
  const rowStyle = [styles.row, { borderBottomColor: colors.divider }, style];
  return onPress ? (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={rowStyle}
    >
      {body}
    </PressableScale>
  ) : (
    <View style={rowStyle}>{body}</View>
  );
}

export type StepperButtonsProps = {
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
  label: string;
};

// The − / + pair of a form row (36 pt round buttons).
export function StepperButtons({
  onMinus,
  onPlus,
  minusDisabled = false,
  plusDisabled = false,
  label,
}: StepperButtonsProps) {
  const { colors } = useThemeV2();
  const button = (
    Icon: typeof Plus,
    name: string,
    onPress: () => void,
    disabled: boolean,
  ) => (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${name} ${label}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.step,
        { backgroundColor: colors.surface.muted, opacity: disabled ? 0.4 : 1 },
      ]}
    >
      <Icon size={18} color={colors.text.primary} strokeWidth={2} />
    </PressableScale>
  );
  return (
    <View style={styles.steppers}>
      {button(Minus, 'Menos', onMinus, minusDisabled)}
      {button(Plus, 'Más', onPlus, plusDisabled)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  main: { flex: 1, gap: 4 },
  steppers: { flexDirection: 'row', gap: 8 },
  step: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
