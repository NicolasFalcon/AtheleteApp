import { decode } from 'base64-arraybuffer';
import { getSupabaseClient } from '@app/services/supabase/client';

const PROFILE_PHOTOS_BUCKET = 'profile-photos';
const MAX_PROFILE_PHOTO_BYTES = 3 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const SIGNED_URL_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const signedUrlCache = new Map<
  string,
  {
    expiresAt: number;
    url: string;
  }
>();
const pendingSignedUrls = new Map<string, Promise<string>>();

type ProfilePhotoUpload = {
  base64: string;
  contentType: string;
  fileSize?: number;
};

function decodeStoragePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function getDirectProfilePhotoUri(
  reference?: string | null,
): string | null {
  const value = reference?.trim();

  if (
    value?.startsWith('file:') ||
    value?.startsWith('content:') ||
    value?.startsWith('ph:') ||
    value?.startsWith('assets-library:') ||
    value?.startsWith('data:') ||
    value?.startsWith('blob:')
  ) {
    return value;
  }

  return null;
}

export function getProfilePhotoStoragePath(
  reference?: string | null,
): string | null {
  const value = reference?.trim();

  if (!value || getDirectProfilePhotoUri(value)) {
    return null;
  }

  if (!/^https?:\/\//i.test(value)) {
    return value.replace(/^\/+/, '');
  }

  try {
    const pathname = new URL(value).pathname;
    const markers = [
      `/storage/v1/object/public/${PROFILE_PHOTOS_BUCKET}/`,
      `/storage/v1/object/sign/${PROFILE_PHOTOS_BUCKET}/`,
      `/storage/v1/object/authenticated/${PROFILE_PHOTOS_BUCKET}/`,
    ];

    for (const marker of markers) {
      const markerIndex = pathname.indexOf(marker);

      if (markerIndex >= 0) {
        return decodeStoragePath(
          pathname.slice(markerIndex + marker.length),
        ).replace(/^\/+/, '');
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeProfilePhotoReference(
  reference?: string | null,
): string | null {
  const value = reference?.trim();

  if (!value) {
    return null;
  }

  return getProfilePhotoStoragePath(value) ?? value;
}

export function invalidateProfilePhotoSignedUrl(reference?: string | null) {
  const path = getProfilePhotoStoragePath(reference);

  if (path) {
    signedUrlCache.delete(path);
    pendingSignedUrls.delete(path);
  }
}

export async function resolveProfilePhotoUri(
  reference?: string | null,
): Promise<string | null> {
  const directUri = getDirectProfilePhotoUri(reference);

  if (directUri) {
    return directUri;
  }

  const path = getProfilePhotoStoragePath(reference);

  if (!path) {
    return null;
  }

  const cached = signedUrlCache.get(path);

  if (
    cached &&
    cached.expiresAt - SIGNED_URL_REFRESH_BUFFER_MS > Date.now()
  ) {
    return cached.url;
  }

  const pending = pendingSignedUrls.get(path);

  if (pending) {
    return pending;
  }

  const request = (async () => {
    const client = getSupabaseClient();

    if (!client) {
      throw new Error('Supabase no está configurado.');
    }

    const { data, error } = await client.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      throw new Error('No pudimos cargar la foto de perfil.');
    }

    signedUrlCache.set(path, {
      expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
      url: data.signedUrl,
    });

    return data.signedUrl;
  })();

  pendingSignedUrls.set(path, request);

  try {
    return await request;
  } finally {
    pendingSignedUrls.delete(path);
  }
}

// Signs several photos with one request (createSignedUrls) and fills the same
// cache `resolveProfilePhotoUri` reads, so a list of people (Amigos) does not
// sign one photo per row. Best effort: a photo that fails to sign is signed
// later by its avatar, as before.
export async function prefetchProfilePhotoUris(
  references: ReadonlyArray<string | null | undefined>,
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  const paths = Array.from(
    new Set(
      references
        .map(reference => getProfilePhotoStoragePath(reference))
        .filter((path): path is string => {
          if (!path) {
            return false;
          }
          const cached = signedUrlCache.get(path);
          return !(
            cached && cached.expiresAt - SIGNED_URL_REFRESH_BUFFER_MS > Date.now()
          );
        }),
    ),
  );
  if (paths.length === 0) {
    return;
  }

  const { data, error } = await client.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    return;
  }

  data.forEach(item => {
    if (item.path && item.signedUrl) {
      signedUrlCache.set(item.path, {
        expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
        url: item.signedUrl,
      });
    }
  });
}

export async function uploadProfilePhoto(
  userId: string,
  photo: ProfilePhotoUpload,
): Promise<string> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  if (!ALLOWED_CONTENT_TYPES.has(photo.contentType)) {
    throw new Error('Selecciona una imagen JPG, PNG o WebP.');
  }

  if (photo.fileSize && photo.fileSize > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error('La foto debe pesar menos de 3 MB.');
  }

  const imageData = decode(photo.base64);

  if (imageData.byteLength > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error('La foto debe pesar menos de 3 MB.');
  }

  const path = `${userId}/avatar`;
  const { error } = await client.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(path, imageData, {
      cacheControl: '3600',
      contentType: photo.contentType,
      upsert: true,
    });

  if (error) {
    throw new Error('No pudimos guardar la foto. Inténtalo nuevamente.');
  }

  invalidateProfilePhotoSignedUrl(path);

  return path;
}
