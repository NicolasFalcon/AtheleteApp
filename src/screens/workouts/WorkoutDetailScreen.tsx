import { useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronRight,
  Heart,
  MoreHorizontal,
  Play,
  Share2,
} from 'lucide-react-native';
import {
  BackButton,
  Button,
  Eyebrow,
  GlassSurface,
  IconButton,
  RoutinePath,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  WorkoutHero,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import { exerciseThumbnail } from '@app/features/workouts/workoutAssets';
import {
  EQUIPMENT,
  LEVEL_LABELS,
  pathMeta,
  routineTypeLabel,
  zoneLabel,
} from '@app/features/workouts/workoutsModel';
import { EQUIPMENT_ICONS } from '@app/features/workouts/v2/workoutIcons';
import {
  deletedRoutineText,
  routineErrorCopy,
} from '@app/features/workouts/routineErrors';
import { useAuth } from '@app/hooks/useAuth';
import { useExercises } from '@app/hooks/useCatalog';
import { useFavoriteWorkouts } from '@app/hooks/useFavoriteWorkouts';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { useRoutine, useRoutineMutations } from '@app/hooks/useRoutines';
import { useWorkoutSession } from '@app/hooks/useWorkoutSession';
import {
  DEFAULT_WORKOUT_THUMBNAIL,
  resolveWorkoutThumbnailSource,
} from '@app/lib/workoutThumbnails';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { getWorkoutAccess, type WorkoutExercise } from '@app/shared';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'WorkoutDetail'>;

const HERO_HEIGHT = 470;

// Detalle de rutina v2 (WORKOUTS_06): photographic hero with title and
// figures, a sheet that rises over it with the exercises as a Routine Path,
// and a fixed CTA. No Resumen / Ejercicios / Reviews tabs. The routine is
// always read with get_routine(id) (official, editorial, ELLIE or the user's),
// never from a cached list (B-03).
export function WorkoutDetailScreen({ navigation, route }: Props) {
  const { colors, layout, radius } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const language = useProfileLanguage();
  const routineQuery = useRoutine(route.params.workoutId);
  const favorites = useFavoriteWorkouts();
  const mutations = useRoutineMutations();
  const [imageBroken, setImageBroken] = useState(false);
  const workout = routineQuery.data ?? null;
  const { workoutSession, startSession, isStartingSession } =
    useWorkoutSession(workout);
  const back = () => safeGoBack(navigation, [ROOT_ROUTES.MainTabs]);

  // Zone and equipment of each exercise (get_exercise, kept on the phone):
  // only the "Trabaja" / "Necesitas" pills wait for them.
  const details = useExercises(
    useMemo(
      () => (workout?.exercises ?? []).map(exercise => exercise.exerciseId),
      [workout?.exercises],
    ),
  );
  const matched = useMemo(
    () =>
      (workout?.exercises || []).map(exercise =>
        exercise.exerciseId ? details.byId[exercise.exerciseId] : undefined,
      ),
    [details.byId, workout?.exercises],
  );

  const backButton = (
    <IconButton
      icon={ArrowLeft}
      variant="glass"
      accessibilityLabel="Volver"
      onPress={back}
    />
  );
  // Error / not found are on the light background: the plain back button
  // (the glass one is white on white, B-04).
  const shellBack = <BackButton onPress={back} />;

  if (routineQuery.error) {
    return (
      <Shell top={insets.top} colors={colors} backButton={shellBack}>
        <BlockError
          message={routineErrorCopy(routineQuery.error, language).message}
          onRetry={() => {
            routineQuery.refetch().catch(() => {});
          }}
        />
      </Shell>
    );
  }

  if (routineQuery.isLoading || !favorites.loaded) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <StatusBarV2 style="light" />
        <SkeletonGroup>
          <Skeleton height={HERO_HEIGHT} radius={0} />
          <View
            style={[
              styles.sheet,
              styles.skeletonSheet,
              { backgroundColor: colors.bg },
            ]}
          >
            {[0, 1, 2, 3].map(index => (
              <View key={index} style={styles.skeletonRow}>
                <Skeleton width={32} height={32} radius={16} />
                <Skeleton width={56} height={56} radius={14} />
                <View style={styles.flexGap}>
                  <Skeleton width="70%" height={14} />
                  <Skeleton width="40%" height={12} />
                </View>
              </View>
            ))}
          </View>
        </SkeletonGroup>
      </View>
    );
  }

  if (!workout) {
    return (
      <Shell top={insets.top} colors={colors} backButton={shellBack}>
        <View style={styles.notFound}>
          <TextV2 variant="section" align="center">
            Rutina no encontrada
          </TextV2>
          <TextV2 variant="body" tone="secondary" align="center">
            Puede que se haya eliminado o que ya no esté en la biblioteca.
          </TextV2>
          <Button
            label="Volver a Entrenos"
            variant="secondary"
            size="md"
            onPress={back}
          />
        </View>
      </Shell>
    );
  }

  const access = getWorkoutAccess(workout, profile?.id);
  const favorite = favorites.isWorkoutFavorite(workout.id);
  const status = workoutSession?.status;
  const ctaLabel =
    status === 'in_progress'
      ? 'Continuar entreno'
      : status === 'canceled' || status === 'saved'
      ? `Retomar · ${workoutSession?.completedExercises.length ?? 0} de ${
          workoutSession?.totalExercises || workout.exercises.length
        }`
      : status === 'completed'
      ? 'Ver sesión'
      : 'Empezar entreno';

  const image = imageBroken
    ? DEFAULT_WORKOUT_THUMBNAIL
    : resolveWorkoutThumbnailSource({
        imageUrl: workout.imageUrl,
        type: workout.type,
        targetMuscles: workout.targetMuscles,
        title: workout.title,
      });

  const zones = Array.from(
    new Set(
      matched
        .map(item => item?.bodyPart)
        .filter((value): value is string => Boolean(value && zoneLabel(value))),
    ),
  );
  const equipment = EQUIPMENT.filter(item =>
    matched.some(exercise => exercise?.equipment === item.key),
  );

  // Backend order (warmup → main → cooldown). F-06 will design the warm-up;
  // for now it is the same path under its own label.
  const toStep = (exercise: WorkoutExercise) => {
    const libraryExercise = exercise.exerciseId
      ? details.byId[exercise.exerciseId]
      : undefined;
    return {
      key: exercise.id,
      title: exercise.name,
      subtitle: pathMeta(exercise),
      thumbnail: {
        mediaKey: exercise.thumbKey,
        fallback: exerciseThumbnail(libraryExercise?.bodyPart),
      },
      trailing: exercise.exerciseId ? (
        <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2} />
      ) : undefined,
      onPress: exercise.exerciseId
        ? () =>
            navigation.navigate(APP_ROUTES.ExerciseDetail, {
              exerciseId: exercise.exerciseId as string,
            })
        : undefined,
    };
  };
  const warmup = workout.exercises.filter(exercise => exercise.block === 'warmup');
  const path = workout.exercises.filter(exercise => exercise.block !== 'warmup');

  const start = async () => {
    try {
      if (!workoutSession) {
        await startSession();
      }
      navigation.navigate(APP_ROUTES.WorkoutSession, { workoutId: workout.id });
    } catch (error) {
      Alert.alert(
        'No pudimos abrir la rutina',
        error instanceof Error ? error.message : 'Inténtalo otra vez.',
      );
    }
  };

  // A routine of mine can go to Comunidad (create_post type routine; the server
  // refuses copies and routines made by ELLIE); anything else is shared as text.
  const shareMenu = () =>
    Alert.alert(workout.title, undefined, [
      {
        text: 'Compartir en Comunidad',
        onPress: () =>
          navigation.navigate(APP_ROUTES.SocialCompose, {
            attach: 'routine',
            sourceId: workout.id,
          }),
      },
      { text: 'Compartir fuera de la app', onPress: share },
      { text: 'Cancelar', style: 'cancel' as const },
    ]);

  const share = async () => {
    try {
      await Share.share({
        title: workout.title,
        message: `${workout.title}\n${workout.description || ''}`.trim(),
      });
    } catch (error) {
      Alert.alert(
        'No pudimos compartir la rutina',
        error instanceof Error ? error.message : 'Inténtalo otra vez.',
      );
    }
  };

  const remove = () =>
    Alert.alert(
      'Eliminar rutina',
      'Esta rutina se eliminará de tu biblioteca. ¿Quieres continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await mutations.deleteRoutine(workout.id);
              back();
              if (result.archived) {
                Alert.alert(
                  'Rutina archivada',
                  deletedRoutineText(true, language),
                );
              }
            } catch (error) {
              const copy = routineErrorCopy(error, language);
              Alert.alert('No pudimos eliminar la rutina', copy.message);
            }
          },
        },
      ],
    );

  // Own routines: edit / delete in a small action menu.
  const openOwnerMenu = () =>
    Alert.alert(workout.title, undefined, [
      {
        text: 'Editar rutina',
        onPress: () =>
          navigation.navigate(APP_ROUTES.EditRoutine, {
            workoutId: workout.id,
          }),
      },
      ...(access.canDelete
        ? [
            {
              text: 'Eliminar rutina',
              style: 'destructive' as const,
              onPress: remove,
            },
          ]
        : []),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 104 }}
      >
        <WorkoutHero
          variant="detail"
          height={HERO_HEIGHT}
          image={image}
          onImageError={() => setImageBroken(true)}
          eyebrow={[routineTypeLabel(workout), LEVEL_LABELS[workout.difficulty]]
            .filter(Boolean)
            .join(' · ')}
          title={workout.title}
          bottomInset={52}
          topOffset={insets.top + 4}
          stats={[
            { value: String(workout.duration), label: 'minutos' },
            { value: String(workout.exercises.length), label: 'ejercicios' },
            { value: String(workout.calories), label: 'kcal' },
          ]}
          top={
            <>
              {backButton}
              <View style={styles.topRight}>
                {access.canEdit ? (
                  <IconButton
                    icon={MoreHorizontal}
                    variant="glass"
                    accessibilityLabel="Editar o eliminar"
                    onPress={openOwnerMenu}
                  />
                ) : null}
                <IconButton
                  icon={Heart}
                  variant="glass"
                  filled={favorite}
                  accessibilityLabel={
                    favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'
                  }
                  onPress={() => {
                    favorites.toggleWorkoutFavorite(workout.id).catch(() => {});
                  }}
                />
                <IconButton
                  icon={Share2}
                  variant="glass"
                  accessibilityLabel="Compartir"
                  onPress={access.canEdit ? shareMenu : share}
                />
              </View>
            </>
          }
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              paddingHorizontal: layout.gutter,
            },
          ]}
        >
          {workout.description ? (
            <TextV2 variant="bodyL" style={styles.description}>
              {workout.description}
            </TextV2>
          ) : null}

          {warmup.length > 0 ? (
            <View style={styles.block}>
              <Eyebrow>Calentamiento</Eyebrow>
              <RoutinePath steps={warmup.map(toStep)} />
            </View>
          ) : null}

          <View style={styles.block}>
            <Eyebrow>{`Recorrido · ${path.length} ejercicios`}</Eyebrow>
            {workout.exercises.length === 0 ? (
              <TextV2 variant="body" tone="secondary">
                Esta rutina aún no tiene ejercicios.
              </TextV2>
            ) : path.length > 0 ? (
              <RoutinePath steps={path.map(toStep)} />
            ) : null}
          </View>

          {zones.length > 0 ? (
            <View style={styles.block}>
              <Eyebrow>Trabaja</Eyebrow>
              <View style={styles.pills}>
                {zones.map((zone, index) => (
                  <Pill key={zone} label={zoneLabel(zone)} strong={index < 2} />
                ))}
              </View>
            </View>
          ) : null}

          {equipment.length > 0 ? (
            <View style={styles.block}>
              <Eyebrow>Necesitas</Eyebrow>
              <View style={styles.pills}>
                {equipment.map(item => (
                  <Pill
                    key={item.key}
                    label={item.label}
                    icon={EQUIPMENT_ICONS[item.key]}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <GlassSurface
        kind="nav"
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 4,
            borderTopColor: colors.divider,
          },
        ]}
      >
        <Button
          label={ctaLabel}
          icon={Play}
          iconPosition="end"
          loading={isStartingSession}
          loadingLabel="Preparando"
          onPress={start}
        />
      </GlassSurface>
    </View>
  );
}

