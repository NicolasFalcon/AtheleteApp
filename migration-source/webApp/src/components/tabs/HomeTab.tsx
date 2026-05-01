import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ChallengeBanner } from "@/components/home/ChallengeBanner";
import { TodayWorkoutCard } from "@/components/home/TodayWorkoutCard";
import { NutritionCard } from "@/components/home/NutritionCard";
import { HydrationCard } from "@/components/home/HydrationCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { EllieCard } from "@/components/home/EllieCard";
import { RecoveryGuidanceCard } from "@/components/home/RecoveryGuidanceCard";
import { WearBanner } from "@/components/home/WearBanner";
import { WorkoutCarousel } from "@/components/home/WorkoutCarousel";
import { FavoriteExercises } from "@/components/home/FavoriteExercises";
import { FavoriteWorkouts } from "@/components/home/FavoriteWorkouts";
import { RecentPRCard } from "@/components/home/RecentPRCard";
import { QuizCard } from "@/components/home/QuizCard";
import { Workout } from "@/lib/types";
import { LibraryExercise } from "@/hooks/useExercises";
import { useApp } from "@/contexts/AppContext";
import { Skeleton } from "@/components/ui/skeleton";

interface HomeTabProps {
  onNavigateToChallenge: () => void;
  onNavigateToWorkout: (workout: Workout) => void;
  onNavigateToWorkouts: () => void;
  onNavigateToNutrition: () => void;
  onNavigateToEllie: () => void;
  onContinueWorkout: () => void;
  onViewNutritionPlan?: () => void;
  onSelectExercise: (exercise: LibraryExercise) => void;

  onViewAllFavoriteRoutines?: () => void;
  onViewAllFavoriteExercises?: () => void;
  onRegisterPR?: () => void;
  onViewPRProgress?: () => void;
  onStartQuiz?: () => void;
  onLogHydration?: () => void;
  onOpenNotifications?: () => void;
}

export function HomeTab({
  onNavigateToChallenge,
  onNavigateToWorkout,
  onNavigateToWorkouts,
  onNavigateToNutrition,
  onNavigateToEllie,
  onContinueWorkout,
  onViewNutritionPlan,
  onSelectExercise,

  onViewAllFavoriteRoutines,
  onViewAllFavoriteExercises,
  onRegisterPR,
  onViewPRProgress,
  onStartQuiz,
  onLogHydration,
  onOpenNotifications,
}: HomeTabProps) {
  const { isLoading } = useApp();
  const [isWearPreviewOpen, setIsWearPreviewOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <Header onOpenNotifications={onOpenNotifications} />
        <div className="space-y-6 pt-2 px-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Header onOpenNotifications={onOpenNotifications} />

      <div className="space-y-4 pt-1">
        {/* Primary content */}
        <ChallengeBanner onStartChallenge={onNavigateToChallenge} />
        <TodayWorkoutCard
          onStartWorkout={onNavigateToWorkouts}
          onContinueWorkout={onContinueWorkout}
          onViewSummary={onNavigateToWorkouts}
        />
        <NutritionCard
          onAskEllie={onNavigateToEllie}
          onViewPlan={onViewNutritionPlan}
        />

        {/* Hydration tracking */}
        <HydrationCard />

        {/* ELLIE AI card — premium hero */}
        <EllieCard onAskEllie={onNavigateToEllie} />

        {/* Quiz / Learning card */}
        <QuizCard onStartQuiz={onStartQuiz ?? (() => {})} />

        {/* Recent PR */}
        <RecentPRCard
          onRegisterPR={onRegisterPR ?? (() => {})}
          onViewProgress={onViewPRProgress ?? (() => {})}
        />

        {/* Recovery guidance */}
        <RecoveryGuidanceCard onAskEllie={onNavigateToEllie} />
        <WearBanner onViewCollection={() => setIsWearPreviewOpen(true)} />

        <FavoriteWorkouts
          onSelectWorkout={onNavigateToWorkout}
          onViewAll={onViewAllFavoriteRoutines}
        />
        <FavoriteExercises
          onSelectExercise={onSelectExercise}
          onViewAll={onViewAllFavoriteExercises}
        />

        <WorkoutCarousel onSelectWorkout={onNavigateToWorkout} />
      </div>

      <WearPreviewModal
        open={isWearPreviewOpen}
        onOpenChange={setIsWearPreviewOpen}
      />
    </div>
  );
}

function WearPreviewModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] rounded-[28px] p-6 sm:p-8">
        <DialogHeader>
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Próximamente
            </span>
            <DialogTitle className="text-2xl">Athelete Wear</DialogTitle>
            <DialogDescription className="max-w-[20rem] text-sm text-muted-foreground">
              La línea Athelete Wear está en camino. Pronto podrás explorar
              prendas y accesorios diseñados para entrenar con estilo.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <div className="rounded-[26px] border border-border/60 bg-secondary/10 p-4">
            <p className="text-sm font-semibold text-foreground">
              Colección en preparación
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["Tops", "Bottoms", "Accesorios"].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/60 bg-background/90 px-3 py-2 text-center text-xs font-medium text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[26px] border border-border/60 bg-background/90 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Estamos preparando la colección oficial para la app.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
