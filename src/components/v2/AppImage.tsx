import { useState } from 'react';
import type { ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';
import { Image as ExpoImage, type ImageSource } from 'expo-image';
import { signedImageSource } from '@app/lib/media/imageSource';
import { useMediaUrl } from '@app/lib/media/mediaUrls';

// A catalog image by key (movekit/thumbs/…, movekit/posters/…): signed when
// shown, with a local picture when there is no key or it fails.
export type MediaImageSource = {
  mediaKey: string | null | undefined;
  fallback: ImageSourcePropType;
};

export type AppImageSource = ImageSourcePropType | MediaImageSource;

export function isMediaImageSource(source: unknown): source is MediaImageSource {
  return Boolean(source && typeof source === 'object' && 'fallback' in source);
}

type Props = {
  source: AppImageSource;
  style?: StyleProp<ImageStyle>;
  onError?: () => void;
  accessibilityLabel?: string;
};

// expo-image (disk cache) for every picture of the workout surfaces.
export function AppImage({ source, style, onError, accessibilityLabel }: Props) {
  if (isMediaImageSource(source)) {
    return (
      <MediaImage
        mediaKey={source.mediaKey}
        fallback={source.fallback}
        style={style}
        onError={onError}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }
  return (
    <ExpoImage
      source={source as ImageSource | number}
      contentFit="cover"
      style={style}
      onError={onError}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

function MediaImage({
  mediaKey,
  fallback,
  style,
  onError,
  accessibilityLabel,
}: {
  mediaKey: string | null | undefined;
  fallback: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  onError?: () => void;
  accessibilityLabel?: string;
}) {
  const url = useMediaUrl(mediaKey);
  // The URL that failed: a renewed one gets a new chance.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const remote = mediaKey && url && failedUrl !== url ? signedImageSource(url, mediaKey) : null;

  return (
    <ExpoImage
      source={remote ?? (fallback as ImageSource | number)}
      recyclingKey={mediaKey ?? undefined}
      cachePolicy="disk"
      contentFit="cover"
      transition={remote ? 120 : 0}
      style={style}
      accessibilityLabel={accessibilityLabel}
      onError={() => {
        if (remote) {
          setFailedUrl(url);
        }
        onError?.();
      }}
    />
  );
}
