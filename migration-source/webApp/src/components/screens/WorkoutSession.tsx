import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Workout, Exercise } from '@/lib/types';
import { useWorkoutSession } from '@/contexts/WorkoutSessionContext';
import { useGamification } from '@/contexts/GamificationContext';
import { useApp } from '@/contexts/AppContext';
import { findExerciseByName, LibraryExercise, useExercises } from '@/hooks/useExercises';
import { cn } from '@/lib/utils';
import { formatLocalDate, getLocalWeekStart, getWorkoutSessionDateKey } from '@/lib/date';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface WorkoutSessionProps {
  workout: Workout;
  onBack: () => void;
  onFinish: (completedCount: number, totalCount: number) => void;
  onGoToProgress: () => void;
  onGoHome: () => void;
  onSelectExercise?: (exercise: LibraryExercise) => void;
}

interface SessionSummary {
  outcome: 'completed' | 'saved';
  workoutTitle: string;
  completedCount: number;
  totalCount: number;
  durationMinutes: number;
  caloriesBurned: number;
}

function formatTimer(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

export function WorkoutSession({
  workout,
  onBack,
  onFinish,
  onGoToProgress,
  onGoHome,
  onSelectExercise,
}: WorkoutSessionProps) {
  const {
    todaySession,
    toggleExercise: ctxToggle,
    finishSession,
    cancelSession,
    resumeSession,
    resetSession,
    refreshSession,
  } = useWorkoutSession();
  const { awardPoints, unlockBadge, gamification } = useGamification();
  const { workoutSessions } = useApp();

  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [sheetExercise, setSheetExercise] = useState<Exercise | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const completedIds = new Set(todaySession?.completedExercises ?? []);
  const totalCount = workout.exercises.length;
  const completedCount = completedIds.size;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isActive = todaySession?.status === 'in_progress';

  useEffect(() => {
    clearTimer();

    if (!todaySession?.startedAt || !isActive) return;

    const updateTimer = () => {
      const start = new Date(todaySession.startedAt!).getTime();
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    return clearTimer;
  }, [todaySession?.id, todaySession?.startedAt, isActive]);

  useEffect(() => {
    if (todaySession && !isActive && todaySession.startedAt && todaySession.endedAt) {
      const start = new Date(todaySession.startedAt).getTime();
      const end = new Date(todaySession.endedAt).getTime();
      setElapsedSeconds(Math.floor((end - start) / 1000));
      return;
    }

    if (!todaySession?.startedAt) {
      setElapsedSeconds(0);
    }
  }, [todaySession?.status]);

  useEffect(() => clearTimer, []);

  const handleToggle = (exerciseId: string) => {
    if (!isActive) return;
    ctxToggle(exerciseId);
  };

  const buildSessionSummary = (outcome: SessionSummary['outcome']): SessionSummary => {
    const liveElapsedSeconds = todaySession?.startedAt
      ? Math.max(
          elapsedSeconds,
          Math.floor((Date.now() - new Date(todaySession.startedAt).getTime()) / 1000),
        )
      : elapsedSeconds;

    const durationMinutes = Math.max(1, Math.round(liveElapsedSeconds / 60));
    const caloriesBurned = totalCount > 0
      ? Math.round((workout.calories * completedCount) / totalCount)
      : workout.calories;

    return {
      outcome,
      workoutTitle: workout.title,
      completedCount,
      totalCount,
      durationMinutes,
      caloriesBurned,
    };
  };

  const handleFinish = async () => {
    const summary = buildSessionSummary('completed');
    clearTimer();
    await finishSession();
    onFinish(completedCount, totalCount);
    setSessionSummary(summary);
    setShowFinishDialog(true);
    awardPoints('workout_completed');
    if (!gamification.badges.some(b => b.id === 'first_workout')) {
      unlockBadge('first_workout');
    }
    const weekStartStr = formatLocalDate(getLocalWeekStart());
    const thisWeekCount = workoutSessions.filter(
      s => s.completed && getWorkoutSessionDateKey(s) >= weekStartStr
    ).length + 1;
    if (thisWeekCount >= 3 && !gamification.badges.some(b => b.id === 'week_consistency')) {
      unlockBadge('week_consistency');
    }
  };

  const handleSaveForLater = async () => {
    const summary = buildSessionSummary('saved');
    clearTimer();
    await cancelSession();
    setShowCancelDialog(false);
    setSessionSummary(summary);
    setShowFinishDialog(true);
  };

  const { exercises: allExercises } = useExercises();

  const handleExerciseTap = (exercise: Exercise) => {
    const libraryExercise = findExerciseByName(allExercises, exercise.name);
    if (libraryExercise && onSelectExercise) {
      onSelectExercise(libraryExercise);
    } else {
      setSheetExercise(exercise);
    }
  };

  const getExerciseInfoLine = (exercise: Exercise): string => {
    const parts: string[] = [];
    if (exercise.sets && exercise.reps) {
      parts.push(`${exercise.sets}×${exercise.reps}`);
    } else if (exercise.duration) {
      parts.push(`${exercise.duration}s`);
    }
    if (exercise.restTime > 0) {
      parts.push(`${exercise.restTime}s desc.`);
    }
    return parts.join(' · ');
  };

  return (
    <div className="app-screen animate-fade-in flex min-h-dvh flex-col app-shell">
      {/* Compact sticky header */}
      <div className="sticky top-0 z-20 border-b border-border/30 bg-background/95 backdrop-blur-sm">
        <div className="px-4 pb-2.5 pt-3 safe-area-pt">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isActive) {
                  setShowCancelDialog(true);
                  return;
                }

                onBack();
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card border border-border/60 active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold text-foreground truncate">
                {workout.title}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {completedCount}/{totalCount} ejercicios · {formatTimer(elapsedSeconds)}
              </p>
            </div>
            <button
              onClick={() => setShowCancelDialog(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card border border-border/60 active:scale-95 transition-transform"
              aria-label="Guardar y salir"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="mt-2">
            <ProgressBar value={progressPct} size="sm" />
          </div>
        </div>
      </div>

      {/* Exercise checklist */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-28">
        <div className="space-y-2">
          {workout.exercises.map((exercise, index) => {
            const isDone = completedIds.has(exercise.id);

            return (
              <div
                key={exercise.id}
                className={cn(
                  'card-elevated flex items-center gap-3 p-3 transition-all duration-200',
                  isDone && 'opacity-50 bg-card/60'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    isDone ? 'bg-accent-green/20 text-accent-green' : 'bg-secondary text-foreground'
                  )}
                >
                  {index + 1}
                </span>

                <button
                  onClick={() => handleExerciseTap(exercise)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className={cn(
                    'font-medium text-sm text-foreground truncate transition-opacity',
                    isDone && 'line-through decoration-muted-foreground/40'
                  )}>
                    {exercise.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {getExerciseInfoLine(exercise)}
                  </p>
                </button>

                <button
                  onClick={() => handleToggle(exercise.id)}
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 active:scale-90',
                    isDone
                      ? 'bg-accent-green border-accent-green'
                      : 'border-muted-foreground/30 bg-transparent'
                  )}
                  aria-label={isDone ? 'Desmarcar' : 'Completar'}
                >
                  {isDone && <Check className="h-3.5 w-3.5 text-accent-green-foreground" />}
                </button>
              </div>
            );
          })}
        </div>

      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-10">
        <div className="app-shell">
          <div className="bg-gradient-to-t from-background via-background/95 to-transparent px-5 pt-6 safe-area-pb">
            <Button
              onClick={handleFinish}
              disabled={completedCount === 0 || !isActive}
              className="w-full rounded-full h-12 text-sm font-bold active:scale-[0.98] transition-transform"
              size="lg"
            >
              Finalizar entreno ({completedCount}/{totalCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Cancel dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">¿Guardar sesión para continuar después?</DialogTitle>
            <DialogDescription className="text-xs">
              Tu progreso actual quedará guardado para retomarlo más tarde desde Inicio.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              className="w-full rounded-full h-11 text-sm"
            >
              Seguir entrenando
            </Button>
            <Button
              onClick={handleSaveForLater}
              className="w-full rounded-full h-11 text-sm"
            >
              Guardar y salir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finish dialog */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">
              {sessionSummary?.outcome === 'completed'
                ? sessionSummary.completedCount === sessionSummary.totalCount
                  ? 'Entrenamiento finalizado'
                  : 'Sesión finalizada'
                : 'Sesión guardada para continuar después'}
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              {sessionSummary?.outcome === 'completed'
                ? 'Tu sesión quedó registrada con el progreso real de hoy.'
                : 'Puedes retomarla más tarde sin perder tu progreso.'}
            </DialogDescription>
          </DialogHeader>
          {sessionSummary && (
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-sm font-semibold text-foreground">
                {sessionSummary.workoutTitle}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {sessionSummary.completedCount}/{sessionSummary.totalCount}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Ejercicios</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {sessionSummary.durationMinutes} min
                  </p>
                  <p className="text-[10px] text-muted-foreground">Duración</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {sessionSummary.caloriesBurned}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Kcal</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {sessionSummary.outcome === 'completed'
                  ? `${sessionSummary.completedCount} de ${sessionSummary.totalCount} ejercicios completados.`
                  : `${sessionSummary.completedCount} de ${sessionSummary.totalCount} ejercicios listos para continuar después.`}
              </p>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {sessionSummary?.outcome === 'completed' ? (
              <>
                <Button
                  onClick={() => { setShowFinishDialog(false); onGoToProgress(); }}
                  className="w-full rounded-full h-11 text-sm"
                >
                  Ir a Progreso
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowFinishDialog(false); onGoHome(); }}
                  className="w-full rounded-full h-11 text-sm"
                >
                  Volver al inicio
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => { setShowFinishDialog(false); onGoHome(); }}
                  className="w-full rounded-full h-11 text-sm"
                >
                  Volver al inicio
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await refreshSession();
                    await resumeSession();
                    setShowFinishDialog(false);
                  }}
                  className="w-full rounded-full h-11 text-sm"
                >
                  Seguir entrenando
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise detail sheet */}
      <Sheet open={!!sheetExercise} onOpenChange={(open) => !open && setSheetExercise(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh] overflow-y-auto">
          {sheetExercise && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">{sheetExercise.name}</SheetTitle>
                <SheetDescription className="text-xs">
                  {getExerciseInfoLine(sheetExercise)}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-3 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Realiza este ejercicio con buena forma y control. Descansa el
                  tiempo indicado entre series.
                </p>
                <Button
                  variant="outline"
                  className="w-full rounded-full h-10 text-sm"
                  onClick={() => setSheetExercise(null)}
                >
                  Cerrar
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
