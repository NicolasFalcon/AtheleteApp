import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TabId, Workout, BodyScienceArticle } from "@/lib/types";
import { LibraryExercise } from "@/hooks/useExercises";
import { bodyScienceArticles } from "@/lib/bodyScienceData";
import { useApp } from "@/contexts/AppContext";
import { useWorkoutSession } from "@/contexts/WorkoutSessionContext";
import { useGamification } from "@/contexts/GamificationContext";
import { useFavoriteExercises } from "@/hooks/useFavoriteExercises";
import { useFavoriteWorkouts } from "@/hooks/useFavoriteWorkouts";

import { usePersonalRecords } from "@/hooks/usePersonalRecords";
import { useExercises } from "@/hooks/useExercises";
import { BottomNav } from "@/components/layout/BottomNav";
import { HomeTab } from "@/components/tabs/HomeTab";
import { ProgressTab } from "@/components/tabs/ProgressTab";
import { WorkoutsTab } from "@/components/tabs/WorkoutsTab";
import { BodyScienceTab } from "@/components/tabs/BodyScienceTab";
import { ProfileTab } from "@/components/tabs/ProfileTab";
import { WorkoutDetail } from "@/components/screens/WorkoutDetail";
import { WorkoutSession } from "@/components/screens/WorkoutSession";
import { ChallengeIntro } from "@/components/screens/ChallengeIntro";
import { ExerciseDetail } from "@/components/screens/ExerciseDetail";
import { RoutineBuilder } from "@/components/screens/RoutineBuilder";
import { NutritionPlanScreen } from "@/components/screens/NutritionPlanScreen";
import { BodyScienceArticleScreen } from "@/components/screens/BodyScienceArticleScreen";
import { EllieScreen } from "@/components/screens/EllieScreen";

import { FavoriteRoutinesScreen } from "@/components/screens/FavoriteRoutinesScreen";
import { FavoriteExercisesScreen } from "@/components/screens/FavoriteExercisesScreen";
import { PRHistoryScreen } from "@/components/pr/PRHistoryScreen";
import { RegisterPRSheet } from "@/components/pr/RegisterPRSheet";
import { QuizLandingScreen } from "@/components/quiz/QuizLandingScreen";
import { QuizQuestionScreen } from "@/components/quiz/QuizQuestionScreen";
import { QuizCategory } from "@/hooks/useQuiz";
import { NotificationsScreen } from "@/components/screens/NotificationsScreen";

type Screen =
  | "tabs"
  | "workout-detail"
  | "workout-session"
  | "challenge"
  | "exercise-detail"
  | "routine-builder"
  | "nutrition-plan"
  | "body-science-article"
  | "ellie"
  | "favorite-routines"
  | "favorite-exercises"
  | "pr-history"
  | "quiz-landing"
  | "quiz-question"
  | "notifications";

