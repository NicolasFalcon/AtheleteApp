import {Apple, Brain, Dumbbell, Trophy} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {QuizCategoryPreview} from '@app/types/quiz';

const categoryIcons = {
  brain: Brain,
  dumbbell: Dumbbell,
  apple: Apple,
} as const;

type QuizCategoryCardProps = {
  category: QuizCategoryPreview;
  onPress: () => void;
};

export function QuizCategoryCard({
  category,
  onPress,
}: QuizCategoryCardProps) {
  const {theme} = useAppTheme();
  const Icon = categoryIcons[category.icon as keyof typeof categoryIcons] || Brain;

  const styles = StyleSheet.create({
    card: {
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      flexDirection: 'row',
      gap: theme.spacing.md,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    iconBox: {
      width: 52,
      height: 52,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      gap: 6,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.bold,
    },
    description: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 20,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    meta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    bestMeta: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
    },
  });

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.card,
        pressed ? {transform: [{scale: 0.99}]} : null,
      ]}>
      <View style={styles.iconBox}>
        <Icon color={theme.colors.textPrimary} size={24} strokeWidth={2.1} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{category.name}</Text>
        <Text style={styles.description}>{category.description}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{category.questionCount} preguntas</Text>
          {typeof category.bestScore === 'number' ? (
            <Text style={styles.bestMeta}>🏆 Mejor: {category.bestScore}%</Text>
          ) : null}
          {category.attemptsCount > 0 ? (
            <Text style={styles.meta}>
              {category.attemptsCount}{' '}
              {category.attemptsCount === 1 ? 'intento' : 'intentos'}
            </Text>
          ) : null}
        </View>
      </View>
      <Trophy color={theme.colors.textSecondary} size={18} strokeWidth={2} />
    </Pressable>
  );
}
