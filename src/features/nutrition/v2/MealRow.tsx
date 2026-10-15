import { Image, StyleSheet, View } from 'react-native';
import { Zap } from 'lucide-react-native';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { formatThousands } from '@app/features/nutrition/nutritionModel';
import { isPending } from '@app/features/nutrition/mealCache';
import { useSignedImage } from '@app/hooks/useSignedImage';
import type { Meal } from '@app/services/nutrition/mealsService';

// "08:10 · estimación" / "kcal rápidas": the source of the figures.
function subtitle(meal: Meal, language: 'es' | 'en'): string {
  const time = meal.createdAt ? new Date(meal.createdAt) : null;
  const clock = time && !Number.isNaN(time.getTime())
    ? `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
    : '';
  const tag =
    meal.source === 'manual'
      ? language === 'es' ? 'kcal rápidas' : 'quick kcal'
      : meal.source === 'repeat'
        ? language === 'es' ? 'repetida' : 'repeated'
        : language === 'es' ? 'estimación' : 'estimate';
  return clock ? `${clock} · ${tag}` : tag;
}

// A meal of the day (design §23.3): 56 pt thumbnail, name, "08:10 · estimación"
// and the kcal on the right. The whole row opens the detail.
export function MealThumb({ path, quick, size = 56 }: { path: string | null; quick?: boolean; size?: number }) {
  const { colors, mode } = useThemeV2();
  const uri = useSignedImage(path);
  return (
    <View
      style={[
        styles.thumb,
        { width: size, height: size, backgroundColor: mode === 'dark' ? '#2A2622' : '#E6E1D8' },
      ]}
    >
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      {!uri && quick ? <Zap size={20} color={colors.text.secondary} strokeWidth={2} /> : null}
    </View>
  );
}

export function MealRow({
  meal,
  onPress,
  language = 'es',
}: {
  meal: Meal;
  onPress?: () => void;
  language?: 'es' | 'en';
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${meal.title}, ${meal.kcal} kcal`}
      onPress={onPress}
      disabled={!onPress || isPending(meal)}
      style={[styles.row, isPending(meal) ? styles.pending : null]}
    >
      <MealThumb path={meal.imagePath} quick={meal.source === 'manual'} />
      <View style={styles.text}>
        <TextV2 variant="bodyStrong" numberOfLines={1}>
          {meal.title}
        </TextV2>
        <TextV2 variant="meta" tone="secondary" numberOfLines={1}>
          {subtitle(meal, language)}
        </TextV2>
      </View>
      <TextV2 variant="bodyStrong">{formatThousands(meal.kcal)}</TextV2>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
  pending: { opacity: 0.6 },
  text: { flex: 1, gap: 2 },
  thumb: { borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
