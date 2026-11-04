import { useState } from 'react';
import type { ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';
import { Image as ExpoImage, type ImageSource } from 'expo-image';
import { signedImageSource } from '@app/lib/media/imageSource';
import { useMediaUrl } from '@app/lib/media/mediaUrls';

// A catalog image by key (movekit/thumbs/…, movekit/posters/…): signed when
// shown. The local picture is the placeholder while it signs / downloads and
// what stays when there is no key or it fails.
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
  // Only when the catalog media itself is on screen (not the fallback).
  onMediaLoad?: () => void;
  accessibilityLabel?: string;
};

// The real picture fades in over the placeholder.
const MEDIA_TRANSITION_MS = 200;

// expo-image (disk cache) for every picture of the workout surfaces.
export function AppImage({ source, style, onError, onMediaLoad, accessibilityLabel }: Props) {
  if (isMediaImageSource(source)) {
    return (
      <MediaImage
        mediaKey={source.mediaKey}
        fallback={source.fallback}
        style={style}
        onError={onError}
        onMediaLoad={onMediaLoad}
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
  onMediaLoad,
  accessibilityLabel,
}: {
  mediaKey: string | null | undefined;
  fallback: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  onError?: () => void;
  onMediaLoad?: () => void;
  accessibilityLabel?: string;
}) {
  const url = useMediaUrl(mediaKey);
  // The URL that failed: a renewed one gets a new chance.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = Boolean(url && failedUrl === url);
  const remote = mediaKey && url && !failed ? signedImageSource(url, mediaKey) : null;
  // Still signing: nothing yet, the placeholder shows.
  const signing = Boolean(mediaKey && !url);

  return (
    <ExpoImage
      source={remote ?? (signing ? null : (fallback as ImageSource | number))}
      placeholder={fallback as ImageSource | number}
      placeholderContentFit="cover"
      recyclingKey={mediaKey ?? undefined}
      cachePolicy="disk"
      contentFit="cover"
      transition={remote ? MEDIA_TRANSITION_MS : 0}
      style={style}
      accessibilityLabel={accessibilityLabel}
      onLoad={remote ? onMediaLoad : undefined}
      onError={() => {
        if (remote) {
          setFailedUrl(url);
        }
        onError?.();
      }}
    />
  );
}
