import { Heart, Clock, Flame, ChevronRight } from 'lucide-react';
import { Workout } from '@/lib/types';
import { useApp } from '@/contexts/AppContext';
import { useFavoriteWorkouts } from '@/hooks/useFavoriteWorkouts';
import { WorkoutThumbnailImage } from '@/components/workouts/WorkoutThumbnailImage';

interface FavoriteWorkoutsProps {
  onSelectWorkout: (workout: Workout) => void;
  onViewAll?: () => void;
}

export function FavoriteWorkouts({ onSelectWorkout, onViewAll }: FavoriteWorkoutsProps) {
  const { workouts } = useApp();
  const { favoriteWorkoutIds } = useFavoriteWorkouts();

  const favorites = workouts.filter((w) => favoriteWorkoutIds.includes(w.id));

  if (favorites.length === 0) return null;

  return (
    <div className="px-4">
      <button
        onClick={onViewAll}
        className="flex items-center justify-between mb-3 w-full text-left"
      >
        <h3 className="font-semibold text-foreground">Rutinas favoritas</h3>
        <span className="flex items-center text-xs text-muted-foreground">
          <ChevronRight className="h-4 w-4" />
        </span>
      </button>

      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4">
        {favorites.map((workout) => {
          return (
            <button
              key={workout.id}
              onClick={() => onSelectWorkout(workout)}
              className="relative min-w-[160px] max-w-[160px] overflow-hidden rounded-2xl bg-card border border-border/60 transition-transform active:scale-[0.98]"
            >
              <div className="relative h-24 overflow-hidden">
                <WorkoutThumbnailImage
                  src={workout.imageUrl}
                  title={workout.title}
                  type={workout.type}
                  targetMuscles={workout.targetMuscles}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                  <Heart className="h-3 w-3 fill-white text-white" />
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <h4 className="text-xs font-semibold text-white line-clamp-2 leading-tight drop-shadow-sm">
                    {workout.title}
                  </h4>
                </div>
              </div>

              <div className="p-2.5 pt-1.5">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {workout.duration}m
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Flame className="h-3 w-3" />
                    {workout.calories}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
