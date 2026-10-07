import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ProfileAvatar } from '@app/components/profile/ProfileAvatar';
import { normalizeAvatarKey } from '@app/assets/avatars';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import { canShowRealPhoto, initialsOf } from '@app/features/social/socialModel';
import type { RelationshipState } from '@app/features/social/socialTypes';

export type PersonAvatarProps = {
  name: string;
  avatarKey?: string | null;
  profilePhotoUrl?: string | null;
  // Decides whether a real photo may be shown (DA-119).
  relationship: RelationshipState;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

// Avatar of another person. The real profile photo is shown only to the
// owner and to friends; anyone else gets initials, even when the storage
// policy would allow the photo (DA-119).
export function PersonAvatar({
  name,
  avatarKey,
  profilePhotoUrl,
  relationship,
  size = 48,
  style,
}: PersonAvatarProps) {
  const { colors } = useThemeV2();

  if (canShowRealPhoto(relationship)) {
    return (
      <ProfileAvatar
        avatarKey={normalizeAvatarKey(avatarKey)}
        profilePhotoUrl={profilePhotoUrl || null}
        size={size}
        style={style}
      />
    );
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.initials,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.divider,
        },
        style,
      ]}
    >
      <TextV2
        variant={size >= 40 ? 'bodyStrong' : 'captionStrong'}
        tone="bodySoft"
      >
        {initialsOf(name)}
      </TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
