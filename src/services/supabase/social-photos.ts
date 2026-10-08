import { getSupabaseClient } from '@app/services/supabase/client';

// Photos of posts live in the private bucket `social-photos`
// (`{author}/{post_id}/file`); `photo_path` is a storage path, not a URL, so
// each one is shown through a signed URL. Cached like profile photos, and
// signed in one request per page of the feed.
const BUCKET = 'social-photos';
const TTL_SECONDS = 60 * 60;
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

const cache = new Map<string, { expiresAt: number; url: string }>();
const pending = new Map<string, Promise<string | null>>();

function fresh(path: string): string | null {
  const cached = cache.get(path);
  return cached && cached.expiresAt - REFRESH_BUFFER_MS > Date.now() ? cached.url : null;
}

function remember(path: string, url: string) {
  cache.set(path, { expiresAt: Date.now() + TTL_SECONDS * 1000, url });
}

export function clearSocialPhotoCache() {
  cache.clear();
  pending.clear();
}

// Signs many photos at once (one `createSignedUrls`), skipping the cached ones.
// Best effort: whatever fails is signed alone when its card asks for it.
export async function prefetchSocialPhotoUrls(
  paths: ReadonlyArray<string | null | undefined>,
): Promise<void> {
  const client = getSupabaseClient();
  const missing = Array.from(
    new Set(paths.filter((path): path is string => Boolean(path) && fresh(path as string) === null)),
  );
  if (!client || missing.length === 0) {
    return;
  }
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrls(missing, TTL_SECONDS);
  if (error || !data) {
    return;
  }
  data.forEach(item => {
    if (item.path && item.signedUrl) {
      remember(item.path, item.signedUrl);
    }
  });
}

// URL of one photo (cache first); null when it cannot be signed (the card
// shows its placeholder).
export async function resolveSocialPhotoUrl(path: string): Promise<string | null> {
  const cached = fresh(path);
  if (cached) {
    return cached;
  }
  const inFlight = pending.get(path);
  if (inFlight) {
    return inFlight;
  }
  const request = (async () => {
    const client = getSupabaseClient();
    if (!client) {
      return null;
    }
    const { data, error } = await client.storage
      .from(BUCKET)
      .createSignedUrl(path, TTL_SECONDS);
    if (error || !data?.signedUrl) {
      return null;
    }
    remember(path, data.signedUrl);
    return data.signedUrl;
  })();
  pending.set(path, request);
  try {
    return await request;
  } finally {
    pending.delete(path);
  }
}
