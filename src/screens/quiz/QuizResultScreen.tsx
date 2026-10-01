import { StyleSheet } from 'react-native';
import { ScreenContainer } from '@app/components';
import { APP_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import { QuizScoreSummaryCard } from '@app/features/quiz/components/QuizScoreSummaryCard';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { safeGoBack, tabFallback } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'QuizResult'>;

export function QuizResultScreen({navigation, route}: Props) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    content: {
      paddingTop: theme.spacing.xs,
      gap: theme.spacing.md,
    },
  });

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.content}>
      <QuizScoreSummaryCard
        categoryName={route.params.categoryName}
        categoryIcon={route.params.categoryIcon}
        correctCount={route.params.correctCount}
        totalQuestions={route.params.totalQuestions}
        pointsEarned={route.params.pointsEarned}
        score={route.params.score}
        isPerfect={route.params.isPerfect}
        unlockedBadges={route.params.unlockedBadges || []}
        onRetry={() =>
          navigation.replace(APP_ROUTES.QuizQuestion, {
            categoryId: route.params.categoryId,
            categoryName: route.params.categoryName,
            categoryIcon: route.params.categoryIcon,
          })
        }
        onGoBack={() =>
          safeGoBack(navigation, [
            APP_ROUTES.QuizLanding,
            tabFallback(TAB_ROUTES.Home),
          ])
        }
      />
    </ScreenContainer>
  );
}
