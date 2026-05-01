import { ArrowLeft, Heart, Clock, Flame } from 'lucide-react';
import { Workout } from '@/lib/types';
import { useApp } from '@/contexts/AppContext';
import { useFavoriteWorkouts } from '@/hooks/useFavoriteWorkouts';
import { WorkoutThumbnailImage } from '@/components/workouts/WorkoutThumbnailImage';

interface FavoriteRoutinesScreenProps {
  onBack: () => void;
  onSelectWorkout: (workout: Workout) => void;
}

export function FavoriteRoutinesScreen({ onBack, onSelectWorkout }: FavoriteRoutinesScreenProps) {
  const { workouts } = useApp();
  const { favoriteWorkoutIds, toggleWorkoutFavorite } = useFavoriteWorkouts();

  const favorites = workouts.filter((w) => favoriteWorkoutIds.includes(w.id));

  return (
    <div className="animate-fade-in page-safe-bottom">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/40 bg-background/80 px-4 pb-3 pt-3 backdrop-blur-md safe-area-pt">
        <button onClick={onBack} className="p-1">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Rutinas favoritas</h1>
        <span className="ml-auto text-xs text-muted-foreground">{favorites.length} guardadas</span>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <Heart className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground text-sm">Aún no tienes rutinas favoritas.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Marca rutinas con el corazón para verlas aquí.</p>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3">
          {favorites.map((workout) => {
            return (
              <button
                key={workout.id}
                onClick={() => onSelectWorkout(workout)}
                className="w-full flex overflow-hidden rounded-2xl bg-card border border-border/60 text-left transition-transform active:scale-[0.98]"
              >
                <div className="relative w-28 min-h-[96px] overflow-hidden flex-shrink-0">
                  <WorkoutThumbnailImage
                    src={workout.imageUrl}
                    title={workout.title}
                    type={workout.type}
                    targetMuscles={workout.targetMuscles}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{workout.title}</h4>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{workout.duration}m</span>
                      <span className="flex items-center gap-1"><Flame className="h-3 w-3" />{workout.calories} kcal</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {workout.targetMuscles.slice(0, 3).map((m) => (
                      <span key={m} className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{m}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleWorkoutFavorite(workout.id); }}
                  className="p-3 flex items-start"
                >
                  <Heart className="h-4 w-4 fill-foreground text-foreground" />
                </button>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
