import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonGroup, useThemeV2 } from '@app/components/v2';
import { HERO_HEIGHT } from '@app/features/progress/v2/ProgressHeroView';

// STATE_03 · Loading · Progreso: the dark hero with a headline block and the
// sheet with the title, a trio line and seven capsules.
export function HeroSkeleton({ top }: { top: number }) {
  return (
    <View style={[styles.hero, { height: HERO_HEIGHT }]}>
      <SkeletonGroup>
        <View style={[styles.copy, { top }]}>
          <Skeleton width={116} height={10} radius={5} />
          <Skeleton width={134} height={56} radius={12} />
          <Skeleton width={262} height={12} radius={6} />
        </View>
      </SkeletonGroup>
    </View>
  );
}

export function SheetSkeleton() {
  const { layout } = useThemeV2();

  return (
    <SkeletonGroup>
      <View style={[styles.sheet, { paddingHorizontal: layout.gutter }]}>
        <View style={styles.between}>
          <Skeleton width={120} height={20} radius={10} />
          <Skeleton width={130} height={30} radius={15} />
        </View>
        <View style={styles.trio}>
          {[0, 1, 2].map(index => (
            <Skeleton key={index} width={76} height={36} radius={10} />
          ))}
        </View>
        <Skeleton width="80%" height={14} radius={7} />
        <View style={styles.capsules}>
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton
              key={index}
              height={140}
              radius={999}
              style={styles.capsule}
            />
          ))}
        </View>
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: '#141312', overflow: 'hidden' },
  copy: { position: 'absolute', left: 20, right: 20, gap: 12 },
  sheet: { paddingTop: 26, gap: 22 },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trio: { flexDirection: 'row', justifyContent: 'space-between' },
  capsules: { flexDirection: 'row', gap: 10 },
  capsule: { flex: 1 },
});
