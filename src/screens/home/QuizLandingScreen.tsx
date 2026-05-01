import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Apple, ArrowLeft, Brain, Dumbbell, Trophy} from 'lucide-react-native';
import {ScreenContainer} from '@app/components';
import {EmptyState, Loader} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {useQuizCategories} from '@app/hooks/useQuizCategories';

const categoryIcons: Record<string, typeof Brain> = {
  brain: Brain,
  dumbbell: Dumbbell,
  apple: Apple,
};

export function QuizLandingScreen() {
  const navigation = useNavigation();
  const {theme} = useAppTheme();
  const categoriesQuery = useQuizCategories();

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heading: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.titleSm,
      fontWeight: theme.typography.weights.bold,
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
    introTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.bold,
    },
    introText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      lineHeight: 24,
    },
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
      width: 54,
      height: 54,
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
    metaLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
  });

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.textPrimary} size={18} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.heading}>Aprende y gana</Text>
      </View>

      <View style={styles.introCard}>
        <Text style={styles.introTitle}>Quiz de fitness</Text>
        <Text style={styles.introText}>
          Responde preguntas sobre entrenamiento, nutrición y ciencia del cuerpo.
          Gana puntos con cada quiz completado.
        </Text>
      </View>

      {categoriesQuery.isLoading ? <Loader label="Cargando categorías..." /> : null}

      {categoriesQuery.isError ? (
        <EmptyState
          title="No pudimos cargar los quizzes"
          description="La estructura está lista; vuelve a intentarlo más tarde."
        />
      ) : null}

      {(categoriesQuery.data || []).map(category => {
        const Icon = categoryIcons[category.icon] || Brain;

        return (
          <Pressable
            key={category.id}
            onPress={() =>
              Alert.alert(
                category.name,
                'El flujo completo de preguntas llegará en una siguiente fase.',
              )
            }
            style={({pressed}) => [
              styles.card,
              pressed ? {transform: [{scale: 0.99}]} : null,
            ]}>
            <View style={styles.iconBox}>
              <Icon color={theme.colors.textPrimary} size={26} strokeWidth={2.1} />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{category.name}</Text>
              <Text style={styles.description}>{category.description}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>
                  {category.questionCount} preguntas
                </Text>
                {typeof category.bestScore === 'number' ? (
                  <Text style={styles.metaLabel}>Mejor: {category.bestScore}%</Text>
                ) : null}
                {category.attemptsCount > 0 ? (
                  <Text style={styles.metaLabel}>
                    {category.attemptsCount}{' '}
                    {category.attemptsCount === 1 ? 'intento' : 'intentos'}
                  </Text>
                ) : null}
              </View>
            </View>
            <Trophy color={theme.colors.textSecondary} size={18} strokeWidth={2} />
          </Pressable>
        );
      })}
    </ScreenContainer>
  );
}
