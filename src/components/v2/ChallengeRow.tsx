import { StyleSheet, View } from 'react-native';
import { AvatarStack, type AvatarStackItem } from '@app/components/v2/AvatarStack';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import { progressPct } from '@app/features/social/challengeModel';

export type ChallengeRowProps = {
  // "ENTRE AMIGOS", "ESPERANDO", "EXPIRADO"…
  tag: string;
  // "2 días restantes".
  days: string;
  title: string;
  people: AvatarStackItem[];
  progress: number;
  goal: number;
  // "Vas en cabeza", "Carlos va 2 por delante".
  line: string;
  muted?: boolean;
  onPress: () => void;
};

// Challenge between friends as a flat row (SOCIAL_07): tag and days, title,
// stacked avatars, a thin Ember bar with your figure and a human line.
export function ChallengeRow({
  tag,
  days,
  title,
  people,
  progress,
  goal,
  line,
  muted = false,
  onPress,
}: ChallengeRowProps) {
  const { colors } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${tag}. ${line}`}
      onPress={onPress}
      style={[styles.row, { borderTopColor: colors.divider }]}
    >
      <View style={styles.top}>
        <View style={[styles.tag, { borderColor: colors.outline.strong }]}>
          <TextV2 variant="eyebrow" tone="bodySoft">
            {tag}
          </TextV2>
        </View>
        <TextV2 variant="meta" tone="secondary">
          {days}
        </TextV2>
      </View>
      <TextV2 variant="section" tone={muted ? 'secondary' : 'primary'} numberOfLines={2}>
        {title}
      </TextV2>
      <View style={styles.progress}>
        <AvatarStack items={people} size={26} max={3} ringColor={colors.bg} />
        <View style={[styles.track, { backgroundColor: colors.surface.muted }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${progressPct(progress, goal)}%`,
                backgroundColor: muted ? colors.outline.strong : colors.ember.base,
              },
            ]}
          />
        </View>
        <TextV2 variant="bodyStrong">{`${progress} / ${goal}`}</TextV2>
      </View>
      <TextV2 variant="meta" tone="secondary">
        {line}
      </TextV2>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 16, borderTopWidth: 1, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  tag: { height: 22, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1, justifyContent: 'center' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  track: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
