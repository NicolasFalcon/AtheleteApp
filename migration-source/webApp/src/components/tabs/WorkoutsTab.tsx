import { useState } from 'react';
import { Search, Clock, Flame, Plus, Heart, Star } from 'lucide-react';
import { getWorkoutThumbnail } from '@/lib/workoutThumbnails';
import { Input } from '@/components/ui/input';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/button';
import { Workout } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getWorkoutAccess } from '@/lib/workoutOwnership';
import { FEATURED_COLLECTION_BADGE, FEATURED_COLLECTION_TITLE } from '@/lib/featuredRoutines';
import { ExerciseLibrary } from '@/components/screens/ExerciseLibrary';
import { LibraryExercise } from '@/hooks/useExercises';
import { useApp } from '@/contexts/AppContext';
import { useFavoriteExercises } from '@/hooks/useFavoriteExercises';
import { useFavoriteWorkouts } from '@/hooks/useFavoriteWorkouts';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkoutThumbnailImage } from '@/components/workouts/WorkoutThumbnailImage';

interface WorkoutsTabProps {
  onSelectWorkout: (workout: Workout) => void;
  onSelectExercise: (exercise: LibraryExercise) => void;
  onCreateRoutine: () => void;
}

const filterOptions = ['Todos', 'Fuerza', 'Cardio', 'Full body', 'HIIT', 'Movilidad'];

const typeMap: Record<string, string> = {
  'Fuerza': 'strength',
  'Cardio': 'cardio',
  'Full body': 'fullbody',
  'HIIT': 'hiit',
  'Movilidad': 'mobility',
};

type TabMode = 'routines' | 'library';
type RoutineSourceView = 'library' | 'ellie' | 'mine';

