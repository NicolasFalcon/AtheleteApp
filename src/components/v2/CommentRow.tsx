import { StyleSheet, View } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';
import { PersonAvatar, type PersonAvatarProps } from '@app/components/v2/PersonAvatar';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type CommentRowProps = {
  name: string;
  time: string;
  // User text: always plain text, never parsed (no links, no markup).
  text: string;
  avatar: Pick<
    PersonAvatarProps,
    'avatarKey' | 'profilePhotoUrl' | 'relationship'
  >;
  onMore?: () => void;
};

// Flat comment (no threads): avatar, name + time, text (SOCIAL_03).
export function CommentRow({ name, time, text, avatar, onMore }: CommentRowProps) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.row}>
      <PersonAvatar name={name} size={34} {...avatar} />
      <View style={styles.body}>
        <View style={styles.head}>
          <TextV2 variant="metaStrong">{name}</TextV2>
          <TextV2 variant="caption" tone="tertiary">
            {time}
          </TextV2>
        </View>
        <TextV2 variant="body" selectable={false}>
          {text}
        </TextV2>
      </View>
      {onMore ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Más opciones del comentario de ${name}`}
          hitSlop={10}
          onPress={onMore}
          style={styles.more}
        >
          <MoreHorizontal size={18} strokeWidth={2} color={colors.text.tertiary} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  body: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  more: { paddingTop: 2 },
});
