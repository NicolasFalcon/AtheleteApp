import { useEffect, useState } from 'react';
import {
  Image,
  type ImageStyle,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { getProfileIdentitySource } from '@app/assets/avatars';
import { useAppTheme } from '@app/hooks/useAppTheme';
import {
  getDirectProfilePhotoUri,
  invalidateProfilePhotoSignedUrl,
  resolveProfilePhotoUri,
} from '@app/services/supabase/profile-photo';
import type { ProfileIdentity } from '@app/types/profileIdentity';

type ProfileAvatarProps = ProfileIdentity & {
  size?: number;
  borderRadius?: number;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export function ProfileAvatar({
  avatarKey,
  profilePhotoUrl,
  size = 64,
  borderRadius = size / 2,
  selected = false,
  style,
  imageStyle,
}: ProfileAvatarProps) {
  const { theme } = useAppTheme();
  const [failedPhotoReference, setFailedPhotoReference] = useState<
    string | null
  >(null);
  const [resolvedPhotoUri, setResolvedPhotoUri] = useState<string | null>(() =>
    getDirectProfilePhotoUri(profilePhotoUrl),
  );
  const [resolvedPhotoReference, setResolvedPhotoReference] = useState<
    string | null
  >(profilePhotoUrl ?? null);

  useEffect(() => {
    let active = true;
    const directUri = getDirectProfilePhotoUri(profilePhotoUrl);

    setFailedPhotoReference(null);
    setResolvedPhotoUri(directUri);
    setResolvedPhotoReference(profilePhotoUrl ?? null);

    if (!profilePhotoUrl || directUri) {
      return () => {
        active = false;
      };
    }

    resolveProfilePhotoUri(profilePhotoUrl)
      .then(uri => {
        if (active) {
          setResolvedPhotoUri(uri);
          setResolvedPhotoReference(profilePhotoUrl);
          setFailedPhotoReference(uri ? null : profilePhotoUrl);
        }
      })
      .catch(() => {
        if (active) {
          setResolvedPhotoUri(null);
          setResolvedPhotoReference(profilePhotoUrl);
          setFailedPhotoReference(profilePhotoUrl);
        }
      });

    return () => {
      active = false;
    };
  }, [profilePhotoUrl]);

  const photoFailed =
    Boolean(profilePhotoUrl) && failedPhotoReference === profilePhotoUrl;
  const currentPhotoUri =
    resolvedPhotoReference === (profilePhotoUrl ?? null)
      ? resolvedPhotoUri
      : getDirectProfilePhotoUri(profilePhotoUrl);
  const source = getProfileIdentitySource({
    avatarKey,
    profilePhotoUrl: photoFailed ? null : currentPhotoUri,
  });

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius,
          borderColor: selected
            ? theme.colors.textPrimary
            : theme.mode === 'light'
            ? 'rgba(17,17,17,0.08)'
            : theme.colors.border,
          backgroundColor: theme.colors.surfaceMuted,
        },
        theme.mode === 'light' ? styles.lightShadow : styles.noShadow,
        style,
      ]}
    >
      <Image
        onError={() => {
          if (currentPhotoUri && profilePhotoUrl) {
            invalidateProfilePhotoSignedUrl(profilePhotoUrl);
            setFailedPhotoReference(profilePhotoUrl);
          }
        }}
        resizeMode="cover"
        source={source}
        style={[
          styles.image,
          {
            borderRadius: Math.max(0, borderRadius - 2),
          },
          imageStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 2,
  },
  lightShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 2,
  },
  noShadow: {
    shadowOpacity: 0,
    elevation: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
