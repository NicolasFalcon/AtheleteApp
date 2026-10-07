import { StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { AvatarStack, type AvatarStackItem } from '@app/components/v2/AvatarStack';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

// Minor friend activity: one line, no likes, no comments, not a post
// ("Carlos · nuevo récord"; handoff §5 Social Post).
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
      style={[styles.row, { backgroundColor: colors.surface.muted }]}
    >
      <AvatarStack
        items={people}
        size={32}
        max={3}
        ringColor={colors.surface.muted}
      />
      <TextV2 variant="body" style={styles.text}>
        {text}
      </TextV2>
      {onPress ? (
        <ChevronRight size={16} strokeWidth={2} color={colors.text.tertiary} />
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  text: { flex: 1 },
});
