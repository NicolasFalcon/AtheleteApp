import { StyleSheet, View } from 'react-native';
import {
  PersonAvatar,
  type PersonAvatarProps,
} from '@app/components/v2/PersonAvatar';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type AvatarStackItem = Pick<
  PersonAvatarProps,
  'name' | 'avatarKey' | 'profilePhotoUrl' | 'relationship'
> & { key: string };

export type AvatarStackProps = {
  items: AvatarStackItem[];
  size?: number;
  // Shows "+N" after this many avatars.
  max?: number;
  // Colour of the ring that separates overlapping avatars (the surface).
  ringColor?: string;
  // Hub header: muted tone (STATE_04 draws three faded portraits).
  muted?: boolean;
};

// Overlapping avatars (Comunidad header, challenge rows, empty feed).
export function AvatarStack({
  items,
  size = 28,
  max = 4,
  ringColor,
  muted = false,
}: AvatarStackProps) {
  const { colors } = useThemeV2();
  const ring = ringColor ?? colors.bg;
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  const overlap = -Math.round(size * 0.29);

  return (
    <View
      accessibilityLabel={`${items.length} personas`}
      style={[styles.row, muted ? styles.muted : null]}
    >
      {shown.map((item, index) => (
        <View
          key={item.key}
          style={[
            styles.item,
            {
              marginLeft: index === 0 ? 0 : overlap,
              borderRadius: (size + 4) / 2,
              backgroundColor: ring,
              padding: 2,
            },
          ]}
        >
          <PersonAvatar
            name={item.name}
            avatarKey={item.avatarKey}
            profilePhotoUrl={item.profilePhotoUrl}
            relationship={item.relationship}
            size={size}
          />
        </View>
      ))}
      {extra > 0 ? (
        <View
          style={[
            styles.item,
            styles.more,
            {
              marginLeft: overlap,
              width: size + 4,
              height: size + 4,
              borderRadius: (size + 4) / 2,
              backgroundColor: colors.surface.muted,
              borderColor: ring,
            },
          ]}
        >
          <TextV2 variant="captionStrong" tone="secondary">{`+${extra}`}</TextV2>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  muted: { opacity: 0.45 },
  item: { overflow: 'hidden' },
  more: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
