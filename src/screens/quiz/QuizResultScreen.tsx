import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {StyleSheet} from 'react-native';
import {ScreenContainer} from '@app/components';
import {HOME_ROUTES} from '@app/constants/routes';
import {QuizScoreSummaryCard} from '@app/features/quiz/components/QuizScoreSummaryCard';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {HomeStackParamList} from '@app/types/navigation';

type Props = NativeStackScreenProps<HomeStackParamList, 'QuizResult'>;

export function QuizResultScreen({navigation, route}: Props) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    content: {
      paddingTop: theme.spacing.jumbo,
      justifyContent: 'center',
      gap: theme.spacing.lg,
    },
  });

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.content}>
      <QuizScoreSummaryCard
        categoryName={route.params.categoryName}
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
        onGoBack={() => navigation.navigate(HOME_ROUTES.QuizLanding)}
      />
    </ScreenContainer>
  );
}
