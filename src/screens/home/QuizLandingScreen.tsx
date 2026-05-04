import {Brain} from 'lucide-react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {StyleSheet, Text, View} from 'react-native';
import {AppHeader, ScreenContainer} from '@app/components';
import {EmptyState, Loader} from '@app/components/ui';
import {HOME_ROUTES} from '@app/constants/routes';
import {QuizCategoryCard} from '@app/features/quiz/components/QuizCategoryCard';
import {useQuizCategories} from '@app/hooks/useQuiz';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {HomeStackParamList} from '@app/types/navigation';

type Props = NativeStackScreenProps<HomeStackParamList, 'QuizLanding'>;

export function QuizLandingScreen({navigation}: Props) {
  const {theme} = useAppTheme();
  const categoriesQuery = useQuizCategories();

  const styles = StyleSheet.create({
    content: {
      gap: theme.spacing.lg,
    },
    introCard: {
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    introRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    introTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.bold,
    },
    introText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 22,
    },
    list: {
      gap: theme.spacing.md,
    },
  });

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.content}>
      <AppHeader
        showBackButton
        title="Aprende y gana"
        subtitle="Responde preguntas sobre entrenamiento, nutrición y ciencia del cuerpo. Gana puntos con cada quiz completado."
      />

      <View style={styles.introCard}>
        <View style={styles.introRow}>
          <Brain color={theme.colors.textPrimary} size={18} strokeWidth={2.1} />
          <Text style={styles.introTitle}>Quiz de fitness</Text>
        </View>
        <Text style={styles.introText}>
          Elige una categoría, completa una sesión de 10 preguntas y suma puntos reales a tu perfil.
        </Text>
      </View>

      {categoriesQuery.isLoading ? <Loader label="Cargando categorías..." /> : null}

      {categoriesQuery.isError ? (
        <EmptyState
          title="No pudimos cargar los quizzes"
          description="Inténtalo de nuevo en unos minutos para recuperar las categorías activas."
        />
      ) : null}

      <View style={styles.list}>
        {(categoriesQuery.data || []).map(category => (
          <QuizCategoryCard
            key={category.id}
            category={category}
            onPress={() =>
              navigation.navigate(HOME_ROUTES.QuizQuestion, {
                categoryId: category.id,
                categoryName: category.name,
                categoryIcon: category.icon,
              })
            }
          />
        ))}
      </View>
    </ScreenContainer>
  );
}
