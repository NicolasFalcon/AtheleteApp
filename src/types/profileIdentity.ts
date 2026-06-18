import type { ImageSourcePropType } from 'react-native';

export type AvatarKey =
  | 'avatar_male_01'
  | 'avatar_male_02'
  | 'avatar_male_03'
  | 'avatar_female_01'
  | 'avatar_female_02'
  | 'avatar_female_03'
  | 'avatar_neutral_01'
  | 'avatar_neutral_02';

export type AvatarOption = {
  key: AvatarKey;
  label: string;
  image: ImageSourcePropType;
};

export type ProfileIdentity = {
  avatarKey?: AvatarKey | null;
  profilePhotoUrl?: string | null;
};
