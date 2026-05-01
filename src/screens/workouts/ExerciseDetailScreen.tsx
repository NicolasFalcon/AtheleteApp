import {useMemo, useState} from 'react';
import {Alert, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronRight,
  Plus,
} from 'lucide-react-native';
import {Button, Chip, EmptyState, Loader} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {useExerciseLibrary} from '@app/hooks/useExerciseLibrary';
import {useWorkoutLibrary} from '@app/hooks/useWorkoutLibrary';
import {
  bodyPartLabels,
  equipmentLabels,
  levelLabels,
} from '@app/shared';
import type {
  HomeStackParamList,
  WorkoutsStackParamList,
} from '@app/types/navigation';

type Props =
  | NativeStackScreenProps<HomeStackParamList, 'ExerciseDetail'>
  | NativeStackScreenProps<WorkoutsStackParamList, 'ExerciseDetail'>;

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      borderRadius: theme.radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

export function ExerciseDetailScreen({navigation, route}: Props) {
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();
  const [imageFailed, setImageFailed] = useState(false);
  const exercisesQuery = useExerciseLibrary();
  const workoutsQuery = useWorkoutLibrary();
  const exercise = useMemo(
    () =>
      (exercisesQuery.data || []).find(
        item => item.id === route.params.exerciseId,
      ) || null,
    [exercisesQuery.data, route.params.exerciseId],
  );

  const relatedWorkouts = useMemo(() => {
    if (!exercise) {
      return [];
    }

    return (workoutsQuery.data || []).filter(workout =>
      workout.exercises.some(item =>
        item.name.toLowerCase().includes(exercise.name.toLowerCase()) ||
        exercise.name.toLowerCase().includes(item.name.toLowerCase()),
      ),
    );
  }, [exercise, workoutsQuery.data]);

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    hero: {
      height: 272,
      backgroundColor: theme.colors.surfaceMuted,
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    heroFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    heroFallbackLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
    },
    floatingButton: {
      position: 'absolute',
      left: theme.spacing.lg,
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.82)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: 136,
      gap: theme.spacing.lg,
    },
    summaryCard: {
      marginTop: -28,
      borderRadius: theme.radii.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.title,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.8,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 21,
    },
    rowItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    rowBullet: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    rowBulletLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.bold,
    },
    rowContent: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 21,
    },
    recommendationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    recommendationLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.medium,
    },
    recommendationValue: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
    },
    workoutLink: {
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    workoutLinkLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.medium,
      flex: 1,
    },
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
  });

  if (exercisesQuery.isLoading || workoutsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loader label="Cargando ejercicio..." />
      </SafeAreaView>
    );
  }

  const stackNavigation = navigation as any;

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <EmptyState
            title="Ejercicio no encontrado"
            description="No pudimos encontrar este ejercicio dentro de la biblioteca actual."
          />
          <Button label="Volver" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.hero}>
        {!imageFailed && exercise.thumbnailUrl ? (
          <Image
            source={{uri: exercise.thumbnailUrl}}
            style={styles.heroImage}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.heroFallback}>
            <Text style={styles.heroFallbackLabel}>Imagen no disponible</Text>
          </View>
        )}
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.floatingButton, {top: insets.top + 10}]}>
          <ArrowLeft color={theme.colors.textPrimary} size={18} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.title}>{exercise.name}</Text>
          <View style={styles.chipsRow}>
            <Chip>{equipmentLabels[exercise.equipment] || exercise.equipment}</Chip>
            <Chip>{bodyPartLabels[exercise.bodyPart] || exercise.bodyPart}</Chip>
            <Chip>{levelLabels[exercise.level] || exercise.level}</Chip>
          </View>
        </View>

        <SectionCard title="Cómo realizarlo">
          {exercise.howToPerform.length > 0 ? (
            exercise.howToPerform.map((step, index) => (
              <View key={`${step}-${index}`} style={styles.rowItem}>
                <View style={styles.rowBullet}>
                  <Text style={styles.rowBulletLabel}>{index + 1}</Text>
                </View>
                <Text style={styles.rowContent}>{step}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.bodyText}>
              La técnica detallada llegará en una siguiente iteración.
            </Text>
          )}
        </SectionCard>

        <SectionCard title="Puntos clave de técnica">
          {exercise.coachingCues.length > 0 ? (
            exercise.coachingCues.map(cue => (
              <Text key={cue} style={styles.bodyText}>
                • {cue}
              </Text>
            ))
          ) : (
            <Text style={styles.bodyText}>Sin puntos clave registrados.</Text>
          )}
        </SectionCard>

        <SectionCard title="Errores comunes">
          {exercise.commonMistakes.length > 0 ? (
            exercise.commonMistakes.map(mistake => (
              <Text key={mistake} style={styles.bodyText}>
                • {mistake}
              </Text>
            ))
          ) : (
            <Text style={styles.bodyText}>Sin errores comunes registrados.</Text>
          )}
        </SectionCard>

        <SectionCard title="Músculos trabajados">
          <View style={styles.chipsRow}>
            {exercise.musclesWorked.primary.map(muscle => (
              <Chip key={`primary-${muscle}`}>{muscle}</Chip>
            ))}
            {exercise.musclesWorked.secondary.map(muscle => (
              <Chip key={`secondary-${muscle}`}>{muscle}</Chip>
            ))}
          </View>
        </SectionCard>

        <SectionCard title="Series y repeticiones recomendadas">
          <View style={styles.recommendationRow}>
            <Text style={styles.recommendationLabel}>Fuerza</Text>
            <Text style={styles.recommendationValue}>
              {exercise.recommendations.strength.sets} series ×{' '}
              {exercise.recommendations.strength.reps}
            </Text>
          </View>
          <View style={styles.recommendationRow}>
            <Text style={styles.recommendationLabel}>Hipertrofia</Text>
            <Text style={styles.recommendationValue}>
              {exercise.recommendations.hypertrophy.sets} series ×{' '}
              {exercise.recommendations.hypertrophy.reps}
            </Text>
          </View>
          <View style={styles.recommendationRow}>
            <Text style={styles.recommendationLabel}>Resistencia</Text>
            <Text style={styles.recommendationValue}>
              {exercise.recommendations.endurance.sets} series ×{' '}
              {exercise.recommendations.endurance.reps}
            </Text>
          </View>
        </SectionCard>

        {relatedWorkouts.length > 0 ? (
          <SectionCard title="Usado en estas rutinas">
            {relatedWorkouts.slice(0, 6).map(workout => (
              <Pressable
                key={workout.id}
                onPress={() =>
                  stackNavigation.navigate(
                    'WorkoutDetail' as never,
                    {workoutId: workout.id} as never,
                  )
                }
                style={styles.workoutLink}>
                <Text numberOfLines={2} style={styles.workoutLinkLabel}>
                  {workout.title}
                </Text>
                <ChevronRight color={theme.colors.textSecondary} size={18} />
              </Pressable>
            ))}
          </SectionCard>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {paddingBottom: Math.max(insets.bottom, theme.spacing.lg)},
        ]}>
        <Button
          label="Agregar a rutina"
          onPress={() =>
            Alert.alert(
              'Próximamente',
              'La edición de rutinas llegará en la siguiente fase.',
            )
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
