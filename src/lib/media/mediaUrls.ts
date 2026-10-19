import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMediaUrlStore } from '@app/lib/media/mediaUrlStore';
import { signMediaKeys } from '@app/services/media/mediaService';

// The app's single store of signed catalog URLs (see mediaUrlStore).
export const mediaUrls = createMediaUrlStore({
  sign: signMediaKeys,
  storage: AsyncStorage,
});

// Signs the keys of one page in a single call (before its rows render).
export function prefetchMediaKeys(keys: readonly (string | null | undefined)[]): Promise<void> {
  return mediaUrls.request(keys);
}

// The signed URL of a key, renewed before it expires. null while signing,
// without a key or when the key cannot be signed.
export function useMediaUrl(key: string | null | undefined): string | null {
  const url = useSyncExternalStore(mediaUrls.subscribe, () =>
    key ? mediaUrls.url(key) : null,
  );

  useEffect(() => {
    if (!key) {
      return undefined;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const renew = () => {
      mediaUrls
        .request([key])
        .then(() => {
          const at = mediaUrls.renewAt(key);
          if (cancelled || at === null) {
            return;
          }
          timer = setTimeout(renew, Math.max(1000, at - Date.now()));
        })
        .catch(() => undefined);
    };
    renew();
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [key]);

  return url;
}

// The first URL of a key, kept while the screen lives: a playing video is not
// reloaded when its URL is renewed.
export function useLatchedMediaUrl(key: string | null | undefined): string | null {
  const url = useMediaUrl(key);
  const [latched, setLatched] = useState<string | null>(url);
  const keyRef = useRef(key);
  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      setLatched(url);
      return;
    }
    if (!latched && url) {
      setLatched(url);
    }
  }, [key, latched, url]);
  return latched ?? url;
}
