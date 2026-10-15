import {
  ImageTooLargeError,
  MAX_BYTES,
  QUALITY_STEPS,
  TARGET_BYTES,
  base64Bytes,
  fitSize,
  prepareImage,
  uploadPath,
  uploadVisionImage,
  type ImageEngine,
} from '../src/features/vision/imageUpload';

// A base64 string that decodes to `bytes` bytes.
const base64Of = (bytes: number) => 'A'.repeat(Math.ceil((bytes * 4) / 3));

function engine(source: { width: number; height: number }, sizes: Record<number, number>) {
  const renders: { target: { width: number; height: number } | null; quality: number }[] = [];
  const fake: ImageEngine = {
    size: async () => source,
    render: async (uri, target, quality) => {
      renders.push({ target, quality });
      const size = target ?? source;
      return { uri: `file://out-${quality}.jpg`, width: size.width, height: size.height, base64: base64Of(sizes[quality] ?? 1000) };
    },
  };
  return { fake, renders };
}

describe('upload paths', () => {
  it('meals, machines and chat each go to their folder of the user', () => {
    expect(uploadPath('meal', 'u1', 'abc')).toBe('u1/meals/abc.jpg');
    expect(uploadPath('machine', 'u1', 'abc')).toBe('u1/machines/abc.jpg');
    expect(uploadPath('chat', 'u1', 'abc')).toBe('u1/abc.jpg');
  });
});

describe('image size', () => {
  it('shrinks the long side to 1600 px keeping the ratio, never enlarges', () => {
    expect(fitSize(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(fitSize(3024, 4032)).toEqual({ width: 1200, height: 1600 });
    expect(fitSize(1200, 800)).toEqual({ width: 1200, height: 800 });
  });

  it('counts the bytes of a base64 string', () => {
    expect(base64Bytes('AAAA')).toBe(3);
    expect(base64Bytes('AAA=')).toBe(2);
    expect(base64Bytes('AA==')).toBe(1);
  });
});

describe('prepareImage (always JPEG, under 5 MB)', () => {
  it('resizes a big photo (a HEIC original included) and keeps the first quality that fits', async () => {
    const { fake, renders } = engine({ width: 4032, height: 3024 }, { 0.8: 900_000 });
    const prepared = await prepareImage('file://photo.heic', fake);
    expect(renders).toEqual([{ target: { width: 1600, height: 1200 }, quality: 0.8 }]);
    expect(prepared).toMatchObject({ width: 1600, height: 1200, quality: 0.8 });
    expect(prepared.bytes).toBeLessThanOrEqual(TARGET_BYTES);
  });

  it('does not resize a small photo', async () => {
    const { fake, renders } = engine({ width: 1000, height: 800 }, { 0.8: 200_000 });
    await prepareImage('file://small.jpg', fake);
    expect(renders[0].target).toBeNull();
  });

  it('lowers the quality until it fits', async () => {
    const { fake, renders } = engine(
      { width: 4000, height: 3000 },
      { 0.8: 6_000_000, 0.65: 5_000_000, 0.5: 4_000_000 },
    );
    const prepared = await prepareImage('file://photo.jpg', fake);
    expect(renders.map(render => render.quality)).toEqual([0.8, 0.65, 0.5]);
    expect(prepared.quality).toBe(0.5);
    expect(prepared.bytes).toBeLessThan(MAX_BYTES);
  });

  it('refuses what cannot go under 5 MB even at the lowest quality', async () => {
    const sizes = Object.fromEntries(QUALITY_STEPS.map(quality => [quality, 9_000_000]));
    const { fake } = engine({ width: 4000, height: 3000 }, sizes);
    await expect(prepareImage('file://huge.jpg', fake)).rejects.toBeInstanceOf(ImageTooLargeError);
  });
});

describe('uploadVisionImage', () => {
  it('uploads the JPEG to the path of its case and returns the path to send', async () => {
    const { fake } = engine({ width: 3000, height: 2000 }, { 0.8: 300_000 });
    const put = jest.fn(async () => undefined);
    const result = await uploadVisionImage(
      { kind: 'meal', userId: 'user-1', uri: 'file://plate.heic' },
      { engine: fake, newId: () => 'uuid-1', put },
    );
    expect(result.path).toBe('user-1/meals/uuid-1.jpg');
    expect(result.uri).toBe('file://out-0.8.jpg');
    expect(put).toHaveBeenCalledTimes(1);
    const [path, bytes] = put.mock.calls[0] as unknown as [string, ArrayBuffer];
    expect(path).toBe('user-1/meals/uuid-1.jpg');
    expect(bytes.byteLength).toBeGreaterThan(200_000);
  });

  it('the chat and machine photos use their own folders', async () => {
    const { fake } = engine({ width: 800, height: 600 }, { 0.8: 50_000 });
    const put = jest.fn(async () => undefined);
    const chat = await uploadVisionImage({ kind: 'chat', userId: 'u', uri: 'x' }, { engine: fake, newId: () => 'a', put });
    const machine = await uploadVisionImage({ kind: 'machine', userId: 'u', uri: 'x' }, { engine: fake, newId: () => 'b', put });
    expect(chat.path).toBe('u/a.jpg');
    expect(machine.path).toBe('u/machines/b.jpg');
  });

  it('a failed upload throws (the caller can retry the same photo)', async () => {
    const { fake } = engine({ width: 800, height: 600 }, { 0.8: 50_000 });
    await expect(
      uploadVisionImage({ kind: 'meal', userId: 'u', uri: 'x' }, { engine: fake, put: async () => Promise.reject(new Error('offline')) }),
    ).rejects.toThrow('offline');
  });
});
