import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';

export type ZoneTileItem = {
  key: string;
  label: string;
  count: number;
  column: 1 | 2;
  span: 1 | 2;
  dot?: boolean; // Ember point (Pecho, the protagonist)
  // Full-bleed anatomical image without text or borders; the dark
  // bottom-left fade is drawn by the tile.
  image: ImageSourcePropType;
  onPress: () => void;
};

export type ZoneMosaicProps = {
  items: ZoneTileItem[];
  style?: StyleProp<ViewStyle>;
};

const ROW = 118;
const GAP = 10;

// Ejercicios · Por zona (handoff §16, approved, do not reinterpret): two
// columns, rows of 118 and gap 10; the tiles flow per column in the
// prototype order. Dark in both modes (scene treatment).
export function ZoneMosaic({ items, style }: ZoneMosaicProps) {
  const columns: ZoneTileItem[][] = [
    items.filter(item => item.column === 1),
    items.filter(item => item.column === 2),
  ];

  return (
    <View style={[styles.grid, style]}>
      {columns.map((column, index) => (
        <View key={index} style={styles.column}>
          {column.map(item => (
            <ZoneTile key={item.key} item={item} />
          ))}
        </View>
      ))}
    </View>
  );
}

function ZoneTile({ item }: { item: ZoneTileItem }) {
  const big = item.span === 2;
  const height = big ? ROW * 2 + GAP : ROW;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${item.label}, ${item.count} ejercicios`}
      onPress={item.onPress}
      style={[styles.tile, { height }]}
    >
      {/* radial-gradient(120% 90% at 70% 30%, #2E2B28 0%, #161514 75%) */}
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient
            id={`zone-${item.key}`}
            cx="70%"
            cy="30%"
            rx="120%"
            ry="90%"
            fx="70%"
            fy="30%"
          >
            <Stop offset="0" stopColor="#2E2B28" />
            <Stop offset="0.75" stopColor="#161514" />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={`url(#zone-${item.key})`}
        />
      </Svg>
      <Image source={item.image} resizeMode="cover" style={styles.fill} />
      {/* Dark fade from the bottom-left corner so the label stays legible */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient
            id={`fade-${item.key}`}
            x1="0"
            y1="1"
            x2="0.75"
            y2="0.25"
          >
            <Stop offset="0" stopColor="#000000" stopOpacity="0.85" />
            <Stop offset="0.55" stopColor="#000000" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={`url(#fade-${item.key})`}
        />
      </Svg>
      {item.dot ? (
        <View style={styles.dot}>
          <View style={styles.dotHalo} />
          <View style={styles.dotCore} />
        </View>
      ) : null}
      <View style={styles.labels}>
        <TextV2
          variant="bodyStrong"
          color="#FFFFFF"
          style={[styles.label, big ? styles.labelBig : styles.labelSmall]}
        >
          {item.label}
        </TextV2>
        <TextV2 variant="caption" color="#A8A6A1">
          {`${item.count} ejercicios`}
        </TextV2>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: GAP,
  },
  column: {
    flex: 1,
    gap: GAP,
  },
  tile: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  // left 104 / top 118 in the prototype (10 pt dot + 6 pt halo)
  dot: {
    position: 'absolute',
    left: 104,
    top: 118,
    width: 10,
    height: 10,
  },
  dotHalo: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 11,
    backgroundColor: 'rgba(255,91,31,.3)',
  },
  dotCore: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 5,
    backgroundColor: '#FF5B1F',
  },
  labels: {
    position: 'absolute',
    left: 16,
    bottom: 14,
    gap: 2,
  },
  label: {
    letterSpacing: -0.2,
  },
  labelBig: {
    fontSize: 22,
    lineHeight: 27,
  },
  labelSmall: {
    fontSize: 17,
    lineHeight: 21,
  },
});
