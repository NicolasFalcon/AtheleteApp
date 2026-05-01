import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/Chip";
import { habitOptions } from "@/lib/mockData";
import { useApp } from "@/contexts/AppContext";
import { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChallengeIntroProps {
  onBack: () => void;
}

type Step = "intro" | "select" | "day" | "progress";

export function ChallengeIntro({ onBack }: ChallengeIntroProps) {
  const {
    challenge,
    startChallenge,
    getChallengeDay,
    habitLogs,
    toggleHabitLog,
    getCompletedDays,
    getCurrentStreak,
    isDayCompleted,
  } = useApp();
  const [step, setStep] = useState<Step>(challenge ? "day" : "intro");
  const [selectedHabits, setSelectedHabits] = useState<
    { category: string; name: string }[]
  >([]);

  const handleSelectHabit = (category: string, name: string) => {
    const existing = selectedHabits.find(
      (h) => h.category === category && h.name === name,
    );
    if (existing) {
      setSelectedHabits((prev) =>
        prev.filter((h) => !(h.category === category && h.name === name)),
      );
    } else if (selectedHabits.length < 3) {
      setSelectedHabits((prev) => [...prev, { category, name }]);
    }
  };

  const handleConfirmHabits = () => {
    const habits: Habit[] = selectedHabits.map((h, i) => ({
      id: `h${i + 1}`,
      challengeId: "new",
      category: h.category as "training" | "health" | "mind",
      name: h.name,
    }));
    startChallenge(habits);
    setStep("day");
  };

  const currentDay = getChallengeDay();
  const today = new Date().toISOString().split("T")[0];
  const todayLogs = habitLogs[today] || [false, false, false];
  const allCompleted = todayLogs.every((c) => c);

  if (step === "intro") {
    return (
      <div className="animate-fade-in min-h-screen bg-background">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 pt-4">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
        </div>

        <div className="flex flex-col items-center px-6 pt-12 text-center">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            ATHELETE CORE · 33
          </span>
          <h1 className="mt-4 text-3xl font-bold text-foreground">
            3 hábitos. 33 días.
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">Disciplina real.</p>

          <div className="mt-10 w-full space-y-4 text-left">
            {[
              {
                num: "1",
                text: "Elige 3 hábitos simples en entrenamiento, salud y mente.",
              },
              { num: "2", text: "Márcalos cada día durante 33 días." },
              {
                num: "3",
                text: "Sigue tu progreso y construye disciplina real.",
              },
            ].map((item) => (
              <div key={item.num} className="flex gap-4 items-start">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {item.num}
                </span>
                <p className="text-foreground pt-1">{item.text}</p>
              </div>
            ))}
          </div>

          <Button
            onClick={() => setStep("select")}
            className="mt-12 w-full"
            size="lg"
          >
            Elegir mis hábitos
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === "select") {
    const categories = [
      {
        key: "training",
        label: "Entrenamiento",
        options: habitOptions.training,
      },
      { key: "health", label: "Salud", options: habitOptions.health },
      { key: "mind", label: "Mente", options: habitOptions.mind },
    ];

    return (
      <div className="animate-fade-in min-h-screen bg-background pb-32">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 pt-4">
          <button
            onClick={() => setStep("intro")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">
            Elige tus hábitos
          </h1>
        </div>

        <div className="mt-6 space-y-6 px-4">
          {categories.map((cat) => (
            <div key={cat.key}>
              <h3 className="font-semibold text-foreground mb-3">
                {cat.label}
              </h3>
              <div className="flex flex-wrap gap-2">
                {cat.options.map((option) => {
                  const isSelected = selectedHabits.some(
                    (h) => h.category === cat.key && h.name === option,
                  );
                  return (
                    <Chip
                      key={option}
                      variant={isSelected ? "selected" : "outline"}
                      onClick={() => handleSelectHabit(cat.key, option)}
                    >
                      {option}
                    </Chip>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Fixed bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-4">
          <p className="text-center text-sm text-muted-foreground mb-3">
            Has elegido {selectedHabits.length} / 3 hábitos
          </p>
          <Button
            onClick={handleConfirmHabits}
            disabled={selectedHabits.length !== 3}
            className="w-full"
            size="lg"
          >
            Confirmar mis 3 hábitos
          </Button>
        </div>
      </div>
    );
  }

  if (step === "day") {
    return (
      <div className="animate-fade-in min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 pt-4">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Día {currentDay} / 33
            </h1>
            <p className="text-sm text-muted-foreground">Athlete Core · 33</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 px-4">
          <div className="h-2 w-full rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(currentDay / 33) * 100}%` }}
            />
          </div>
        </div>

        {/* Habits checklist */}
        <div className="mt-8 space-y-3 px-4">
          {challenge?.habits.map((habit, index) => (
            <button
              key={habit.id}
              onClick={() => toggleHabitLog(today, index)}
              className={cn(
                "card-elevated w-full flex items-center gap-4 p-4 transition-all",
                todayLogs[index] && "bg-accent border-primary/20",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                  todayLogs[index]
                    ? "bg-primary border-primary"
                    : "border-border",
                )}
              >
                {todayLogs[index] && (
                  <Check className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              <span
                className={cn(
                  "font-medium",
                  todayLogs[index]
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {habit.name}
              </span>
            </button>
          ))}
        </div>

        {/* Celebration message */}
        {allCompleted && (
          <div className="mt-8 mx-4 card-elevated p-5 bg-accent text-center animate-scale-in">
            <p className="text-2xl">🎉</p>
            <h3 className="mt-2 font-bold text-foreground">
              ¡Genial! Día completado.
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Nos vemos mañana.
            </p>
          </div>
        )}

        {/* Bottom button */}
        <div className="mt-8 px-4">
          <Button
            onClick={() => setStep("progress")}
            variant="outline"
            className="w-full"
          >
            Ver mi progreso
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Progress view
  const completedDays = getCompletedDays();
  const streak = getCurrentStreak();
  const percentage = Math.round((completedDays / 33) * 100);

  // Generate 33-day grid
  const startDate = challenge?.startDate
    ? new Date(challenge.startDate)
    : new Date();
  const days = Array.from({ length: 33 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    return {
      day: i + 1,
      date: dateStr,
      completed: isDayCompleted(dateStr),
    };
  });

  return (
    <div className="animate-fade-in min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 pt-4">
        <button
          onClick={() => setStep("day")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Mi progreso</h1>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3 px-4">
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-primary">{streak}</p>
          <p className="text-xs text-muted-foreground">Racha actual</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{completedDays}</p>
          <p className="text-xs text-muted-foreground">/ 33 días</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{percentage}%</p>
          <p className="text-xs text-muted-foreground">Progreso</p>
        </div>
      </div>

      {/* 33-day grid */}
      <div className="mt-6 px-4">
        <div className="card-elevated p-4">
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => (
              <div
                key={day.day}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-all",
                  day.completed
                    ? "bg-primary text-primary-foreground"
                    : "border-2 border-border text-muted-foreground",
                )}
              >
                {day.day}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Share button */}
      <div className="mt-6 px-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            // Placeholder for share functionality
            alert("¡Compartir progreso próximamente!");
          }}
        >
          Compartir mi progreso
        </Button>
      </div>
    </div>
  );
}
