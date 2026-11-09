import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import type { ColorsV2 } from '@app/theme/v2';

// Type of a session of the training plan (TRAINING_PLAN_SHAPES tp-1.2 ·
// training_plan_sessions.session_type).
export type SessionType = 'pesado' | 'volumen' | 'tecnico' | 'descarga' | 'test';

export const SESSION_TYPES: readonly SessionType[] = ['pesado', 'volumen', 'tecnico', 'descarga', 'test'];

export const isSessionType = (value: unknown): value is SessionType =>
  typeof value === 'string' && (SESSION_TYPES as readonly string[]).includes(value);

// Colour of each type (v2.21 §31.0): pesado Ember, volumen soft Ember,
// técnico neutral, descarga Recovery Blue, test ink.
export function sessionTypeColor(colors: ColorsV2, type: SessionType): string {
  switch (type) {
    case 'pesado':
      return colors.plan.tyP;
    case 'volumen':
      return colors.plan.tyV;
    case 'tecnico':
      return colors.plan.tyT;
    case 'descarga':
      return colors.plan.tyD;
    case 'test':
      return colors.plan.tyX;
  }
}

// Text on the type's colour: #121212, except test (inverted).
export function sessionTypeTextColor(colors: ColorsV2, type: SessionType): string {
  return type === 'test' ? colors.plan.tyXText : '#121212';
}

export type SessionTypeChipProps = {
  type: SessionType;
  // The visible label ("Pesado", "Heavy"…), already translated.
  label: string;
  style?: StyleProp<ViewStyle>;
};

// Chip of a session type (§31.0): its colour with #121212 text (test: the
// text inverted). Free width, so a longer English label never wraps.
export function SessionTypeChip({ type, label, style }: SessionTypeChipProps) {
  const { colors } = useThemeV2();
  return (
    <View style={[styles.chip, { backgroundColor: sessionTypeColor(colors, type) }, style]}>
      <TextV2 variant="micro" color={sessionTypeTextColor(colors, type)} style={styles.text}>
        {label}
      </TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    minHeight: 20,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.63,
    textTransform: 'uppercase',
  },
});
