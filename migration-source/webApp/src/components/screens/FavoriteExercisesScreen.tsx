import { ArrowLeft, Heart } from 'lucide-react';
import { useExercises, equipmentLabels, bodyPartLabels, LibraryExercise } from '@/hooks/useExercises';
import { useFavoriteExercises } from '@/hooks/useFavoriteExercises';

interface FavoriteExercisesScreenProps {
  onBack: () => void;
  onSelectExercise: (exercise: LibraryExercise) => void;
}

export function FavoriteExercisesScreen({ onBack, onSelectExercise }: FavoriteExercisesScreenProps) {
  const { exercises } = useExercises();
  const { favoriteExerciseIds, toggleExerciseFavorite } = useFavoriteExercises();

  const favorites = exercises.filter((ex) => favoriteExerciseIds.includes(ex.id));

  return (
    <div className="animate-fade-in page-safe-bottom">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/40 bg-background/80 px-4 pb-3 pt-3 backdrop-blur-md safe-area-pt">
        <button onClick={onBack} className="p-1">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Ejercicios favoritos</h1>
        <span className="ml-auto text-xs text-muted-foreground">{favorites.length} guardados</span>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <Heart className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground text-sm">Aún no tienes ejercicios favoritos.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Marca ejercicios con el corazón para verlos aquí.</p>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3">
          {favorites.map((exercise) => (
            <button
              key={exercise.id}
              onClick={() => onSelectExercise(exercise)}
              className="w-full flex overflow-hidden rounded-2xl bg-card border border-border/60 text-left transition-transform active:scale-[0.98]"
            >
              <div className="relative w-24 min-h-[88px] overflow-hidden flex-shrink-0">
                <img src={exercise.thumbnailUrl} alt={exercise.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{exercise.name}</h4>
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                    {bodyPartLabels[exercise.bodyPart] || exercise.bodyPart}
                  </span>
                  <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                    {equipmentLabels[exercise.equipment] || exercise.equipment}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); toggleExerciseFavorite(exercise.id); }}
                className="p-3 flex items-start"
              >
                <Heart className="h-4 w-4 fill-foreground text-foreground" />
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
