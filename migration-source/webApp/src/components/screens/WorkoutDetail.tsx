import { useState } from 'react';
import { ArrowLeft, Clock, Flame, Dumbbell, Play, ChevronRight, Heart, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/Chip';
import { Workout, Exercise } from '@/lib/types';
import { findExerciseByName, LibraryExercise, useExercises } from '@/hooks/useExercises';
import { cn } from '@/lib/utils';
import { getWorkoutThumbnail } from '@/lib/workoutThumbnails';
import { toast } from '@/hooks/use-toast';
import { WorkoutThumbnailImage } from '@/components/workouts/WorkoutThumbnailImage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface WorkoutDetailProps {
  workout: Workout;
  onBack: () => void;
  onStart: () => void;
  onSelectExercise?: (exercise: LibraryExercise) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  ownershipLabel?: string;
  ownershipDescription?: string;
  onEdit?: () => void;
  onDelete?: () => Promise<boolean> | boolean;
  onDeleted?: () => void;
}

const difficultyLabels = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export function WorkoutDetail({
  workout,
  onBack,
  onStart,
  onSelectExercise,
  isFavorite,
  onToggleFavorite,
  canEdit = false,
  canDelete = false,
  ownershipLabel,
  ownershipDescription,
  onEdit,
  onDelete,
  onDeleted,
}: WorkoutDetailProps) {
  const { exercises: allExercises } = useExercises();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const workoutImages: Record<string, string> = {
    '1': 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=800&q=80',
    '2': 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=800&q=80',
    '3': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    '4': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    '5': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80',
  };

  // Use AI thumbnail for ELLIE workouts, fallback to hardcoded map
  const heroImage = workout.createdByAi
    ? (workout.imageUrl || getWorkoutThumbnail(workout.type, workout.targetMuscles, workout.title))
    : (workout.imageUrl || workoutImages[workout.id] || workoutImages['1']);

  const handleExerciseClick = (exercise: Exercise) => {
    const libraryExercise = findExerciseByName(allExercises, exercise.name);
    if (libraryExercise && onSelectExercise) {
      onSelectExercise(libraryExercise);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    const deleted = await onDelete();
    setIsDeleting(false);
    setShowDeleteDialog(false);
    if (deleted) {
      toast({ title: 'Rutina eliminada', description: `"${workout.title}" ha sido eliminada.` });
      onDeleted?.();
    } else {
      toast({
        title: 'No se pudo eliminar',
        description: 'Solo las rutinas que te pertenecen pueden eliminarse.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="animate-fade-in page-safe-bottom pb-40">
      {/* Hero image */}
      <div className="relative h-64">
        <WorkoutThumbnailImage
          src={heroImage}
          title={workout.title}
          type={workout.type}
          targetMuscles={workout.targetMuscles}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute left-4 top-safe-offset flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>

        {/* Top-right actions */}
        <div className="absolute right-4 top-safe-offset flex items-center gap-2">
          {canEdit && onEdit && (
            <button
              onClick={onEdit}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-sm transition-colors"
              aria-label="Editar rutina"
            >
              <Pencil className="h-5 w-5 text-white" />
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-sm transition-colors"
              aria-label="Eliminar rutina"
            >
              <Trash2 className="h-5 w-5 text-red-400" />
            </button>
          )}
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 transition-colors"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={cn(
                  'h-5 w-5 transition-colors',
                  isFavorite ? 'fill-white text-white' : 'text-white/70'
                )}
              />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-8 relative z-10">
        <div className="card-elevated p-5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{workout.title}</h1>
            {workout.isFeatured && workout.collectionBadge && (
              <span className="inline-flex rounded-full bg-foreground px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-background">
                {workout.collectionBadge}
              </span>
            )}
            {ownershipLabel && (
              <span className="inline-flex rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                {ownershipLabel}
              </span>
            )}
          </div>
          {workout.inspirationStyle && (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {workout.inspirationStyle}
            </p>
          )}
          {ownershipDescription && (
            <p className="mt-2 text-sm text-muted-foreground">{ownershipDescription}</p>
          )}
          
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip variant="default" size="sm">{difficultyLabels[workout.difficulty]}</Chip>
            {workout.targetMuscles.slice(0, 3).map((muscle) => (
              <Chip key={muscle} variant="default" size="sm">{muscle}</Chip>
            ))}
            {(workout.tags || []).slice(0, 3).map((tag) => (
              <Chip key={tag} variant="outline" size="sm">{tag}</Chip>
            ))}
          </div>

          <div className="mt-4 flex gap-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-foreground">{workout.duration} min</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-foreground">{workout.calories} kcal</span>
            </div>
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-foreground">{workout.exercises.length} ejercicios</span>
            </div>
          </div>
        </div>

        {/* Exercises list */}
        <div className="mt-4">
          <h2 className="font-semibold text-foreground">Ejercicios</h2>
          <p className="text-xs text-muted-foreground mt-1">Toca un ejercicio para ver detalles</p>
          <div className="mt-3 space-y-2">
            {workout.exercises.map((exercise, index) => {
              const libraryExercise = findExerciseByName(allExercises, exercise.name);
              const isClickable = !!libraryExercise;
              
              return (
                <button
                  key={exercise.id}
                  onClick={() => handleExerciseClick(exercise)}
                  disabled={!isClickable}
                  className={`card-elevated flex w-full items-center gap-4 p-4 text-left transition-colors ${
                    isClickable ? 'hover:bg-secondary/50 active:scale-[0.99]' : ''
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{exercise.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {exercise.sets && exercise.reps
                        ? `${exercise.sets} series × ${exercise.reps} reps`
                        : exercise.duration
                        ? `${exercise.duration}s`
                        : ''}
                      {exercise.restTime > 0 && ` · ${exercise.restTime}s descanso`}
                    </p>
                    {exercise.notes && (
                      <p className="mt-1 text-xs text-muted-foreground/90">{exercise.notes}</p>
                    )}
                  </div>
                  {isClickable && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="app-shell">
          <div className="bg-gradient-to-t from-background via-background/95 to-transparent px-5 pt-6 safe-area-pb">
            <Button
              onClick={onStart}
              className="w-full rounded-full h-12 text-sm font-bold active:scale-[0.98] transition-transform"
              size="lg"
            >
              <Play className="mr-2 h-4 w-4" />
              Comenzar entreno
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-[340px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta rutina?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion elimina la rutina de tu biblioteca personal. Las plantillas globales no se pueden modificar ni recuperar despues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
