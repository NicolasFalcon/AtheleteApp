import {Award, Home, RefreshCw, Trophy} from 'lucide-react-native';
import {StyleSheet, Text, View} from 'react-native';
import {Button, Card} from '@app/components/ui';
import {ALL_BADGES} from '@app/shared';
import {useAppTheme} from '@app/hooks/useAppTheme';

type QuizScoreSummaryCardProps = {
  categoryName: string;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
  score: number;
  isPerfect: boolean;
  unlockedBadges: string[];
  onRetry: () => void;
  onGoBack: () => void;
};

export function QuizScoreSummaryCard({
  categoryName,
  correctCount,
  totalQuestions,
  pointsEarned,
  score,
  isPerfect,
  unlockedBadges,
  onRetry,
  onGoBack,
}: QuizScoreSummaryCardProps) {
  const {theme} = useAppTheme();
  const badgeTitles = unlockedBadges
    .map(id => ALL_BADGES.find(badge => badge.id === id)?.title)
    .filter(Boolean) as string[];

  const styles = StyleSheet.create({
    shell: {
      gap: theme.spacing.lg,
      alignItems: 'center',
    },
    scoreWrap: {
      width: 124,
      height: 124,
      borderRadius: 62,
      backgroundColor: isPerfect
        ? theme.colors.accent
        : theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    score: {
      color: isPerfect
        ? theme.colors.accentContrast
        : theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 32,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -1.2,
    },
    heading: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.titleSm,
      fontWeight: theme.typography.weights.bold,
      textAlign: 'center',
    },
    helper: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      textAlign: 'center',
      lineHeight: 22,
    },
    statsCard: {
      width: '100%',
      gap: theme.spacing.md,
      alignItems: 'center',
    },
    statsRow: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    statValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.titleSm,
      fontWeight: theme.typography.weights.bold,
    },
    statLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      textAlign: 'center',
    },
    badgeCard: {
      width: '100%',
      gap: theme.spacing.sm,
    },
    badgeTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    badgeItem: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 20,
    },
    actions: {
      width: '100%',
      gap: theme.spacing.sm,
    },
  });

  return (
    <View style={styles.shell}>
      <View style={styles.scoreWrap}>
        <Text style={styles.score}>{score}%</Text>
      </View>

      <View>
        <Text style={styles.heading}>
          {isPerfect ? '¡Puntuación perfecta!' : 'Quiz completado'}
        </Text>
        <Text style={styles.helper}>{categoryName}</Text>
      </View>

      <Card style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Trophy color={theme.colors.textPrimary} size={18} strokeWidth={2} />
            <Text style={styles.statValue}>
              {correctCount}/{totalQuestions}
            </Text>
            <Text style={styles.statLabel}>Correctas</Text>
          </View>
          <View style={styles.stat}>
            <Award color={theme.colors.textPrimary} size={18} strokeWidth={2} />
            <Text style={styles.statValue}>+{pointsEarned}</Text>
            <Text style={styles.statLabel}>Puntos</Text>
          </View>
        </View>
        <Text style={styles.helper}>
          {isPerfect
            ? 'ELLIE detectó una puntuación perfecta. Sigue sumando categorías para convertirte en Quiz Master.'
            : 'Sigue aprendiendo y vuelve a intentarlo para mejorar tu porcentaje y ganar más puntos.'}
        </Text>
      </Card>

      {badgeTitles.length > 0 ? (
        <Card style={styles.badgeCard}>
          <Text style={styles.badgeTitle}>Logros desbloqueados</Text>
          {badgeTitles.map(title => (
            <Text key={title} style={styles.badgeItem}>
              • {title}
            </Text>
          ))}
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Intentar otra vez"
          onPress={onRetry}
          accessoryRight={
            <RefreshCw
              color={theme.colors.accentContrast}
              size={16}
              strokeWidth={2}
            />
          }
        />
        <Button
          label="Volver a categorías"
          variant="outline"
          onPress={onGoBack}
          accessoryRight={
            <Home color={theme.colors.textPrimary} size={16} strokeWidth={2} />
          }
        />
      </View>
    </View>
  );
}
