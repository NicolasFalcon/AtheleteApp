import { Heart, Clock, Flame, Sparkles } from 'lucide-react';
import { Workout } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useFavoriteWorkouts } from '@/hooks/useFavoriteWorkouts';
import { useEllieRecommendations } from '@/hooks/useEllieRecommendations';
import { WorkoutThumbnailImage } from '@/components/workouts/WorkoutThumbnailImage';

interface WorkoutCarouselProps {
  onSelectWorkout: (workout: Workout) => void;
}

export function WorkoutCarousel({ onSelectWorkout }: WorkoutCarouselProps) {
  const { isWorkoutFavorite, toggleWorkoutFavorite } = useFavoriteWorkouts();
  const recommendations = useEllieRecommendations(8);

  if (recommendations.length === 0) return null;

  return (
    <div className="px-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-foreground" />
        <h3 className="font-semibold text-foreground tracking-tight">Recomendados para ti</h3>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Seleccionados por ELLIE según tus objetivos
      </p>
      
      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4">
        {recommendations.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            isFavorite={isWorkoutFavorite(workout.id)}
            onToggleFavorite={() => toggleWorkoutFavorite(workout.id)}
            onClick={() => onSelectWorkout(workout)}
          />
        ))}
      </div>
    </div>
  );
}

interface WorkoutCardProps {
  workout: Workout;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}

function WorkoutCard({ workout, isFavorite, onToggleFavorite, onClick }: WorkoutCardProps) {
  return (
    <button
      onClick={onClick}
      className="relative min-w-[160px] overflow-hidden rounded-2xl bg-card border border-border transition-transform active:scale-[0.98]"
    >
      <div className="relative h-28 overflow-hidden">
        <WorkoutThumbnailImage
          src={workout.imageUrl}
          title={workout.title}
          type={workout.type}
          targetMuscles={workout.targetMuscles}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {/* Stronger dark overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        
        {workout.createdByAi && (
          <span className="absolute left-2 top-2 flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-black">
            <Sparkles className="h-2.5 w-2.5" />
            ELLIE
          </span>
        )}
        
        <button
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-colors',
              isFavorite ? 'fill-white text-white' : 'text-white/70'
            )}
          />
        </button>

        {/* Title overlay on image */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <h4 className="text-xs font-semibold text-white line-clamp-1 drop-shadow-sm">
            {workout.title}
          </h4>
        </div>
      </div>

      <div className="p-2.5 pt-1.5">
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
