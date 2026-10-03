import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Heart } from 'lucide-react-native';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type RoutineRowProps = {
  title: string;
  meta: string;
  image: ImageSourcePropType;
  mine?: boolean; // "Tuya": only the user's own routines are marked
  favorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  onImageError?: () => void;
  style?: StyleProp<ViewStyle>;
};

// Routine list row (Workouts.dc.html): 76×92 photo, title 17/600 + "Tuya",
// meta 13 and a heart (filled ink when favourite).
export function RoutineRow({
  title,
  meta,
  image,
  mine = false,
  favorite,
  onPress,
  onToggleFavorite,
  onImageError,
  style,
}: RoutineRowProps) {
  const { colors, scene } = useThemeV2();

  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }, style]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${title}${mine ? ', tuya' : ''}, ${meta}`}
        onPress={onPress}
        style={styles.main}
      >
        <View style={[styles.photo, { backgroundColor: scene.dotRing }]}>
          <Image
            source={image}
            resizeMode="cover"
            style={styles.fill}
            onError={onImageError}
          />
        </View>
        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <TextV2 variant="cta" numberOfLines={1} style={styles.title}>
              {title}
            </TextV2>
            {mine ? (
              <View
                style={[styles.mine, { backgroundColor: colors.surface.muted }]}
              >
                <TextV2 variant="eyebrow" style={styles.mineText}>
                  Tuya
                </TextV2>
              </View>
            ) : null}
          </View>
          <TextV2 variant="meta" tone="secondary" numberOfLines={1}>
            {meta}
          </TextV2>
        </View>
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={
          favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'
        }
        accessibilityState={{ selected: favorite }}
        onPress={onToggleFavorite}
        style={styles.heart}
      >
        <Heart
          size={18}
          strokeWidth={2}
          color={colors.text.primary}
          fill={favorite ? colors.text.primary : 'transparent'}
        />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photo: {
    width: 76,
    height: 92,
    borderRadius: 16,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flexShrink: 1,
  },
  mine: {
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 6,
    justifyContent: 'center',
  },
  mineText: {
    textTransform: 'none',
    letterSpacing: 0,
  },
  heart: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
