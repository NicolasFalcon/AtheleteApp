import { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// `object-fit: cover` with an `object-position`, computed by hand. On Fabric
// `resizeMode="cover"` inside an absolute box centres the crop wrongly in
// some full-bleed layouts (see D-134), so the frame is sized explicitly.
// `aspect` = width / height of the picture; `x` and `y` = object-position
// (0 to 1).
export type CoverImageProps = {
  source: ImageSourcePropType | null;
  aspect: number;
  x?: number;
  y?: number;
  style?: StyleProp<ViewStyle>;
};

export function CoverImage({ source, aspect, x = 0.5, y = 0.5, style }: CoverImageProps) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (event: LayoutChangeEvent) =>
    setBox({ w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height });

  let frame: { width: number; height: number; left: number; top: number } | null = null;
  if (box && box.w > 0 && box.h > 0) {
    const height = Math.max(box.h, box.w / aspect);
    const width = height * aspect;
    frame = { width, height, left: (box.w - width) * x, top: (box.h - height) * y };
  }

  return (
    <View onLayout={onLayout} style={[StyleSheet.absoluteFill, styles.clip, style]}>
      {frame && source ? (
        <Image
          source={source}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          style={[styles.image, frame]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  image: { position: 'absolute' },
});
