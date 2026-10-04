import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type RecordCardProps = {
  title: string;
  value: string;
  unit: string; // "kg × 1"
  date: string; // "9 abr" · "Hoy"
  // Ember dot: registered today.
  isNew?: boolean;
  // The first mark is a dark plate; the rest are raised cards.
  featured?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

// "Tus marcas" card (Progreso): 160 × 196, name on top, big value below.
export function RecordCard({
  title,
  value,
  unit,
  date,
  isNew = false,
  featured = false,
  onPress,
  style,
}: RecordCardProps) {
  const { colors, scene, shadow } = useThemeV2();
  const fg = featured ? scene.onDark.primary : colors.text.primary;
  const sub = featured ? scene.onDark.meta : colors.text.secondary;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${value} ${unit}, ${date}${
        isNew ? ', nuevo' : ''
      }`}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: featured ? scene.plate : colors.surface.raised,
          boxShadow: featured ? undefined : shadow.subtle,
        },
        featured
          ? { boxShadow: `inset 0 0 0 1px ${colors.border.onDark}` }
          : null,
        style,
      ]}
    >
      <View style={styles.top}>
        <TextV2
          variant="metaStrong"
          color={fg}
          numberOfLines={3}
          style={styles.title}
        >
          {title}
        </TextV2>
        {isNew ? (
          <View style={[styles.dot, { backgroundColor: colors.ember.base }]} />
        ) : null}
      </View>
      <View style={styles.bottom}>
        <TextV2
          variant="title28"
          color={fg}
          style={styles.value}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </TextV2>
        <TextV2 variant="meta" color={sub} numberOfLines={1}>
          {`${unit} · ${date}`}
        </TextV2>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    height: 196,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { maxWidth: 110, fontWeight: '600' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  bottom: { gap: 2 },
  value: { fontSize: 36, fontWeight: '600', letterSpacing: -1.1 },
});
