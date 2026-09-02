import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {StyleSheet} from 'react-native';
import {ScreenContainer} from '@app/components';
import {HOME_ROUTES} from '@app/constants/routes';
import {QuizScoreSummaryCard} from '@app/features/quiz/components/QuizScoreSummaryCard';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {safeGoBack} from '@app/navigation/safeGoBack';
import type {HomeStackParamList} from '@app/types/navigation';

type Props = NativeStackScreenProps<HomeStackParamList, 'QuizResult'>;

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
          navigation.replace(HOME_ROUTES.QuizQuestion, {
            categoryId: route.params.categoryId,
            categoryName: route.params.categoryName,
            categoryIcon: route.params.categoryIcon,
          })
        }
        onGoBack={() =>
          safeGoBack(navigation, [HOME_ROUTES.QuizLanding, HOME_ROUTES.Home])
        }
      />
    </ScreenContainer>
  );
}
