import { Play, Dumbbell, Check, Clock3, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { useWorkoutSession } from '@/contexts/WorkoutSessionContext';

interface TodayWorkoutCardProps {
  onStartWorkout: () => void;
  onContinueWorkout: () => void;
  onViewSummary: () => void;
}

export function TodayWorkoutCard({
  onStartWorkout,
  onContinueWorkout,
  onViewSummary,
}: TodayWorkoutCardProps) {
  const { todaySession, isLoadingSession } = useWorkoutSession();

  if (isLoadingSession) {
    return (
      <div className="card-elevated mx-4 p-4 animate-pulse">
        <div className="h-20 bg-secondary/50 rounded-xl" />
      </div>
    );
  }

  const status = todaySession?.status ?? 'idle';
  const isResumable = !!todaySession && status === 'canceled' && (
    todaySession.completedExercises.length > 0 || todaySession.duration > 0
  );

  // ── A. Idle ──
  if (!todaySession || (status !== 'in_progress' && status !== 'completed' && !isResumable)) {
    return (
      <div className="card-elevated mx-4 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Entrenamiento de hoy</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Aún no has entrenado hoy.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Estás a una sesión de un mejor día. ¿Listo para entrenar?
            </p>
          </div>
          <CircularProgress
            value={0}
            size="lg"
            className="ml-4"
            trackColor="stroke-border"
          />
        </div>
        <Button
          onClick={onStartWorkout}
          className="mt-4 w-full rounded-full font-bold"
        >
          <Dumbbell className="mr-2 h-4 w-4" />
          Elegir un entreno
        </Button>
      </div>
    );
  }

  const completedCount = todaySession.completedExercises.length;
  const totalExercises = todaySession.totalExercises || completedCount;
  const progressPct = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  // ── B. In progress ──
  if (status === 'in_progress' || isResumable) {
    return (
      <div className="card-elevated mx-4 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Entrenamiento de hoy</h3>
            <p className="mt-1 text-sm text-foreground">
              {todaySession.workoutTitle}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {status === 'in_progress'
                ? `En progreso · ${completedCount} de ${totalExercises} ejercicios`
                : `Sesión guardada · ${completedCount} de ${totalExercises} ejercicios`}
            </p>
          </div>
          <CircularProgress
            value={progressPct}
            size="lg"
            className="ml-4"
          />
        </div>
        <Button
          onClick={onContinueWorkout}
          className="mt-4 w-full rounded-full font-bold"
        >
          <Play className="mr-2 h-4 w-4" />
          Continuar entreno
        </Button>
      </div>
    );
  }

  // ── C. Completed ──
  if (status === 'completed') {
    return (
      <div className="card-elevated mx-4 overflow-hidden border border-border/70 bg-gradient-to-br from-card via-card to-secondary/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-foreground" />
              Completado hoy
            </div>
            <h3 className="mt-3 font-semibold text-foreground">Entrenamiento completado</h3>
            <p className="mt-1 truncate text-sm text-foreground">
              {todaySession.workoutTitle}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Ya cerraste tu sesión de hoy. Buen trabajo.
            </p>
          </div>
          <div className="shrink-0 rounded-[20px] border border-border/70 bg-background/90 px-4 py-3 text-right shadow-sm">
            <div className="flex justify-end">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Estado
            </p>
            <p className="text-sm font-semibold text-foreground">Listo</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground">
            {completedCount} de {totalExercises} ejercicios
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground">
            <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
            {todaySession.duration} min
          </div>
          {todaySession.caloriesBurned > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground">
              <Flame className="h-3.5 w-3.5 text-muted-foreground" />
              {todaySession.caloriesBurned} kcal
            </div>
          )}
        </div>

        <Button
          onClick={onViewSummary}
          variant="outline"
          className="mt-4 w-full rounded-full border-border/80 bg-background/80 font-bold"
        >
          Ver resumen
        </Button>
      </div>
    );
  }

  return null;
}
