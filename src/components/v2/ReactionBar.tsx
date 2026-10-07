import { StyleSheet, View } from 'react-native';
import { ArrowRight, Heart, MessageCircle } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { haptics } from '@app/components/v2/haptics';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type ReactionBarProps = {
  liked: boolean;
  likes: number;
  comments: number;
  onLike: () => void;
  onComment?: () => void;
  // Right-hand text action of the post ("Ver rutina").
  cta?: { label: string; onPress: () => void };
};

// Me gusta con contador · comentar con contador (handoff §5 Social Post). No
// vanity metrics: just the two figures.
export function ReactionBar({
  liked,
  likes,
  comments,
  onLike,
  onComment,
  cta,
}: ReactionBarProps) {
  const { colors } = useThemeV2();
  const pop = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  return (
    <View style={styles.row}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={liked ? 'Quitar me gusta' : 'Me gusta'}
        accessibilityState={{ selected: liked }}
        hitSlop={8}
        onPress={() => {
          haptics.selection();
          if (!liked) {
            pop.value = withSequence(
              withSpring(1.3, { damping: 8, stiffness: 300 }),
              withSpring(1, { damping: 10, stiffness: 240 }),
            );
          }
          onLike();
        }}
        style={styles.item}
      >
        <Animated.View style={heartStyle}>
          <Heart
            size={21}
            strokeWidth={1.9}
            color={liked ? colors.ember.base : colors.text.primary}
            fill={liked ? colors.ember.base : 'transparent'}
          />
        </Animated.View>
        <TextV2 variant="bodyStrong">{String(likes)}</TextV2>
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Comentarios: ${comments}`}
        hitSlop={8}
        disabled={!onComment}
        onPress={onComment}
        style={styles.item}
      >
        <MessageCircle size={20} strokeWidth={1.9} color={colors.text.primary} />
        <TextV2 variant="bodyStrong">{String(comments)}</TextV2>
      </PressableScale>
      <View style={styles.spacer} />
      {cta ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={cta.label}
          onPress={cta.onPress}
          style={styles.cta}
        >
          <TextV2 variant="metaStrong">{cta.label}</TextV2>
          <ArrowRight size={14} strokeWidth={2} color={colors.text.primary} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4 },
  spacer: { flex: 1 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
