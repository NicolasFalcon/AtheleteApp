import { Linking } from 'react-native';
import type { RefObject } from 'react';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
// SDK 56: the root of expo-media-library is the new class-based API and its
// saveToLibraryAsync is a stub that ALWAYS throws ("imported from
// expo-media-library is deprecated"). That was the "No pudimos preparar la
// imagen" of Descargar. The function lives in /legacy.
import * as MediaLibrary from 'expo-media-library/legacy';
import { decode as decodeJpeg } from 'jpeg-js';
import Share, { Social } from 'react-native-share';
import { captureRef } from 'react-native-view-shot';
import { env } from '@app/lib/config/env';
import { COMBINED, STICKER_MARGIN, luminanceOf } from '@app/features/share/shareModel';

// Compartir en Instagram (handoff v2.16 §26.1, 26.8): images and where they
// go. The photo never leaves the phone except to Instagram or to Fotos
// (26.10.6).

// Each step of an export fails on its own: the real error is logged with its
// step and code, and the screen can tell a denied permission from a failure.
export type ShareStep = 'capture' | 'permission' | 'save' | 'share';

export class ShareStepError extends Error {
  readonly step: ShareStep;
  readonly code: string;
  readonly cause: unknown;

  constructor(step: ShareStep, cause: unknown) {
    const code =
      cause && typeof cause === 'object' && 'code' in cause && typeof (cause as { code: unknown }).code === 'string'
        ? (cause as { code: string }).code
        : 'unknown';
    super(`[share:${step}] ${code}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.step = step;
    this.code = code;
    this.cause = cause;
  }
}

export function logShareError(error: unknown): void {
  const stepError = error instanceof ShareStepError ? error : new ShareStepError('share', error);
  console.warn(`[share] ${stepError.step} failed (${stepError.code})`, stepError.cause);
}

// Two frames: the off-screen views of the export have been laid out and
// drawn (a tone or variant change re-renders them right before capturing).
function nextFrames(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

async function capture(ref: RefObject<unknown>, options: Parameters<typeof captureRef>[1]): Promise<string> {
  await nextFrames();
  if (!ref.current) {
    throw new ShareStepError('capture', Object.assign(new Error('The view to capture is not mounted'), { code: 'not_mounted' }));
  }
  try {
    return fileUrl(await captureRef(ref, options));
  } catch (error) {
    throw new ShareStepError('capture', error);
  }
}

// view-shot may answer a bare path; sharing and Fotos want a file URL.
export function fileUrl(uri: string): string {
  return uri.startsWith('/') ? `file://${uri}` : uri;
}

// The sticker as a transparent PNG at 3× (with its 24 pt shadow margin).
// Alpha survives: view-shot renders non-opaque on iOS (ARGB on Android) and
// neither the captured view nor its parents have a background colour.
export function captureSticker(
  ref: RefObject<unknown>,
  size: { width: number; height: number },
): Promise<string> {
  return capture(ref, {
    format: 'png',
    result: 'tmpfile',
    width: (size.width + STICKER_MARGIN * 2) * 3,
    height: (size.height + STICKER_MARGIN * 2) * 3,
  });
}

// A 9:16 scene (photo or brand background, with or without the sticker) at
// 1080 × 1920, JPG 90 %.
export function captureScene(ref: RefObject<unknown>): Promise<string> {
  return capture(ref, {
    format: 'jpg',
    quality: 0.9,
    result: 'tmpfile',
    width: COMBINED.width,
    height: COMBINED.height,
  });
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
  } catch (error) {
    logShareError(new ShareStepError('share', error));
    return 'failed';
  }
}

export type SaveResult = 'saved' | 'denied' | 'failed';

// Descargar: the combined image to Fotos with the add-only permission
// (writeOnly: NSPhotoLibraryAddUsageDescription, in Info.plist). A refusal
// is 'denied' (the screen offers Ajustes), never "inténtalo otra vez".
export async function saveToPhotos(uri: string): Promise<SaveResult> {
  let granted: boolean;
  try {
    granted = (await MediaLibrary.requestPermissionsAsync(true)).granted;
  } catch (error) {
    logShareError(new ShareStepError('permission', error));
    return 'failed';
  }
  if (!granted) {
    return 'denied';
  }
  try {
    await MediaLibrary.saveToLibraryAsync(uri);
    return 'saved';
  } catch (error) {
    logShareError(new ShareStepError('save', error));
    return 'failed';
  }
}

// Más: the system share sheet with the combined image. Cancelling is fine.
export async function shareMore(uri: string): Promise<void> {
  await Share.open({ url: uri, type: 'image/jpeg', failOnCancel: false });
}