export function WorkoutsTab({ onSelectWorkout, onSelectExercise, onCreateRoutine }: WorkoutsTabProps) {
  const { user, workouts, isLoading } = useApp();
  const { isExerciseFavorite, toggleExerciseFavorite, favoriteExerciseIds } = useFavoriteExercises();
  const { isWorkoutFavorite, toggleWorkoutFavorite, favoriteWorkoutIds } = useFavoriteWorkouts();
  const [activeTab, setActiveTab] = useState<TabMode>('routines');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [routineSourceView, setRoutineSourceView] = useState<RoutineSourceView>('library');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filteredWorkouts = workouts.filter((workout) => {
    const access = getWorkoutAccess(workout, user.id);
    const matchesSource =
      (routineSourceView === 'library' && access.kind === 'library') ||
      (routineSourceView === 'ellie' && access.kind === 'ellie') ||
      (routineSourceView === 'mine' && access.kind === 'personal');

    if (!matchesSource) {
      return false;
    }

    if (favoritesOnly && !favoriteWorkoutIds.includes(workout.id)) {
      return false;
    }

    const matchesSearch = workout.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'Todos' || workout.type === typeMap[activeFilter];
    return matchesSearch && matchesFilter;
  });
  const featuredEditorialWorkouts = filteredWorkouts.reduce<Workout[]>((uniqueWorkouts, workout) => {
    if (routineSourceView !== 'library' || workout.sourceType !== 'featured_editorial') {
      return uniqueWorkouts;
    }

    const identity = workout.source || workout.id;
    if (uniqueWorkouts.some((item) => (item.source || item.id) === identity)) {
      return uniqueWorkouts;
    }

    uniqueWorkouts.push(workout);
    return uniqueWorkouts;
  }, []);
  const libraryListWorkouts = filteredWorkouts.filter(
    (workout) => !(routineSourceView === 'library' && workout.sourceType === 'featured_editorial')
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in px-4 page-safe-top space-y-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Segment tabs */}
      <div className="px-4 page-safe-top">
        <div className="flex rounded-xl bg-secondary p-1">
          <button
            onClick={() => setActiveTab('routines')}
            className={cn(
              'flex-1 rounded-lg py-2.5 text-sm font-medium transition-all',
              activeTab === 'routines'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Rutinas
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={cn(
              'flex-1 rounded-lg py-2.5 text-sm font-medium transition-all',
              activeTab === 'library'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Ejercicios
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'routines' ? (
        <>
          {/* Header */}
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="page-title">Entrenos</h1>
              <Button onClick={onCreateRoutine} size="sm" className="gap-1.5 rounded-full">
                <Plus className="h-4 w-4" />
                Crear
              </Button>
            </div>

            {/* Routine source toggle */}
            <div className="flex rounded-xl bg-secondary p-1">
              <button
                onClick={() => setRoutineSourceView('library')}
                className={cn(
                  'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
                  routineSourceView === 'library'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Biblioteca
              </button>
              <button
                onClick={() => setRoutineSourceView('ellie')}
                className={cn(
                  'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
                  routineSourceView === 'ellie'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                ELLIE
              </button>
              <button
                onClick={() => setRoutineSourceView('mine')}
                className={cn(
                  'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
                  routineSourceView === 'mine'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Mis rutinas
              </button>
            </div>

            {/* Search */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar entreno"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4">
              <Chip
                variant={favoritesOnly ? 'selected' : 'outline'}
                onClick={() => setFavoritesOnly((current) => !current)}
                size="sm"
              >
                <Star className="mr-1 h-3 w-3" />
                Solo favoritos
              </Chip>
              {filterOptions.map((filter) => (
                <Chip
                  key={filter}
                  variant={activeFilter === filter ? 'selected' : 'outline'}
                  onClick={() => setActiveFilter(filter)}
                  size="sm"
                >
                  {filter}
                </Chip>
              ))}
            </div>
          </div>

          {/* Workout list */}
          <div className="mt-4 space-y-3 px-4">
            {routineSourceView === 'library' && featuredEditorialWorkouts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-foreground tracking-tight">
                      {FEATURED_COLLECTION_TITLE}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Rutinas editoriales inspiradas en estilos reconocibles del fitness.
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                    {FEATURED_COLLECTION_BADGE}
                  </span>
                </div>

                <div className="hide-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
                  {featuredEditorialWorkouts.map((workout) => (
                    <FeaturedWorkoutCard
                      key={workout.source || workout.id}
                      workout={workout}
                      isFavorite={isWorkoutFavorite(workout.id)}
                      onToggleFavorite={() => toggleWorkoutFavorite(workout.id)}
                      onClick={() => onSelectWorkout(workout)}
                    />
                  ))}
                </div>
              </div>
            )}

            {libraryListWorkouts.map((workout) => (
              <WorkoutListItem
                key={workout.id}
                workout={workout}
                isFavorite={isWorkoutFavorite(workout.id)}
                onToggleFavorite={() => toggleWorkoutFavorite(workout.id)}
                onClick={() => onSelectWorkout(workout)}
              />
            ))}

            {/* Empty state for current source favorites */}
            {libraryListWorkouts.length === 0 && featuredEditorialWorkouts.length === 0 && favoritesOnly && (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                  <Star className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">Sin favoritos en esta sección</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-[260px] mx-auto">
                  Toca el ícono <Heart className="inline h-3.5 w-3.5 text-primary" /> en un entreno para guardarlo aquí.
                </p>
                <button
                  onClick={() => setFavoritesOnly(false)}
                  className="mt-4 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Ver toda la sección
                </button>
              </div>
            )}

            {/* Empty state for general search */}
            {libraryListWorkouts.length === 0 && featuredEditorialWorkouts.length === 0 && !favoritesOnly && (
              <div className="py-12 text-center">
                <p className="text-foreground font-medium">
                  {routineSourceView === 'library' && 'Sin rutinas en Biblioteca'}
                  {routineSourceView === 'ellie' && 'Sin rutinas de ELLIE'}
                  {routineSourceView === 'mine' && 'Aún no tienes rutinas propias'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {routineSourceView === 'mine'
                    ? 'Crea una rutina para verla aquí.'
                    : 'Prueba con otra búsqueda o filtro.'}
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <ExerciseLibrary
          onSelectExercise={onSelectExercise}
          isExerciseFavorite={isExerciseFavorite}
          toggleExerciseFavorite={toggleExerciseFavorite}
          favoriteExerciseIds={favoriteExerciseIds}
        />
      )}
    </div>
  );
}

interface WorkoutListItemProps {
  workout: Workout;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}

function WorkoutListItem({ workout, isFavorite, onToggleFavorite, onClick }: WorkoutListItemProps) {
  const workoutImages: Record<string, string> = {
    '1': 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=200&q=80',
    '2': 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=200&q=80',
    '3': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&q=80',
    '4': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&q=80',
    '5': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=200&q=80',
  };

  const thumbnail = workout.createdByAi
    ? (workout.imageUrl || getWorkoutThumbnail(workout.type, workout.targetMuscles, workout.title))
    : (workout.imageUrl || workoutImages[workout.id] || workoutImages['1']);

  const difficultyLabels = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
  };

  return (
    <button
      onClick={onClick}
      className="card-interactive flex w-full gap-4 p-3 text-left relative"
    >
      <WorkoutThumbnailImage
        src={thumbnail}
        title={workout.title}
        type={workout.type}
        targetMuscles={workout.targetMuscles}
        className="h-20 w-20 rounded-xl object-cover grayscale"
        loading="lazy"
      />
      <div className="flex flex-1 flex-col justify-center pr-8">
        <h3 className="font-semibold text-foreground">{workout.title}</h3>
        <p className="text-xs font-medium text-muted-foreground">
          {difficultyLabels[workout.difficulty]}
        </p>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {workout.duration} min
          </span>
          <span className="flex items-center gap-1">
            <Flame className="h-3 w-3" />
            {workout.calories} kcal
          </span>
        </div>
      </div>

      {/* Favorite toggle */}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            onToggleFavorite();
          }
        }}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-secondary/80 transition-colors hover:bg-secondary"
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        <Heart
          className={cn(
            'h-4 w-4 transition-colors',
            isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'
          )}
        />
      </div>
    </button>
  );
}

interface FeaturedWorkoutCardProps {
  workout: Workout;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}

function FeaturedWorkoutCard({ workout, isFavorite, onToggleFavorite, onClick }: FeaturedWorkoutCardProps) {
  return (
    <button
      onClick={onClick}
      className="relative min-w-[220px] overflow-hidden rounded-3xl border border-border/60 bg-card text-left transition-transform active:scale-[0.98]"
    >
      <div className="relative h-32 overflow-hidden">
        <WorkoutThumbnailImage
          src={workout.imageUrl}
          title={workout.title}
          type={workout.type}
          targetMuscles={workout.targetMuscles}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full bg-white/92 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
            {FEATURED_COLLECTION_BADGE}
          </span>
          {workout.collectionBadge && (
            <span className="rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Inspirada
            </span>
          )}
        </div>

        <button
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-sm"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-colors',
              isFavorite ? 'fill-white text-white' : 'text-white/70'
            )}
          />
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
            {workout.inspirationStyle || FEATURED_COLLECTION_TITLE}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-white line-clamp-2">
            {workout.title}
          </h3>
        </div>
      </div>

      <div className="space-y-2 p-3">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {workout.description}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {workout.duration} min
          </span>
          <span className="flex items-center gap-1">
            <Flame className="h-3 w-3" />
            {workout.calories} kcal
          </span>
        </div>
      </div>
    </button>
  );
}
