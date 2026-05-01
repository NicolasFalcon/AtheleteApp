import { Heart, ChevronRight } from 'lucide-react';
import { useExercises, equipmentLabels, bodyPartLabels, LibraryExercise } from '@/hooks/useExercises';
import { useFavoriteExercises } from '@/hooks/useFavoriteExercises';

interface FavoriteExercisesProps {
  onSelectExercise: (exercise: LibraryExercise) => void;
  onViewAll?: () => void;
}

export function FavoriteExercises({ onSelectExercise, onViewAll }: FavoriteExercisesProps) {
  const { exercises } = useExercises();
  const { favoriteExerciseIds } = useFavoriteExercises();

  const favorites = exercises.filter((ex) => favoriteExerciseIds.includes(ex.id));

  if (favorites.length === 0) return null;

  return (
    <div className="px-4">
      <button
        onClick={onViewAll}
        className="flex items-center justify-between mb-3 w-full text-left"
      >
        <h3 className="font-semibold text-foreground">Ejercicios favoritos</h3>
        <span className="flex items-center text-xs text-muted-foreground">
          <ChevronRight className="h-4 w-4" />
        </span>
      </button>

      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4">
        {favorites.map((exercise) => (
          <button
            key={exercise.id}
            onClick={() => onSelectExercise(exercise)}
            className="relative min-w-[140px] max-w-[140px] overflow-hidden rounded-2xl bg-card border border-border/60 transition-transform active:scale-[0.98]"
          >
            <div className="relative h-24 overflow-hidden">
              <img
                src={exercise.thumbnailUrl}
                alt={exercise.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
              <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                <Heart className="h-3 w-3 fill-white text-white" />
              </span>
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <h4 className="text-xs font-semibold text-white line-clamp-2 leading-tight drop-shadow-sm">
                  {exercise.name}
                </h4>
              </div>
            </div>
            <div className="p-2.5 pt-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full truncate">
                  {bodyPartLabels[exercise.bodyPart] || exercise.bodyPart}
                </span>
                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full truncate">
                  {equipmentLabels[exercise.equipment] || exercise.equipment}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
