import {
  DEFAULT_AVATAR_KEY,
  getAvatarByKey,
  getProfileIdentitySource,
  normalizeAvatarKey,
} from '../src/assets/avatars';

describe('avatar catalog', () => {
  it('normalizes valid and legacy avatar keys', () => {
    expect(normalizeAvatarKey('avatar_female_02')).toBe('avatar_female_02');
    expect(normalizeAvatarKey('ember')).toBe('avatar_male_01');
    expect(normalizeAvatarKey('unknown')).toBeNull();
  });

  it('uses the default avatar for an unknown key', () => {
    expect(getAvatarByKey('unknown').key).toBe(DEFAULT_AVATAR_KEY);
  });

  it('prioritizes a profile photo URL', () => {
    expect(
      getProfileIdentitySource({
        avatarKey: 'avatar_male_01',
        profilePhotoUrl: 'https://example.com/profile.jpg',
      }),
    ).toEqual({ uri: 'https://example.com/profile.jpg' });
  });

  it('falls back to the selected avatar when no photo exists', () => {
    expect(
      getProfileIdentitySource({
        avatarKey: 'avatar_female_03',
        profilePhotoUrl: null,
      }),
    ).toBe(getAvatarByKey('avatar_female_03').image);
  });
});
