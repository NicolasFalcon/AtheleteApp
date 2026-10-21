import { Linking } from 'react-native';
import type { RefObject } from 'react';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { decode as decodeJpeg } from 'jpeg-js';
import Share, { Social } from 'react-native-share';
import { captureRef } from 'react-native-view-shot';
import { env } from '@app/lib/config/env';
import { COMBINED, STICKER_MARGIN, luminanceOf } from '@app/features/share/shareModel';

// Compartir en Instagram (handoff v2.16 §26.1, 26.8): images and where they
// go. The photo never leaves the phone except to Instagram or to Fotos
// (26.10.6).

// view-shot may answer a bare path; sharing and Fotos want a file URL.
export function fileUrl(uri: string): string {
  return uri.startsWith('/') ? `file://${uri}` : uri;
}

// The sticker as a transparent PNG at 3× (with its 24 pt shadow margin).
export async function captureSticker(
  ref: RefObject<unknown>,
  size: { width: number; height: number },
): Promise<string> {
  const uri = await captureRef(ref, {
    format: 'png',
    result: 'tmpfile',
    width: (size.width + STICKER_MARGIN * 2) * 3,
    height: (size.height + STICKER_MARGIN * 2) * 3,
  });
  return fileUrl(uri);
}

// A 9:16 scene (photo or brand background, with or without the sticker) at
// 1080 × 1920, JPG 90 %.
export async function captureScene(ref: RefObject<unknown>): Promise<string> {
  const uri = await captureRef(ref, {
    format: 'jpg',
    quality: 0.9,
    result: 'tmpfile',
    width: COMBINED.width,
    height: COMBINED.height,
  });
  return fileUrl(uri);
}

// Average brightness of a photo (0–1), from an 8 × 8 copy: decides the
// sticker's background (26.5). null when it cannot be read.
export async function photoLuminance(uri: string): Promise<number | null> {
  try {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: 8, height: 8 });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.9, base64: true });
    image.release();
    context.release();
    if (!saved.base64) {
      return null;
    }
    const pixels = decodeJpeg(new Uint8Array(decodeBase64(saved.base64)), { useTArray: true, formatAsRGBA: true });
    return luminanceOf(pixels.data);
  } catch {
    return null;
  }
}

export type StoriesResult = 'opened' | 'unavailable' | 'failed';

// Instagram Stories: the background and the sticker as separate images, with
// the Meta App ID (META_APP_ID). Without the ID or without Instagram:
// 'unavailable' (SHARE_09).
export async function shareToStories(params: { background: string; sticker: string }): Promise<StoriesResult> {
  const appId = env.metaAppId;
  if (!appId) {
    return 'unavailable';
  }
  const installed = await Linking.canOpenURL('instagram-stories://share').catch(() => false);
  if (!installed) {
    return 'unavailable';
  }
  try {
    await Share.shareSingle({
      social: Social.InstagramStories,
      appId,
      backgroundImage: params.background,
      stickerImage: params.sticker,
      backgroundTopColor: '#141312',
      backgroundBottomColor: '#141312',
    });
    return 'opened';
  } catch {
    return 'failed';
  }
}

export type SaveResult = 'saved' | 'denied' | 'failed';

// Descargar: the combined image to Fotos (add-only permission).
export async function saveToPhotos(uri: string): Promise<SaveResult> {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) {
      return 'denied';
    }
    await MediaLibrary.saveToLibraryAsync(uri);
    return 'saved';
  } catch {
    return 'failed';
  }
}

// Más: the system share sheet with the combined image. Cancelling is fine.
export async function shareMore(uri: string): Promise<void> {
  await Share.open({ url: uri, type: 'image/jpeg', failOnCancel: false });
}
