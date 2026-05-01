import { useState } from "react";
import { cn } from "@/lib/utils";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { NutritionHistoryChart } from "@/components/progress/NutritionHistoryChart";
import { WaterHistoryChart } from "@/components/progress/WaterHistoryChart";
import { TrainingVolumeChart } from "@/components/progress/TrainingVolumeChart";
import { BodyScienceCard } from "@/components/progress/BodyScienceCard";
import { PersonalRecordsCard } from "@/components/pr/PersonalRecordsCard";
import { BodyScienceArticle } from "@/lib/types";
import { generateProgressInsights } from "@/lib/ellie";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllPersonalRecords } from "@/hooks/usePersonalRecords";
import { useExercises } from "@/hooks/useExercises";

interface ProgressTabProps {
  onNavigateToChallenge: () => void;
  onSelectArticle: (article: BodyScienceArticle) => void;
  onViewPRHistory?: (exerciseId: string) => void;
}

export function ProgressTab({ onNavigateToChallenge, onSelectArticle, onViewPRHistory }: ProgressTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "retos">("dashboard");
  const { isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="animate-fade-in px-4 page-safe-top space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="px-4 page-safe-top">
        <h1 className="page-title">Progreso</h1>

        <div className="mt-4 flex gap-2 rounded-xl bg-secondary p-1">
          <button
            onClick={() => setActiveSubTab("dashboard")}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
              activeSubTab === "dashboard" ? "bg-foreground text-background" : "text-muted-foreground",
            )}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveSubTab("retos")}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
              activeSubTab === "retos" ? "bg-foreground text-background" : "text-muted-foreground",
            )}
          >
            Retos
          </button>
        </div>
      </div>

      {activeSubTab === "dashboard" ? (
        <DashboardView onSelectArticle={onSelectArticle} onViewPRHistory={onViewPRHistory} />
      ) : (
        <RetosView onNavigateToChallenge={onNavigateToChallenge} />
      )}
    </div>
  );
}

function DashboardView({ onSelectArticle, onViewPRHistory }: { onSelectArticle: (article: BodyScienceArticle) => void; onViewPRHistory?: (exerciseId: string) => void }) {
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");
  const { workoutSessions, dailyNutritionLogs, getCurrentStreak, user } = useApp();
  const { records: allPRRecords } = useAllPersonalRecords();
  const { exercises } = useExercises();

  const prDataForInsights = allPRRecords.map(r => ({
    exerciseId: r.exerciseId,
    exerciseName: exercises.find(e => e.id === r.exerciseId)?.name ?? 'Ejercicio',
    prType: r.prType,
    valueWeight: r.valueWeight,
    valueReps: r.valueReps,
    valueDurationSec: r.valueDurationSec,
    valueDistanceM: r.valueDistanceM,
    recordedAt: r.recordedAt,
  }));

  const insights = generateProgressInsights({
    workoutSessions,
    trainingDaysPerWeek: user.trainingDaysPerWeek,
    currentStreak: getCurrentStreak(),
    dailyNutritionLogs,
    personalRecords: prDataForInsights,
  });

  return (
    <div className="mt-4 space-y-4 px-4">
      {/* ELLIE AI Insights */}
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-foreground" />
          <h3 className="font-semibold text-foreground">Análisis IA</h3>
        </div>
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <p key={i} className="text-sm text-muted-foreground">• {insight}</p>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTimeRange("week")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
            timeRange === "week" ? "bg-foreground text-background" : "bg-secondary text-muted-foreground",
          )}
        >
          7 días
        </button>
        <button
          onClick={() => setTimeRange("month")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
            timeRange === "month" ? "bg-foreground text-background" : "bg-secondary text-muted-foreground",
          )}
        >
          30 días
        </button>
      </div>

      <TrainingVolumeChart timeRange={timeRange} />
      <NutritionHistoryChart />
      <WaterHistoryChart />

      {/* Personal Records */}
      {allPRRecords.length > 0 && (
        <PersonalRecordsCard
          records={allPRRecords}
          exercises={exercises.map(e => ({ id: e.id, name: e.name }))}
          onSelectExercise={(exId) => onViewPRHistory?.(exId)}
        />
      )}

      <BodyScienceCard onSelectArticle={onSelectArticle} />
    </div>
  );
}

interface RetosViewProps {
  onNavigateToChallenge: () => void;
}

function RetosView({ onNavigateToChallenge }: RetosViewProps) {
  const { challenge, getChallengeDay, getCompletedDays, restartChallenge } = useApp();
  const handleNavigate = () => onNavigateToChallenge();

  if (!challenge) {
    return (
      <div className="mt-4 px-4">
        <div className="card-elevated p-5">
          <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
            Sin iniciar
          </span>
          <h3 className="mt-3 text-xl font-bold text-foreground">Athelete Core · 33</h3>
          <p className="mt-2 text-sm text-muted-foreground">3 hábitos. 33 días. Disciplina real.</p>
          <Button onClick={handleNavigate} className="mt-4 w-full rounded-full">
            Comenzar reto
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const day = getChallengeDay();
  const completed = getCompletedDays();
  const percentage = Math.round((completed / 33) * 100);
  const isCompleted = challenge.status === "completed" || day > 33;

  if (isCompleted) {
    return (
      <div className="mt-4 px-4">
        <div className="card-elevated p-5">
          <span className="inline-block rounded-full bg-accent-green/15 px-3 py-1 text-xs font-semibold text-accent-green">
            Completado
          </span>
          <h3 className="mt-2 text-xl font-bold text-foreground">Athelete Core · 33</h3>
          <p className="mt-1 text-sm text-muted-foreground">Reto completado · {percentage}% total</p>
          <Button
            onClick={() => { restartChallenge(); handleNavigate(); }}
            variant="outline"
            className="mt-4 w-full rounded-full"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reiniciar reto
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 px-4">
      <div className="card-elevated p-5">
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-block rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
              Activo
            </span>
            <h3 className="mt-2 text-xl font-bold text-foreground">Athelete Core · 33</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Día {day} de 33 · {percentage}% completado
            </p>
          </div>
          <CircularProgress value={percentage} size="lg" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {challenge.habits.map((habit) => (
            <span key={habit.id} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
              {habit.name}
            </span>
          ))}
        </div>

        <Button onClick={handleNavigate} className="mt-4 w-full rounded-full">
          Ver reto
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

      </div>
    </div>
  );
}
