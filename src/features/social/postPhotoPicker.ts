import { Image } from 'react-native';
import { openProfilePhotoLibrary } from '@app/lib/profilePhotoPicker';
import {
  normalizePhotoMime,
  PHOTO_MAX_SIDE,
  PHOTO_QUALITY,
  resizedSize,
} from '@app/features/social/postModel';
import type { PostPhotoDraft } from '@app/features/social/postTypes';

// Picks the photo of a post with the same picker as the profile photo. The
// picker itself resizes it (longer side 1440 px) and re-encodes it at JPEG 0.8,
// which drops the EXIF metadata, location included; a HEIC or WebP comes back
// as JPEG. Type and size are validated afterwards with `validatePhoto`.
export type PostPhotoPick =
  | { status: 'picked'; photo: PostPhotoDraft }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

function sizeOf(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null),
    );
  });
}

export async function pickPostPhoto(): Promise<PostPhotoPick> {
  let response;
  try {
    response = await openProfilePhotoLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      maxWidth: PHOTO_MAX_SIDE,
      maxHeight: PHOTO_MAX_SIDE,
      quality: PHOTO_QUALITY,
      includeBase64: false,
    });
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'No pudimos abrir la galería.',
    };
  }
  if (response.didCancel) {
    return { status: 'cancelled' };
  }
  const asset = response.assets?.[0];
  if (response.errorCode || !asset?.uri) {
    return {
      status: 'error',
      message: response.errorMessage || 'No pudimos leer la foto. Elige otra.',
    };
  }

  // The size of the file that will be uploaded (after the resize).
  let { width, height } = { width: asset.width ?? 0, height: asset.height ?? 0 };
  if (!(width > 0 && height > 0)) {
    const real = await sizeOf(asset.uri);
    if (!real) {
      return { status: 'error', message: 'No pudimos leer el tamaño de la foto. Elige otra.' };
    }
    ({ width, height } = resizedSize(real.width, real.height));
  }

  return {
    status: 'picked',
    photo: {
      key: '',
      uri: asset.uri,
      mime: normalizePhotoMime(asset.type),
      sizeBytes: asset.fileSize ?? 0,
      width,
      height,
    },
  };
}
