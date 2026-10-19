import { catalogPerf } from '@app/lib/perf/catalogPerf';
import { getSupabaseClient } from '@app/services/supabase/client';

// exercise-media-url (docs/backend/ROUTINES_SHAPES.md · Media): signed URLs
// for 1..100 catalog keys, each with its own expiry.

export type SignedMedia = { url: string; expiresAt: number };
export type SignResult = { urls: Record<string, SignedMedia>; missing: string[] };

export const MAX_KEYS_PER_CALL = 100;
// When the answer has no expiry the URL is treated as one hour long.
const DEFAULT_TTL_MS = 60 * 60 * 1000;

const VALID_KEY = /^movekit\/(videos\/.+\.mp4|posters\/.+\.(png|jpg|webp)|thumbs\/.+\.webp)$/;

export function isMediaKey(key: unknown): key is string {
  return typeof key === 'string' && VALID_KEY.test(key);
}

// ISO string, epoch seconds or epoch milliseconds.
export function parseExpiry(value: unknown, now: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return now + DEFAULT_TTL_MS;
}

export function parseSignResult(body: unknown, now: number): SignResult {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const urls: Record<string, SignedMedia> = {};
  const raw = record.urls && typeof record.urls === 'object' ? (record.urls as Record<string, unknown>) : {};
  Object.entries(raw).forEach(([key, value]) => {
    if (typeof value === 'string') {
      urls[key] = { url: value, expiresAt: now + DEFAULT_TTL_MS };
      return;
    }
    const entry = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
    if (entry && typeof entry.url === 'string') {
      urls[key] = { url: entry.url, expiresAt: parseExpiry(entry.expires_at, now) };
    }
  });
  const missing = Array.isArray(record.missing)
    ? record.missing.filter((item): item is string => typeof item === 'string')
    : [];
  return { urls, missing };
}

export type SignKeys = (keys: string[]) => Promise<SignResult>;

// One call for up to 100 keys.
export const signMediaKeys: SignKeys = async keys => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }
  const startedAt = Date.now();
  const { data, error } = await client.functions.invoke('exercise-media-url', {
    body: { keys: keys.slice(0, MAX_KEYS_PER_CALL) },
  });
  if (error) {
    throw error;
  }
  catalogPerf.answer('exercise-media-url', startedAt, data, `${keys.length} claves`);
  return parseSignResult(data, Date.now());
};