function AppContent() {
  const { workouts, addCustomWorkout, refreshWorkouts } = useApp();
  const { todaySession, startSession, resumeSession } = useWorkoutSession();
  const { awardPoints, unlockBadge } = useGamification();
  const { isExerciseFavorite, toggleExerciseFavorite } = useFavoriteExercises();
  const { isWorkoutFavorite, toggleWorkoutFavorite } = useFavoriteWorkouts();
  
  const { exercises: allExercises } = useExercises();
  const allPRs = usePersonalRecords();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("inicio");
  const [screen, setScreen] = useState<Screen>("tabs");
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<LibraryExercise | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<BodyScienceArticle | null>(null);
  const [previousScreen, setPreviousScreen] = useState<Screen>("tabs");
  
  const [prHistoryExerciseId, setPrHistoryExerciseId] = useState<string | null>(null);
  const [showPRSheetFromHistory, setShowPRSheetFromHistory] = useState(false);
  const [showHomePRSheet, setShowHomePRSheet] = useState(false);
  const [selectedQuizCategory, setSelectedQuizCategory] = useState<QuizCategory | null>(null);

  const handleViewPRHistory = (exerciseId: string) => {
    setPrHistoryExerciseId(exerciseId);
    setPreviousScreen(screen);
    setScreen("pr-history");
  };

  const handleNavigateToExerciseFromPR = (exerciseId: string) => {
    handleViewPRHistory(exerciseId);
  };

  const handleNavigateToWorkout = (workout: Workout) => {
    setSelectedWorkout(workout);
    setPreviousScreen(screen);
    setScreen("workout-detail");
  };

  const handleNavigateToExercise = (exercise: LibraryExercise) => {
    setSelectedExercise(exercise);
    setPreviousScreen(screen);
    setScreen("exercise-detail");
  };

  const handleNavigateToChallenge = () => {
    navigate("/challenges/core-33");
  };

  const handleNavigateToEllie = () => {
    setScreen("ellie");
  };

  const handleBackToTabs = () => {
    setScreen("tabs");
    setSelectedWorkout(null);
    setSelectedExercise(null);
  };

  const handleBackFromExercise = () => {
    if (previousScreen === "workout-session" && selectedWorkout) {
      setScreen("workout-session");
    } else if (previousScreen === "workout-detail" && selectedWorkout) {
      setScreen("workout-detail");
    } else {
      setScreen("tabs");
      setActiveTab("entrenos");
    }
    setSelectedExercise(null);
  };

  const handleNavigateToRoutineFromExercise = (routineName: string) => {
    const workout = workouts.find((w) => w.title === routineName);
    if (workout) {
      setSelectedWorkout(workout);
      setScreen("workout-detail");
      setSelectedExercise(null);
    }
  };

  const handleStartWorkout = async () => {
    if (selectedWorkout) {
      await startSession(selectedWorkout);
      setScreen("workout-session");
    }
  };

  const handleContinueWorkout = async () => {
    if (!todaySession) return;
    const isResumable = todaySession.status === "in_progress" || todaySession.status === "canceled";
    if (!isResumable) return;

    const workout = workouts.find((w) => w.id === todaySession.workoutId);
    if (!workout) return;

    if (todaySession.status === "canceled") {
      await resumeSession();
    }

    setSelectedWorkout(workout);
    setScreen("workout-session");
  };

  // Session is now persisted in WorkoutSessionContext directly
  const handleSessionFinish = (_completedCount: number, _totalCount: number) => {
    // No-op: session already saved to DB by finishSession() in context
  };

  const handleSessionGoToProgress = () => {
    setScreen("tabs");
    setActiveTab("progreso");
    setSelectedWorkout(null);
  };

  const handleSessionGoHome = () => {
    setScreen("tabs");
    setActiveTab("inicio");
    setSelectedWorkout(null);
  };

  const handleSessionBack = () => {
    if (selectedWorkout) {
      setScreen("workout-detail");
    } else {
      setScreen("tabs");
    }
  };

  const handleCreateRoutine = () => {
    setScreen("routine-builder");
  };

  const handleSaveRoutine = (workout: Omit<Workout, "id">) => {
    addCustomWorkout(workout);
    awardPoints('custom_workout_created');
    unlockBadge('first_custom_workout');
    setScreen("tabs");
    setActiveTab("entrenos");
  };

  const handleViewNutritionPlan = () => {
    setScreen("nutrition-plan");
  };

  const handleViewArticle = (articleId: string) => {
    const article = bodyScienceArticles.find(a => a.id === articleId);
    if (article) {
      setSelectedArticle(article);
      setScreen("body-science-article");
    }
  };

  // Handle ELLIE tab and other tab changes
  const handleTabChange = (tab: TabId) => {
    if (tab === 'ellie') {
      setScreen('ellie');
    } else {
      if (screen === 'ellie') {
        setScreen('tabs');
      }
      setActiveTab(tab);
    }
  };

  const handleOpenNotifications = () => {
    setScreen('notifications');
  };

  // Notifications screen
  if (screen === "notifications") {
    return (
      <div className="min-h-screen bg-background app-shell">
        <NotificationsScreen
          onBack={handleBackToTabs}
          onStartWorkout={() => { setScreen("tabs"); setActiveTab("entrenos"); }}
          onLogNutrition={() => { setScreen("tabs"); setActiveTab("registro"); }}
          onViewChallenge={handleNavigateToChallenge}
          onLogHydration={() => { setScreen("tabs"); setActiveTab("inicio"); }}
          onAskEllie={handleNavigateToEllie}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    );
  }

  // Quiz landing screen
  if (screen === "quiz-landing") {
    return (
      <div className="min-h-screen bg-background app-shell">
        <QuizLandingScreen
          onBack={handleBackToTabs}
          onSelectCategory={(cat) => {
            setSelectedQuizCategory(cat);
            setScreen("quiz-question");
          }}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    );
  }

  // Quiz question screen
  if (screen === "quiz-question" && selectedQuizCategory) {
    return (
      <div className="min-h-screen bg-background app-shell">
        <QuizQuestionScreen
          category={selectedQuizCategory}
          onBack={() => setScreen("quiz-landing")}
          onFinish={() => {
            setScreen("tabs");
            setActiveTab("inicio");
            setSelectedQuizCategory(null);
          }}
        />
      </div>
    );
  }

  // Favorite routines screen
  if (screen === "favorite-routines") {
    return (
      <div className="min-h-screen bg-background app-shell">
        <FavoriteRoutinesScreen
          onBack={handleBackToTabs}
          onSelectWorkout={handleNavigateToWorkout}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    );
  }

  // Favorite exercises screen
  if (screen === "favorite-exercises") {
    return (
      <div className="min-h-screen bg-background app-shell">
        <FavoriteExercisesScreen
          onBack={handleBackToTabs}
          onSelectExercise={handleNavigateToExercise}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    );
  }

  // ELLIE screen
  if (screen === "ellie") {
    return (
      <div className="min-h-screen bg-background app-shell">
        <EllieScreen
          onBack={handleBackToTabs}
          onStartWorkout={() => { setScreen("tabs"); setActiveTab("entrenos"); }}
          onLogNutrition={() => { setScreen("tabs"); setActiveTab("registro"); }}
          onViewChallenge={handleNavigateToChallenge}
          onViewArticle={handleViewArticle}
        />
        <BottomNav activeTab="ellie" onTabChange={handleTabChange} />
      </div>
    );
  }

  // Body Science article screen
  if (screen === "body-science-article" && selectedArticle) {
    return (
      <div className="min-h-screen bg-background app-shell">
        <BodyScienceArticleScreen
          article={selectedArticle}
          onBack={() => { setScreen("tabs"); setSelectedArticle(null); }}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    );
  }

  // Nutrition plan screen
  if (screen === "nutrition-plan") {
    return (
      <div className="min-h-screen bg-background app-shell">
        <NutritionPlanScreen onBack={handleBackToTabs} />
      </div>
    );
  }

  // Routine builder screen
  if (screen === "routine-builder") {
    return (
      <div className="min-h-screen bg-background app-shell">
        <RoutineBuilder onBack={handleBackToTabs} onSave={handleSaveRoutine} />
      </div>
    );
  }

  // PR History screen
  if (screen === "pr-history" && prHistoryExerciseId) {
    const prExercise = allExercises.find(e => e.id === prHistoryExerciseId);
    const exercisePRs = allPRs.records.filter(r => r.exerciseId === prHistoryExerciseId);
    return (
      <div className="min-h-screen bg-background app-shell">
        <PRHistoryScreen
          exerciseName={prExercise?.name ?? 'Ejercicio'}
          records={exercisePRs}
          onBack={() => { setScreen(previousScreen); setPrHistoryExerciseId(null); }}
          onDelete={allPRs.deleteRecord}
          onRegisterPR={() => setShowPRSheetFromHistory(true)}
        />
        {prExercise && (
          <RegisterPRSheet
            open={showPRSheetFromHistory}
            onOpenChange={setShowPRSheetFromHistory}
            exerciseId={prHistoryExerciseId}
            exerciseName={prExercise.name}
            onSave={async (pr) => { const ok = await allPRs.addRecord(pr); return ok; }}
          />
        )}
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    );
  }

  // Exercise detail screen
  if (screen === "exercise-detail" && selectedExercise) {
    return (
      <div className="min-h-screen bg-background app-shell">
        <ExerciseDetail
          exercise={selectedExercise}
          onBack={handleBackFromExercise}
          onNavigateToRoutine={handleNavigateToRoutineFromExercise}
          onNavigateToArticle={(articleId) => handleViewArticle(articleId)}
          isFavorite={isExerciseFavorite(selectedExercise.id)}
          onToggleFavorite={() => toggleExerciseFavorite(selectedExercise.id)}
          onViewPRHistory={handleViewPRHistory}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    );
  }

  // Workout session screen
  if (screen === "workout-session" && selectedWorkout) {
    return (
      <div className="min-h-screen bg-background app-shell">
        <WorkoutSession
          workout={selectedWorkout}
          onBack={handleSessionBack}
          onFinish={handleSessionFinish}
          onGoToProgress={handleSessionGoToProgress}
          onGoHome={handleSessionGoHome}
          onSelectExercise={handleNavigateToExercise}
        />
      </div>
    );
  }

  if (screen === "workout-detail" && selectedWorkout) {
    return (
      <div className="min-h-screen bg-background app-shell">
        <WorkoutDetail
          workout={selectedWorkout}
          onBack={handleBackToTabs}
          onStart={handleStartWorkout}
          onSelectExercise={handleNavigateToExercise}
          isFavorite={isWorkoutFavorite(selectedWorkout.id)}
          onToggleFavorite={() => toggleWorkoutFavorite(selectedWorkout.id)}
          onDeleted={async () => {
            await refreshWorkouts();
            handleBackToTabs();
          }}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    );
  }

  if (screen === "challenge") {
    return (
      <div className="min-h-screen bg-background app-shell">
        <ChallengeIntro onBack={handleBackToTabs} />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background app-shell">
      <main className="overflow-y-auto">
        {activeTab === "inicio" && (
          <HomeTab
            onNavigateToChallenge={handleNavigateToChallenge}
            onNavigateToWorkout={handleNavigateToWorkout}
            onNavigateToWorkouts={() => setActiveTab("entrenos")}
            onNavigateToNutrition={() => setActiveTab("registro")}
            onNavigateToEllie={handleNavigateToEllie}
            onContinueWorkout={handleContinueWorkout}
            onViewNutritionPlan={handleViewNutritionPlan}
            onSelectExercise={handleNavigateToExercise}
            
            onViewAllFavoriteRoutines={() => setScreen("favorite-routines")}
            onViewAllFavoriteExercises={() => setScreen("favorite-exercises")}
            onRegisterPR={() => setShowHomePRSheet(true)}
            onViewPRProgress={() => { setActiveTab("progreso"); }}
            onStartQuiz={() => setScreen("quiz-landing")}
            onOpenNotifications={handleOpenNotifications}
          />
        )}
        {activeTab === "progreso" && (
          <ProgressTab
            onNavigateToChallenge={handleNavigateToChallenge}
            onSelectArticle={(article) => {
              setSelectedArticle(article);
              setScreen("body-science-article");
            }}
            onViewPRHistory={handleViewPRHistory}
          />
        )}
        {activeTab === "entrenos" && (
          <WorkoutsTab
            onSelectWorkout={handleNavigateToWorkout}
            onSelectExercise={handleNavigateToExercise}
            onCreateRoutine={handleCreateRoutine}
          />
        )}
        {activeTab === "registro" && (
          <BodyScienceTab
            onSelectArticle={(article) => {
              setSelectedArticle(article);
              setScreen("body-science-article");
            }}
          />
        )}
        {activeTab === "perfil" && (
          <ProfileTab />
        )}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      
      <RegisterPRSheet
        open={showHomePRSheet}
        onOpenChange={setShowHomePRSheet}
        exerciseId=""
        exerciseName=""
        onSave={async (pr) => { const ok = await allPRs.addRecord(pr); return ok; }}
        showExercisePicker
      />
    </div>
  );
}

const Index = () => {
  return <AppContent />;
};

export default Index;
