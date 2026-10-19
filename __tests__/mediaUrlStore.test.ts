import { signedImageSource } from '../src/lib/media/imageSource';
import { createMediaUrlStore } from '../src/lib/media/mediaUrlStore';
import { isMediaKey, parseSignResult, type SignResult } from '../src/services/media/mediaService';

const HOUR = 60 * 60 * 1000;
const thumb = (index: number) => `movekit/thumbs/ex-${index}.webp`;

function setup(start = 1_000_000) {
  let now = start;
  let version = 0;
  const sign = jest.fn(async (keys: string[]): Promise<SignResult> => {
    version += 1;
    return {
      urls: Object.fromEntries(
        keys.map(key => [key, { url: `https://r2/${key}?sig=${version}`, expiresAt: now + HOUR }]),
      ),
      missing: [],
    };
  });
  const store = createMediaUrlStore({ sign, now: () => now, batchDelayMs: 0 });
  return { store, sign, advance: (ms: number) => (now += ms) };
}

describe('exercise-media-url signing', () => {
  it('one call for the keys of a page (≤ 100), none for fresh keys', async () => {
    const { store, sign } = setup();
    const page = Array.from({ length: 30 }, (_, index) => thumb(index));
    await Promise.all(page.map(key => store.request([key])));
    expect(sign).toHaveBeenCalledTimes(1);
    expect(sign.mock.calls[0][0]).toHaveLength(30);
    await store.request(page);
    expect(sign).toHaveBeenCalledTimes(1);
  });

  it('more than 100 keys go in chunks of 100', async () => {
    const { store, sign } = setup();
    await store.request(Array.from({ length: 150 }, (_, index) => thumb(index)));
    expect(sign.mock.calls.map(call => call[0].length)).toEqual([100, 50]);
  });

  it('renews before expires_at, and the image cache key stays the key', async () => {
    const { store, sign, advance } = setup();
    const key = thumb(1);
    await store.request([key]);
    const firstUrl = store.url(key)!;
    advance(HOUR - 4 * 60 * 1000); // inside the 5 min margin
    await store.request([key]);
    const renewed = store.url(key)!;
    expect(sign).toHaveBeenCalledTimes(2);
    expect(renewed).not.toBe(firstUrl);
    // Same cacheKey with both URLs: the renewed signature does not download again.
    expect(signedImageSource(firstUrl, key).cacheKey).toBe(key);
    expect(signedImageSource(renewed, key)).toEqual({ uri: renewed, cacheKey: key });
  });

  it('keeps the URLs on the phone for the next launch (expired ones are dropped)', async () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: async (key: string) => data.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        data.set(key, value);
      },
    };
    const sign = jest.fn(async (keys: string[]): Promise<SignResult> => ({
      urls: Object.fromEntries(keys.map(key => [key, { url: `https://r2/${key}`, expiresAt: Date.now() + HOUR }])),
      missing: [],
    }));
    const first = createMediaUrlStore({ sign, storage, batchDelayMs: 0 });
    await first.request([thumb(1)]);
    await new Promise<void>(resolve => setTimeout(resolve, 900));

    const second = createMediaUrlStore({ sign, storage, batchDelayMs: 0 });
    await second.request([thumb(1)]);
    expect(second.url(thumb(1))).toBe(`https://r2/${thumb(1)}`);
    expect(sign).toHaveBeenCalledTimes(1);
  });

  it('only catalog keys; a missing key is not asked again at once', async () => {
    const sign = jest.fn(async (keys: string[]): Promise<SignResult> => ({ urls: {}, missing: keys }));
    const store = createMediaUrlStore({ sign, batchDelayMs: 0 });
    await store.request(['https://elsewhere/x.png', null, thumb(9)]);
    await store.request([thumb(9)]);
    expect(sign).toHaveBeenCalledTimes(1);
    expect(sign.mock.calls[0][0]).toEqual([thumb(9)]);
    expect(isMediaKey('movekit/videos/a.mp4')).toBe(true);
    expect(isMediaKey('movekit/posters/a.gif')).toBe(false);
  });

  it('reads the contract answer (expires_at as ISO or epoch)', () => {
    const now = Date.parse('2026-10-16T12:00:00Z');
    expect(
      parseSignResult(
        {
          urls: {
            a: { url: 'https://a', expires_at: '2026-10-16T13:00:00Z' },
            b: { url: 'https://b', expires_at: 1_792_155_600 },
          },
          missing: ['c'],
        },
        now,
      ),
    ).toEqual({
      urls: {
        a: { url: 'https://a', expiresAt: Date.parse('2026-10-16T13:00:00Z') },
        b: { url: 'https://b', expiresAt: 1_792_155_600_000 },
      },
      missing: ['c'],
    });
  });
});
