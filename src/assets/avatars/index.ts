import type { ImageSourcePropType } from 'react-native';
import type {
  AvatarKey,
  AvatarOption,
  ProfileIdentity,
} from '@app/types/profileIdentity';

const avatarMale01 = require('./avatar_male_01.png');
const avatarMale02 = require('./avatar_male_02.png');
const avatarMale03 = require('./avatar_male_03.png');
const avatarFemale01 = require('./avatar_female_01.png');
const avatarFemale02 = require('./avatar_female_02.png');
const avatarFemale03 = require('./avatar_female_03.png');
const avatarNeutral01 = require('./avatar_neutral_01.png');
const avatarNeutral02 = require('./avatar_neutral_02.png');

export const DEFAULT_AVATAR_KEY: AvatarKey = 'avatar_neutral_01';

export const AVATAR_OPTIONS: readonly AvatarOption[] = [
  {
    key: 'avatar_male_01',
    label: 'Atlético',
    image: avatarMale01,
  },
  {
    key: 'avatar_male_02',
    label: 'Fuerza',
    image: avatarMale02,
  },
  {
    key: 'avatar_male_03',
    label: 'Rendimiento',
    image: avatarMale03,
  },
  {
    key: 'avatar_neutral_01',
    label: 'Impulso',
    image: avatarNeutral01,
  },
  {
    key: 'avatar_female_01',
    label: 'Energía',
    image: avatarFemale01,
  },
  {
    key: 'avatar_female_02',
    label: 'Potencia',
    image: avatarFemale02,
  },
  {
    key: 'avatar_female_03',
    label: 'Equilibrio',
    image: avatarFemale03,
  },
  {
    key: 'avatar_neutral_02',
    label: 'Enfoque',
    image: avatarNeutral02,
  },
];

const avatarMap = new Map(
  AVATAR_OPTIONS.map(option => [option.key, option] as const),
);

const legacyAvatarMap: Record<string, AvatarKey> = {
  ember: 'avatar_male_01',
  stone: 'avatar_male_02',
  graphite: 'avatar_male_03',
  silver: 'avatar_female_01',
  chalk: 'avatar_female_02',
  onyx: 'avatar_neutral_02',
};

export function isAvatarKey(value: unknown): value is AvatarKey {
  return typeof value === 'string' && avatarMap.has(value as AvatarKey);
}

export function normalizeAvatarKey(value?: string | null): AvatarKey | null {
  if (!value) {
    return null;
  }

  if (isAvatarKey(value)) {
    return value;
  }

  return legacyAvatarMap[value] ?? null;
}

export function getAvatarByKey(value?: string | null): AvatarOption {
  const key = normalizeAvatarKey(value) ?? DEFAULT_AVATAR_KEY;
  return avatarMap.get(key) ?? avatarMap.get(DEFAULT_AVATAR_KEY)!;
}

export function getAvatarSource(value?: string | null): ImageSourcePropType {
  return getAvatarByKey(value).image;
}

export function getProfileIdentitySource(
  identity: ProfileIdentity,
): ImageSourcePropType {
  const profilePhotoUrl = identity.profilePhotoUrl?.trim();

  if (profilePhotoUrl) {
    return { uri: profilePhotoUrl };
  }

  return getAvatarSource(identity.avatarKey);
}
