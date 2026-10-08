import { parseCreatePost } from '../src/features/social/feedMappers';
import {
  createPostErrorCopy,
  normalizePhotoMime,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_SIDE,
  resizedSize,
  validatePhoto,
} from '../src/features/social/postModel';
import type { CreatePostError } from '../src/features/social/postTypes';

describe('create_post answers', () => {
  it('is a success with the post id', () => {
    expect(parseCreatePost({ ok: true, created: true, post_id: 'p1' })).toEqual({
      ok: true,
      postId: 'p1',
      created: true,
    });
  });

  it('repeating the same source is a success with the same post ("ya lo compartiste")', () => {
    expect(parseCreatePost({ ok: true, created: false, post_id: 'p1' })).toEqual({
      ok: true,
      postId: 'p1',
      created: false,
    });
  });

  it('maps each error of the server', () => {
    const errors: CreatePostError[] = [
      'invalid_type',
      'category_not_shared',
      'photo_not_allowed',
      'photos_not_shared',
      'photo_not_owned',
      'invalid_source',
      'source_not_found',
      'routine_not_shareable',
      'photo_required',
    ];
    errors.forEach(error => {
      expect(parseCreatePost({ ok: false, error })).toEqual({ ok: false, error });
    });
  });

  it('does not trust an answer it does not understand', () => {
    expect(parseCreatePost({ ok: false, error: 'something_new' })).toEqual({
      ok: false,
      error: 'unknown',
    });
    expect(parseCreatePost(null)).toEqual({ ok: false, error: 'unknown' });
    // ok without a post id is not a success.
    expect(parseCreatePost({ ok: true })).toEqual({ ok: false, error: 'unknown' });
    expect(parseCreatePost([])).toEqual({ ok: false, error: 'unknown' });
  });
});

describe('message of each create_post error', () => {
  const all: CreatePostError[] = [
    'invalid_type',
    'category_not_shared',
    'photo_not_allowed',
    'photos_not_shared',
    'photo_not_owned',
    'invalid_source',
    'source_not_found',
    'routine_not_shareable',
    'photo_required',
    'photo_type',
    'photo_size',
    'validation',
    'upload_failed',
    'unknown',
  ];

  it('has a clear message for every error', () => {
    all.forEach(error => {
      const copy = createPostErrorCopy(error);
      expect(copy.message.length).toBeGreaterThan(10);
    });
  });

  it('offers Privacidad social only for what the user switched off', () => {
    const withLink = all.filter(error => createPostErrorCopy(error).goToPrivacy);
    expect(withLink).toEqual(['category_not_shared', 'photos_not_shared']);
  });

  it('says what is wrong, not just that it failed', () => {
    expect(createPostErrorCopy('photo_size').message).toContain('5 MB');
    expect(createPostErrorCopy('photo_type').message).toContain('JPG');
    expect(createPostErrorCopy('routine_not_shareable').message).toContain('rutinas que hayas creado');
    expect(createPostErrorCopy('photos_not_shared').message).toContain('fotos');
  });
});

describe('photo validation', () => {
  it('accepts JPEG, PNG and WebP up to 5 MB', () => {
    ['image/jpeg', 'image/png', 'image/webp'].forEach(mime => {
      expect(validatePhoto({ mime, sizeBytes: 1_000_000 })).toBeNull();
    });
    expect(validatePhoto({ mime: 'image/jpeg', sizeBytes: PHOTO_MAX_BYTES })).toBeNull();
  });

  it('refuses another type', () => {
    expect(validatePhoto({ mime: 'image/heic', sizeBytes: 1000 })).toBe('photo_type');
    expect(validatePhoto({ mime: 'image/gif', sizeBytes: 1000 })).toBe('photo_type');
    expect(validatePhoto({ mime: '', sizeBytes: 1000 })).toBe('photo_type');
  });

  it('refuses a photo over 5 MB or without size', () => {
    expect(validatePhoto({ mime: 'image/jpeg', sizeBytes: PHOTO_MAX_BYTES + 1 })).toBe('photo_size');
    expect(validatePhoto({ mime: 'image/jpeg', sizeBytes: 0 })).toBe('photo_size');
  });

  it('understands the way the picker names a JPEG', () => {
    expect(normalizePhotoMime('image/jpg')).toBe('image/jpeg');
    expect(normalizePhotoMime('IMAGE/JPEG')).toBe('image/jpeg');
    expect(normalizePhotoMime(undefined)).toBe('');
    expect(validatePhoto({ mime: 'image/jpg', sizeBytes: 1000 })).toBeNull();
  });
});

describe('size after resizing', () => {
  it('fits the longer side into 1440 and keeps the proportions', () => {
    expect(resizedSize(4032, 3024)).toEqual({ width: 1440, height: 1080 });
    expect(resizedSize(3024, 4032)).toEqual({ width: 1080, height: 1440 });
    expect(resizedSize(5000, 5000)).toEqual({ width: 1440, height: 1440 });
    expect(PHOTO_MAX_SIDE).toBe(1440);
  });

  it('never enlarges a photo that already fits', () => {
    expect(resizedSize(1200, 800)).toEqual({ width: 1200, height: 800 });
    expect(resizedSize(1440, 1440)).toEqual({ width: 1440, height: 1440 });
  });

  it('keeps at least one pixel on the short side of a very long photo', () => {
    expect(resizedSize(20000, 3)).toEqual({ width: 1440, height: 1 });
  });

  it('returns nothing for a size that does not exist', () => {
    expect(resizedSize(0, 100)).toEqual({ width: 0, height: 0 });
    expect(resizedSize(100, -1)).toEqual({ width: 0, height: 0 });
    expect(resizedSize(NaN, 100)).toEqual({ width: 0, height: 0 });
  });

  it('accepts another maximum', () => {
    expect(resizedSize(2000, 1000, 1000)).toEqual({ width: 1000, height: 500 });
  });
});
