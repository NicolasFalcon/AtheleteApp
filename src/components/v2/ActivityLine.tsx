import { StyleSheet, View } from 'react-native';
import { AvatarStack, type AvatarStackItem } from '@app/components/v2/AvatarStack';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

// Minor friend activity (v2.12): a line with stacked avatars, the text at
// 15/500 and an Ember dot; no card, no likes, no comments, not a post
// ("Carlos · nuevo récord").
export function ActivityLine({
  people,
  text,
  onPress,
}: {
  people: AvatarStackItem[];
  text: string;
  onPress?: () => void;
}) {
  const { colors } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={text}
      disabled={!onPress}
      onPress={onPress}
      style={styles.row}
    >
      <AvatarStack items={people} size={36} max={3} ringColor={colors.bg} />
      <TextV2 variant="bodyStrong" style={styles.text}>
        {text}
      </TextV2>
      <View style={[styles.dot, { backgroundColor: colors.ember.base }]} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  text: { flex: 1, fontWeight: '500', lineHeight: 21 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
