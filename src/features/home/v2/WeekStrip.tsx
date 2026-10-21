import { StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { PressableScale, Skeleton, SkeletonGroup, TextV2, useThemeV2 } from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { WeekPills } from '@app/features/week/v2/WeekParts';
import { stripLine, type WeekPlan } from '@app/features/week/weekModel';

// Inicio · "Tu semana" (handoff v2.15 §25.5, HOME_18): the seven days with
// the same dots as Tu semana. The whole block opens Tu semana.
export function WeekStrip({
  week,
  loading,
  error,
  onRetry,
  onPress,
}: {
  week: WeekPlan | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();

  if (!week) {
    return loading ? (
      <SkeletonGroup>
        <Skeleton height={22} width="40%" />
        <Skeleton height={64} />
      </SkeletonGroup>
    ) : error ? (
      <BlockError message="No pudimos cargar tu semana." onRetry={onRetry} />
    ) : null;
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Tu semana. ${stripLine(week)}`}
      onPress={onPress}
      style={styles.block}
    >
      <View style={styles.head}>
        <TextV2 style={styles.title}>Tu semana</TextV2>
        <View style={styles.link}>
          <TextV2 variant="meta" color={colors.text.secondary}>
            {stripLine(week)}
          </TextV2>
          <ChevronRight size={14} color={colors.text.primary} strokeWidth={2} style={styles.faint} />
        </View>
      </View>
      <View pointerEvents="none">
        <WeekPills days={week.days} today={week.today} compact />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  block: { gap: 14 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 20, lineHeight: 24, fontWeight: '600' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  faint: { opacity: 0.5 },
});
