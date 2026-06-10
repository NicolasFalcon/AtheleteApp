import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { RefreshCw } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, Loader } from '@app/components/ui';
import { PROGRESS_ROUTES } from '@app/constants/routes';
import { ActiveChallengeCard } from '@app/features/progress/components/ActiveChallengeCard';
import { AiAnalysisCard } from '@app/features/progress/components/AiAnalysisCard';
import { BodyScienceProgressCard } from '@app/features/progress/components/BodyScienceProgressCard';
import { HydrationProgressCard } from '@app/features/progress/components/HydrationProgressCard';
import { NutritionProgressCard } from '@app/features/progress/components/NutritionProgressCard';
import { PersonalRecordsCard } from '@app/features/progress/components/PersonalRecordsCard';
import { ProgressRangeSwitch } from '@app/features/progress/components/ProgressRangeSwitch';
import { ProgressSegmentedControl } from '@app/features/progress/components/ProgressSegmentedControl';
import { TrainingProgressCard } from '@app/features/progress/components/TrainingProgressCard';
import { useProgressData } from '@app/hooks/useProgressData';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { ProgressStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<ProgressStackParamList, 'ProgressRoot'>;
type ProgressSection = 'dashboard' | 'retos';
type ProgressRange = 'week' | 'month';

export function ProgressScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const progress = useProgressData();
  const [section, setSection] = useState<ProgressSection>('dashboard');
  const [range, setRange] = useState<ProgressRange>('week');

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: tabBarHeight + theme.spacing.md,
      gap: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 20,
      fontWeight: theme.typography.weights.bold,
    },
  });

  if (progress.isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Loader label="Cargando progreso..." />
      </SafeAreaView>
    );
  }

  if (progress.error || !progress.overviewQuery.data) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.title}>Progreso</Text>
          <EmptyState
            title="No pudimos cargar tu progreso"
            description="Revisa la conexión con Supabase o vuelve a intentarlo en unos minutos."
            icon={
              <RefreshCw
                color={theme.colors.textSecondary}
                size={20}
                strokeWidth={2}
              />
            }
            actionLabel="Reintentar"
            onAction={() => {
              Promise.all([
                progress.overviewQuery.refetch(),
                progress.recordsQuery.refetch(),
                progress.exercisesQuery.refetch(),
              ]).catch(() => {});
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const overview = progress.overviewQuery.data;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Progreso</Text>

        <ProgressSegmentedControl
          value={section}
          options={[
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'retos', label: 'Retos' },
          ]}
          onChange={setSection}
          highlighted
        />

        {section === 'dashboard' ? (
          <>
            <ProgressRangeSwitch value={range} onChange={setRange} />
            <AiAnalysisCard insights={progress.insights} />
            <BodyScienceProgressCard
              onOpenLibrary={() =>
                navigation.navigate(PROGRESS_ROUTES.BodyScience)
              }
              onOpenArticle={articleId =>
                navigation.navigate(PROGRESS_ROUTES.BodyScienceArticle, {
                  articleId,
                })
              }
            />
            <TrainingProgressCard
              sessions={overview.workoutSessions}
              range={range}
            />
            <NutritionProgressCard
              logs={overview.dailyNutritionLogs}
              plan={overview.nutritionPlan}
              range={range}
              onOpen={() => navigation.navigate(PROGRESS_ROUTES.NutritionPlan)}
            />
            <HydrationProgressCard
              logs={overview.hydrationLogs}
              goalGlasses={overview.dailyWaterGoal}
              range={range}
            />
            <PersonalRecordsCard
              records={progress.recordSummaries}
              onOpen={(exerciseId, exerciseName) =>
                navigation.navigate(PROGRESS_ROUTES.PersonalRecords, {
                  exerciseId,
                  exerciseName,
                })
              }
            />
          </>
        ) : (
          <ActiveChallengeCard
            challenge={overview.challenge}
            onOpen={() => navigation.navigate(PROGRESS_ROUTES.Challenge)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
