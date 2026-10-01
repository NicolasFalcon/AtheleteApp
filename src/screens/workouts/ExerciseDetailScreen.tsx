import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Plus,
  XCircle,
} from 'lucide-react-native';
import { Button, Chip, EmptyState, Loader } from '@app/components/ui';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { ExerciseMediaHero } from '@app/features/workouts/components/ExerciseMediaHero';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { useFavoriteExercises } from '@app/hooks/useFavoriteExercises';
import {safeGoBack} from '@app/navigation/safeGoBack';
import { bodyPartLabels, equipmentLabels, levelLabels } from '@app/shared';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'ExerciseDetail'>;

type ExerciseDetailHeaderProps = {
  name: string;
  equipmentLabel: string;
  bodyPartLabel: string;
  levelLabel: string;
  summary: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function ExerciseDetailHeader({
  name,
  equipmentLabel,
  bodyPartLabel,
  levelLabel,
  summary,
}: ExerciseDetailHeaderProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    header: {
      gap: 10,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 26,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0,
      lineHeight: 31,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    summary: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 21,
      maxWidth: 320,
    },
  });

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{name}</Text>
      <View style={styles.chips}>
        <Chip>{equipmentLabel}</Chip>
        <Chip>{bodyPartLabel}</Chip>
        <Chip>{levelLabel}</Chip>
      </View>
      <Text style={styles.summary}>{summary}</Text>
    </View>
  );
}

export function ExerciseDetailScreen({ navigation, route }: Props) {
  const handleSafeBack = () => safeGoBack(navigation, [ROOT_ROUTES.MainTabs]);
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const exercisesQuery = useExerciseLibrary();
  const exerciseFavorites = useFavoriteExercises();
  const exercise = useMemo(
    () =>
      (exercisesQuery.data || []).find(
        item => item.id === route.params.exerciseId,
      ) || null,
    [exercisesQuery.data, route.params.exerciseId],
  );
  const heroHeight = clamp(Math.round(screenHeight * 0.34), 270, 320);
  const bottomInset = Math.max(insets.bottom, theme.spacing.lg);
  const bottomBarHeight = 58 + theme.spacing.md + bottomInset;
  const sheetOverlap = theme.spacing.xl;

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: bottomBarHeight + theme.spacing.md,
    },
    scroll: {
      flex: 1,
      marginTop: -sheetOverlap,
    },
    sheet: {
      marginTop: 0,
      borderTopLeftRadius: theme.radii.xl,
      borderTopRightRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
      gap: theme.spacing.lg,
      shadowColor: '#000000',
      ...theme.elevations.prominent,
    },
    technicalBody: {
      gap: theme.spacing.lg,
    },
    technicalCard: {
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      flexDirection: 'row',
      gap: theme.spacing.md,
      shadowColor: '#000000',
      ...theme.elevations.subtle,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: 0,
      lineHeight: 22,
    },
    iconShell: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      flexShrink: 0,
    },
    cardContent: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 18,
    },
    compactStack: {
      gap: theme.spacing.xs,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    stepIndex: {
      width: 23,
      height: 23,
      borderRadius: 11.5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      flexShrink: 0,
    },
    stepIndexText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.bold,
    },
    stepText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 19,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    bulletDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      marginTop: 7,
      backgroundColor: theme.colors.textPrimary,
      opacity: 0.45,
      flexShrink: 0,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    muscleChip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: 'transparent',
    },
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: bottomInset,
      backgroundColor: 'rgba(255,255,255,0.96)',
    },
    ctaButton: {
      minHeight: 58,
      borderRadius: theme.radii.md,
    },
  });

  if (exercisesQuery.isLoading || !exerciseFavorites.loaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loader label="Cargando ejercicio..." />
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.sheet}>
          <EmptyState
            title="Ejercicio no encontrado"
            description="No pudimos encontrar este ejercicio dentro de la biblioteca actual."
          />
          <Button label="Volver" onPress={handleSafeBack} />
        </View>
      </SafeAreaView>
    );
  }

  const equipmentLabel =
    equipmentLabels[exercise.equipment] || exercise.equipment;
  const bodyPartLabel = bodyPartLabels[exercise.bodyPart] || exercise.bodyPart;
  const levelLabel = levelLabels[exercise.level] || exercise.level;
  const summaryLine = `${bodyPartLabel} con ${equipmentLabel.toLowerCase()} · ${levelLabel}`;
  const workedMuscles = Array.from(
    new Set([
      ...exercise.musclesWorked.primary,
      ...exercise.musclesWorked.secondary,
    ]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExerciseMediaHero
        videoUrl={exercise.videoUrl}
        thumbnailUrl={exercise.thumbnailUrl}
        imageUrl={exercise.thumbnailUrl}
        title={exercise.name}
        height={heroHeight}
        isFavorite={exerciseFavorites.isExerciseFavorite(exercise.id)}
        topInset={insets.top}
        onBack={handleSafeBack}
        onToggleFavorite={() => {
          exerciseFavorites.toggleExerciseFavorite(exercise.id).catch(() => {});
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sheet}>
          <ExerciseDetailHeader
            name={exercise.name}
            equipmentLabel={equipmentLabel}
            bodyPartLabel={bodyPartLabel}
            levelLabel={levelLabel}
            summary={summaryLine}
          />

          <View style={styles.technicalBody}>
            <View style={styles.technicalCard}>
              <View style={styles.iconShell}>
                <ClipboardList
                  color={theme.colors.textPrimary}
                  size={22}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Cómo realizarlo</Text>
                <View style={styles.compactStack}>
                  {exercise.howToPerform.length > 0 ? (
                    exercise.howToPerform.map((step, index) => (
                      <View key={`${step}-${index}`} style={styles.stepRow}>
                        <View style={styles.stepIndex}>
                          <Text style={styles.stepIndexText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.bodyText}>
                      La técnica detallada llegará en una siguiente iteración.
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.technicalCard}>
              <View style={styles.iconShell}>
                <CheckCircle2
                  color={theme.colors.textPrimary}
                  size={22}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Puntos clave</Text>
                <View style={styles.compactStack}>
                  {exercise.coachingCues.length > 0 ? (
                    exercise.coachingCues.map(cue => (
                      <View key={cue} style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.stepText}>{cue}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.bodyText}>
                      Sin puntos clave registrados.
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.technicalCard}>
              <View style={styles.iconShell}>
                <XCircle
                  color={theme.colors.textPrimary}
                  size={22}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Errores comunes</Text>
                <View style={styles.compactStack}>
                  {exercise.commonMistakes.length > 0 ? (
                    exercise.commonMistakes.map(mistake => (
                      <View key={mistake} style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.stepText}>{mistake}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.bodyText}>
                      Sin errores comunes registrados.
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.technicalCard}>
              <View style={styles.iconShell}>
                <Dumbbell
                  color={theme.colors.textPrimary}
                  size={22}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Músculos trabajados</Text>
                {workedMuscles.length > 0 ? (
                  <View style={styles.chipsRow}>
                    {workedMuscles.map(muscle => (
                      <Chip key={muscle} style={styles.muscleChip}>
                        {muscle}
                      </Chip>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.bodyText}>
                    Sin músculos registrados.
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          label="Agregar a rutina"
          style={styles.ctaButton}
          onPress={() =>
            navigation.navigate(APP_ROUTES.AddExerciseToRoutine, {
              exerciseId: exercise.id,
              exerciseName: exercise.name,
            })
          }
          accessoryRight={
            <Plus
              color={theme.colors.accentContrast}
              size={16}
              strokeWidth={2.2}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}
