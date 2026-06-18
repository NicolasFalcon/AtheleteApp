const mockCreateSignedUrl = jest.fn();
const mockUpload = jest.fn();
const mockFrom = jest.fn(() => ({
  createSignedUrl: mockCreateSignedUrl,
  upload: mockUpload,
}));

jest.mock('../src/services/supabase/client', () => ({
  getSupabaseClient: () => ({
    storage: {
      from: mockFrom,
    },
  }),
}));

import {
  getDirectProfilePhotoUri,
  getProfilePhotoStoragePath,
  invalidateProfilePhotoSignedUrl,
  normalizeProfilePhotoReference,
  resolveProfilePhotoUri,
  uploadProfilePhoto,
} from '../src/services/supabase/profile-photo';

describe('private profile photo storage', () => {
  beforeEach(() => {
    mockCreateSignedUrl.mockReset();
    mockUpload.mockReset();
    mockFrom.mockClear();
    invalidateProfilePhotoSignedUrl('user-1/avatar');
  });

  it('keeps local picker previews as direct URIs', async () => {
    expect(getDirectProfilePhotoUri('file:///tmp/avatar.jpg')).toBe(
      'file:///tmp/avatar.jpg',
    );
    await expect(
      resolveProfilePhotoUri('file:///tmp/avatar.jpg'),
    ).resolves.toBe('file:///tmp/avatar.jpg');
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it('extracts a stable path from legacy public URLs', () => {
    const legacyUrl =
      'https://project.supabase.co/storage/v1/object/public/profile-photos/user-1/avatar?v=123';

    expect(getProfilePhotoStoragePath(legacyUrl)).toBe('user-1/avatar');
    expect(normalizeProfilePhotoReference(legacyUrl)).toBe('user-1/avatar');
  });

  it('creates and caches a signed URL for private objects', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://project.supabase.co/signed/avatar' },
      error: null,
    });

    await expect(resolveProfilePhotoUri('user-1/avatar')).resolves.toBe(
      'https://project.supabase.co/signed/avatar',
    );
    await expect(resolveProfilePhotoUri('user-1/avatar')).resolves.toBe(
      'https://project.supabase.co/signed/avatar',
    );

    expect(mockFrom).toHaveBeenCalledWith('profile-photos');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('user-1/avatar', 3600);
    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('fails cleanly when Supabase cannot sign the object', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: new Error('Object not found'),
    });

    await expect(resolveProfilePhotoUri('user-1/avatar')).rejects.toThrow(
      'No pudimos cargar la foto de perfil.',
    );
  });

  it('uploads to the private bucket and returns the stable object path', async () => {
    mockUpload.mockResolvedValue({ error: null });

    await expect(
      uploadProfilePhoto('user-1', {
        base64: 'aGVsbG8=',
        contentType: 'image/jpeg',
        fileSize: 5,
      }),
    ).resolves.toBe('user-1/avatar');

    expect(mockFrom).toHaveBeenCalledWith('profile-photos');
    expect(mockUpload).toHaveBeenCalledWith(
      'user-1/avatar',
      expect.any(ArrayBuffer),
      {
        cacheControl: '3600',
        contentType: 'image/jpeg',
        upsert: true,
      },
    );
  });
});
