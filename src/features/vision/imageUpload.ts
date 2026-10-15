import { decode } from 'base64-arraybuffer';
import { createUuid } from '@app/lib/uuid';
import { getSupabaseClient } from '@app/services/supabase/client';

// Photos for ELLIE (docs/backend/VISION_SHAPES.md §1): shrunk to a JPEG of at
// most ~1600 px on its long side and 5 MB (HEIC included: the result is always
// JPEG), then uploaded to the private bucket `ellie-uploads` under the folder
// of the user.

export const UPLOAD_BUCKET = 'ellie-uploads';
export const MAX_SIDE_PX = 1600;
export const MAX_BYTES = 5 * 1024 * 1024;
// Stays under the limit with room for the HTTP overhead.
export const TARGET_BYTES = 4_500_000;
// Quality ladder: the first that fits is used.
export const QUALITY_STEPS = [0.8, 0.65, 0.5, 0.35] as const;

export type UploadKind = 'meal' | 'machine' | 'chat';

// <uid>/meals/<uuid>.jpg · <uid>/machines/<uuid>.jpg · <uid>/<uuid>.jpg
export function uploadPath(kind: UploadKind, userId: string, id: string): string {
  const folder = kind === 'meal' ? 'meals/' : kind === 'machine' ? 'machines/' : '';
  return `${userId}/${folder}${id}.jpg`;
}

// Output size for a source: the long side shrinks to `maxSide`, never grows.
export function fitSize(
  width: number,
  height: number,
  maxSide = MAX_SIDE_PX,
): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= maxSide || long <= 0) {
    return { width, height };
  }
  const scale = maxSide / long;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// bytes of a base64 string
export function base64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export type RenderedImage = { uri: string; width: number; height: number; base64: string };

// What the platform does for us (expo-image-manipulator); injectable in tests.
export type ImageEngine = {
  size(uri: string): Promise<{ width: number; height: number }>;
  // Resizes to `width` x `height` (or leaves it as is) and encodes as JPEG.
  render(
    uri: string,
    target: { width: number; height: number } | null,
    quality: number,
  ): Promise<RenderedImage>;
};

export type PreparedImage = RenderedImage & { bytes: number; quality: number };

export class ImageTooLargeError extends Error {
  constructor() {
    super('image_too_large');
    this.name = 'ImageTooLargeError';
  }
}

// Shrinks and re-encodes as JPEG, lowering the quality until it fits.
export async function prepareImage(uri: string, engine: ImageEngine = expoImageEngine): Promise<PreparedImage> {
  const source = await engine.size(uri);
  const target = fitSize(source.width, source.height);
  const shrink = target.width !== source.width || target.height !== source.height ? target : null;
  let last: PreparedImage | null = null;
  for (const quality of QUALITY_STEPS) {
    const image = await engine.render(uri, shrink, quality);
    const bytes = base64Bytes(image.base64);
    last = { ...image, bytes, quality };
    if (bytes <= TARGET_BYTES) {
      return last;
    }
  }
  if (last && last.bytes <= MAX_BYTES) {
    return last;
  }
  throw new ImageTooLargeError();
}

export const expoImageEngine: ImageEngine = {
  async size(uri) {
    const { ImageManipulator } = require('expo-image-manipulator') as typeof import('expo-image-manipulator');
    const context = ImageManipulator.manipulate(uri);
    const image = await context.renderAsync();
    const size = { width: image.width, height: image.height };
    image.release();
    context.release();
    return size;
  },
  async render(uri, target, quality) {
    const { ImageManipulator, SaveFormat } =
      require('expo-image-manipulator') as typeof import('expo-image-manipulator');
    const context = ImageManipulator.manipulate(uri);
    if (target) {
      context.resize({ width: target.width, height: target.height });
    }
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: quality, base64: true });
    image.release();
    context.release();
    return { uri: saved.uri, width: saved.width, height: saved.height, base64: saved.base64 ?? '' };
  },
};

export type UploadDeps = {
  engine?: ImageEngine;
  newId?: () => string;
  // Puts the bytes in storage; resolves when done.
  put?: (path: string, bytes: ArrayBuffer) => Promise<void>;
};

async function putToStorage(path: string, bytes: ArrayBuffer): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }
  const { error } = await client.storage.from(UPLOAD_BUCKET).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) {
    throw error;
  }
}

export type UploadedImage = {
  // The path to send as `image_path`.
  path: string;
  // The re-encoded local file (for the preview, no download needed).
  uri: string;
  bytes: number;
};

export async function uploadVisionImage(
  input: { kind: UploadKind; userId: string; uri: string },
  deps: UploadDeps = {},
): Promise<UploadedImage> {
  const prepared = await prepareImage(input.uri, deps.engine);
  const path = uploadPath(input.kind, input.userId, (deps.newId ?? createUuid)());
  await (deps.put ?? putToStorage)(path, decode(prepared.base64));
  return { path, uri: prepared.uri, bytes: prepared.bytes };
}
