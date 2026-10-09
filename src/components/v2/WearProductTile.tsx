import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

// Wear Product Tile (handoff v2.12): black and white image on a neutral plate
// (radius 24) + name 15/600 + price 15 secondary. Only "Próximamente" is
// marked (glass pill over the image, or an outline pill next to the text in
// the horizontal tile). No Ember.
export type WearProductTileVariant = 'base' | 'grid' | 'horizontal';

export type WearProductTileProps = {
  variant: WearProductTileVariant;
  name: string;
  price: string;
  photo: ImageSourcePropType;
  soon?: boolean;
  onPress: () => void;
};

const IMAGE_HEIGHT = { base: 440, grid: 236, horizontal: 132 } as const;

function SoonPill({ outline }: { outline?: boolean }) {
  const { colors, scene } = useThemeV2();
  return (
    <View
      style={[
        styles.pill,
        outline
          ? { boxShadow: `inset 0 0 0 1px ${colors.outline.strong}` }
          : { backgroundColor: scene.glass.onPhoto },
      ]}
    >
      <TextV2
        variant="metaStrong"
        color={outline ? colors.text.secondary : '#FFFFFF'}
      >
        Próximamente
      </TextV2>
    </View>
  );
}

export function WearProductTile({
  variant,
  name,
  price,
  photo,
  soon = false,
  onPress,
}: WearProductTileProps) {
  const { colors } = useThemeV2();
  const horizontal = variant === 'horizontal';
  const plate = { backgroundColor: colors.surface.skeleton };

  const image = (
    <View
      style={[
        styles.image,
        plate,
        horizontal ? styles.imageHorizontal : { height: IMAGE_HEIGHT[variant] },
      ]}
    >
      <Image source={photo} resizeMode="cover" style={StyleSheet.absoluteFill} />
      {soon && !horizontal ? (
        <View style={styles.soonOnImage}>
          <SoonPill />
        </View>
      ) : null}
    </View>
  );

  const texts = (
    <View style={horizontal ? styles.textsHorizontal : styles.texts}>
      <TextV2 variant="bodyStrong" numberOfLines={2}>
        {name}
      </TextV2>
      <TextV2 variant="body" color={colors.text.secondary}>
        {price}
      </TextV2>
      {soon && horizontal ? <SoonPill outline /> : null}
    </View>
  );

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${price}${soon ? ', próximamente' : ''}`}
      onPress={onPress}
      style={horizontal ? styles.rowTile : styles.tile}
    >
      {image}
      {texts}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: { gap: 12 },
  rowTile: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  image: { borderRadius: 24, overflow: 'hidden' },
  imageHorizontal: { width: 132, height: 132 },
  texts: { gap: 2 },
  textsHorizontal: { flex: 1, gap: 4, alignItems: 'flex-start' },
  soonOnImage: { position: 'absolute', left: 12, top: 12 },
  pill: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
