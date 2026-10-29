import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { RATING_NOTE_MAX } from '@app/features/session/restMessages';

// Resumen · "¿Cómo estuvo la sesión?" (§28.13): five round buttons 1–5 with
// "Mal" and "Genial" at the ends; single choice that can be changed. Once a
// value is chosen, an optional 2-line note "Cuéntale a ELLIE (opcional)".
export function SessionRating({
  rating,
  note,
  onRate,
  onNote,
  onNoteDone,
}: {
  rating: number | null;
  note: string;
  onRate: (rating: number) => void;
  onNote: (note: string) => void;
  onNoteDone: () => void;
}) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.block}>
      <TextV2 variant="sub" accessibilityRole="header">
        ¿Cómo estuvo la sesión?
      </TextV2>
      <View style={styles.row} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map(value => {
          const on = rating === value;
          return (
            <PressableScale
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${value} de 5${value === 1 ? ', mal' : value === 5 ? ', genial' : ''}`}
              onPress={() => onRate(value)}
              style={[
                styles.option,
                on
                  ? { backgroundColor: colors.cta.primary }
                  : { boxShadow: `inset 0 0 0 1px ${colors.outline.strong}` },
              ]}
            >
              <TextV2 variant="sub" color={on ? colors.cta.primaryText : colors.text.primary}>
                {String(value)}
              </TextV2>
            </PressableScale>
          );
        })}
      </View>
      <View style={styles.ends}>
        <TextV2 variant="caption" tone="secondary">
          Mal
        </TextV2>
        <TextV2 variant="caption" tone="secondary">
          Genial
        </TextV2>
      </View>
      {rating !== null ? (
        <Animated.View entering={FadeInDown.duration(260)}>
          <TextInput
            value={note}
            onChangeText={onNote}
            onBlur={onNoteDone}
            placeholder="Cuéntale a ELLIE (opcional)"
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={2}
            maxLength={RATING_NOTE_MAX}
            style={[
              styles.note,
              { backgroundColor: colors.surface.field, color: colors.text.primary },
            ]}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  option: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4, paddingHorizontal: 4 },
  note: {
    minHeight: 64,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
});
