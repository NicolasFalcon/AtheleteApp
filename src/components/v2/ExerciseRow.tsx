import { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Heart } from 'lucide-react-native';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type ExerciseRowProps = {
  title: string;
  muscle: string;
  equipment: string;
  levelLabel: string;
  levelBars: number; // 1–3
  thumbnail: ImageSourcePropType;
  favorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  style?: StyleProp<ViewStyle>;
};

// Exercise Row (handoff §5): dark 76 pt thumbnail with the 3D crop, name at
// 17/600, compact meta (muscle · equipment · level bars) and a heart that
// turns Ember when active.
export function ExerciseRow({
  title,
  muscle,
  equipment,
  levelLabel,
  levelBars,
  thumbnail,
  favorite,
  onPress,
  onToggleFavorite,
  style,
}: ExerciseRowProps) {
  const { colors } = useThemeV2();
  // Sticky: once wrapped it stays wrapped (removing the dot must not make it
  // fit again and oscillate). Reset when the content changes.
  const [wrapped, setWrapped] = useState(false);
  useEffect(() => {
    setWrapped(false);
  }, [muscle, equipment, levelLabel]);

  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }, style]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${muscle}, ${equipment}, ${levelLabel}`}
        onPress={onPress}
        style={styles.main}
      >
        <DarkThumb source={thumbnail} size={76} radius={20} badge="3D" />
        <View style={styles.texts}>
          <TextV2 variant="cta" style={styles.title} numberOfLines={2}>
            {title}
          </TextV2>
          <View style={styles.meta}>
            {/* The muscle has priority: never truncated by the rest. If
                equipment + level do not fit next to it, they wrap to a
                second line (without the leading dot). */}
            <TextV2 variant="caption" tone="secondary" numberOfLines={2}>
              {muscle}
            </TextV2>
            <View
              style={styles.metaRest}
              onLayout={event => {
                if (!wrapped && event.nativeEvent.layout.y > 4) {
                  setWrapped(true);
                }
              }}
            >
              {wrapped ? null : <Dot />}
              <TextV2 variant="caption" tone="secondary" numberOfLines={1}>
                {equipment}
              </TextV2>
              <Dot />
              <LevelBars value={levelBars} />
              <TextV2 variant="caption" tone="secondary" numberOfLines={1}>
                {levelLabel}
              </TextV2>
            </View>
          </View>
        </View>
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={
          favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'
        }
        accessibilityState={{ selected: favorite }}
        onPress={onToggleFavorite}
        style={[styles.heart, favorite && styles.heartOn]}
      >
        <Heart
          size={18}
          strokeWidth={2}
          color={favorite ? colors.ember.base : colors.text.primary}
          fill={favorite ? colors.ember.base : 'transparent'}
        />
      </PressableScale>
    </View>
  );
}

function Dot() {
  const { colors } = useThemeV2();
  return (
    <View style={[styles.dot, { backgroundColor: colors.outline.control }]} />
  );
}

// Level indicator: 3 bars of 3 pt, heights 6 / 8 / 10.
export function LevelBars({ value }: { value: number }) {
  const { colors } = useThemeV2();
  return (
    <View style={styles.bars} accessibilityElementsHidden>
      {[1, 2, 3].map(index => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              height: 4 + index * 2,
              backgroundColor:
                index <= value ? colors.text.primary : colors.outline.strong,
            },
          ]}
        />
      ))}
    </View>
  );
}

// Dark tile with an anatomical crop (Exercise Row, picker, routine path).
export function DarkThumb({
  source,
  size,
  radius,
  badge,
  ring,
}: {
  source: ImageSourcePropType;
  size: number;
  radius: number;
  badge?: string;
  ring?: string;
}) {
  return (
    <View
      style={[
        styles.thumb,
        { width: size, height: size, borderRadius: radius },
        ring ? { boxShadow: ring } : styles.thumbShadow,
      ]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, overflow: 'hidden' },
        ]}
      >
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="thumbGlow" cx="50%" cy="35%" rx="90%" ry="90%">
              <Stop offset="0" stopColor="#34312E" />
              <Stop offset="0.85" stopColor="#141312" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#thumbGlow)" />
        </Svg>
        <Image source={source} resizeMode="cover" style={styles.fill} />
      </View>
      {badge ? (
        <View style={styles.badge}>
          <TextV2 variant="micro" color="#D8D6D1" style={styles.badgeText}>
            {badge}
          </TextV2>
        </View>
      ) : null}
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
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  title: {
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
    rowGap: 4,
  },
  metaRest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 3,
    borderRadius: 1,
  },
  heart: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartOn: {
    backgroundColor: 'rgba(255,91,31,.1)',
  },
  thumb: {
    overflow: 'visible',
  },
  thumbShadow: {
    boxShadow: '0 6px 16px rgba(0,0,0,.14)',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    height: 16,
    paddingHorizontal: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(20,19,18,.6)',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