function Pill({
  label,
  strong = false,
  icon: Icon,
}: {
  label: string;
  strong?: boolean;
  icon?: (typeof EQUIPMENT_ICONS)[keyof typeof EQUIPMENT_ICONS];
}) {
  const { colors } = useThemeV2();
  const fg = strong ? colors.cta.primaryText : colors.text.primary;
  return (
    <View
      style={[
        styles.pill,
        Icon ? styles.pillTall : null,
        { backgroundColor: strong ? colors.cta.primary : colors.surface.muted },
      ]}
    >
      {Icon ? <Icon size={15} color={fg} strokeWidth={2} /> : null}
      <TextV2
        variant="meta"
        color={fg}
        style={Icon ? styles.pillLabel : undefined}
      >
        {label}
      </TextV2>
    </View>
  );
}

// Error / not-found layout with the back button.
function Shell({
  top,
  colors,
  backButton,
  children,
}: {
  top: number;
  colors: { bg: string };
  backButton: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.screen,
        styles.shell,
        { backgroundColor: colors.bg, paddingTop: top + 8 },
      ]}
    >
      <StatusBarV2 />
      <View style={styles.shellBack}>{backButton}</View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  shell: {
    paddingHorizontal: 20,
    gap: 20,
  },
  shellBack: {
    alignSelf: 'flex-start',
  },
  topRight: {
    flexDirection: 'row',
    gap: 10,
  },
  sheet: {
    marginTop: -28,
    paddingTop: 22,
    gap: 26,
    minHeight: 420,
  },
  skeletonSheet: {
    paddingHorizontal: 20,
    gap: 16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  flexGap: {
    flex: 1,
    gap: 8,
  },
  description: {
    fontSize: 17,
    lineHeight: 25,
  },
  block: {
    gap: 10,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillTall: {
    height: 34,
  },
  pillLabel: {
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 80,
  },
});
