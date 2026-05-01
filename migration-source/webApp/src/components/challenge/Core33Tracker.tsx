import { useRef, useEffect } from 'react';
import { Check, Dumbbell, Heart, Brain, Flame, Trophy } from 'lucide-react';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { useApp } from '@/contexts/AppContext';
import { useGamification } from '@/contexts/GamificationContext';
import { cn } from '@/lib/utils';

const CATEGORY_META: Record<string, { label: string; icon: typeof Dumbbell }> = {
  training: { label: 'Entrenamiento', icon: Dumbbell },
  health: { label: 'Salud', icon: Heart },
  mind: { label: 'Mentalidad', icon: Brain },
};

interface Core33TrackerProps {
  onDevReset?: () => void;
}

export function Core33Tracker({ onDevReset }: Core33TrackerProps) {
  const {
    challenge,
    getChallengeDay,
    habitLogs,
    toggleHabitLog,
    isDayCompleted,
    getCompletedDays,
    getCurrentStreak,
    getLongestStreak,
  } = useApp();
  const { awardPoints, unlockBadge, gamification } = useGamification();
  const timelineRef = useRef<HTMLDivElement>(null);

  const currentDay = challenge ? getChallengeDay() : 0;

  // Auto-scroll timeline to current day
  useEffect(() => {
    if (timelineRef.current) {
      const currentDayEl = timelineRef.current.querySelector('[data-current="true"]');
      if (currentDayEl) {
        currentDayEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [currentDay]);

  if (!challenge) return null;
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = habitLogs[today] || [false, false, false];
  const allTodayDone = todayLogs.every(Boolean);
  const todayDoneCount = todayLogs.filter(Boolean).length;

  const totalChecks = Object.values(habitLogs).reduce(
    (sum, dayLogs) => sum + dayLogs.filter(Boolean).length,
    0
  );
  const overallPct = Math.round((totalChecks / (3 * 33)) * 100);

  const completedDays = getCompletedDays();
  const currentStreak = getCurrentStreak();
  const longestStreak = getLongestStreak();

  const startDate = new Date(challenge.startDate);
  const days = Array.from({ length: 33 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const dayLogs = habitLogs[dateStr] || [];
    const doneCount = dayLogs.filter(Boolean).length;
    return {
      day: i + 1,
      dateStr,
      status: doneCount === 3 ? 'full' : doneCount > 0 ? 'partial' : 'empty',
      isCurrent: i + 1 === currentDay,
    };
  });

  return (
    <div className="flex h-full min-h-full flex-col page-safe-bottom pb-8">
      {/* ── Hero section ── */}
      <div className="px-5 pt-3 pb-4">
        <div className="card-elevated p-4 flex items-center gap-4">
          <CircularProgress
            value={overallPct}
            size="lg"
            strokeWidth={5}
            progressColor="stroke-primary"
            trackColor="stroke-border/40"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Core · 33</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Día {currentDay} de 33
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-500"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground tabular-nums">{overallPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Timeline strip ── */}
      <div className="px-5">
        <div className="card-elevated p-3">
          <div ref={timelineRef} className="overflow-x-auto hide-scrollbar">
            <div className="flex gap-[5px] min-w-max px-0.5 py-0.5">
              {days.map((d) => (
                <div
                  key={d.day}
                  data-current={d.isCurrent ? 'true' : undefined}
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-all shrink-0',
                    d.status === 'full' && 'bg-foreground text-background',
                    d.status === 'partial' && 'bg-foreground/20 text-foreground',
                    d.status === 'empty' && 'bg-card border border-border/50 text-muted-foreground/70',
                    d.isCurrent && d.status === 'empty' && 'border-foreground/60 text-foreground ring-2 ring-foreground/20 bg-foreground/5',
                    d.isCurrent && d.status === 'partial' && 'ring-2 ring-foreground/30',
                    d.isCurrent && d.status === 'full' && 'ring-2 ring-foreground/40'
                  )}
                >
                  {d.status === 'full' ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    d.day
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Today's habits ── */}
      <div className="mt-5 px-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Hábitos de hoy
          </h3>
          <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
            {todayDoneCount}/3
          </span>
        </div>

        <div className="space-y-2.5">
          {challenge.habits.map((habit, index) => {
            const meta = CATEGORY_META[habit.category] || CATEGORY_META.training;
            const Icon = meta.icon;
            const isDone = todayLogs[index];

            return (
              <button
                key={habit.id}
                onClick={() => {
                  toggleHabitLog(today, index);
                  const updatedLogs = [...todayLogs];
                  updatedLogs[index] = !updatedLogs[index];
                  const allDone = updatedLogs.every(Boolean);

                  if (allDone) {
                    awardPoints('core33_day_completed');
                    const streak = getCurrentStreak() + 1;
                    if (streak >= 7 && !gamification.badges.some(b => b.id === 'streak_7_days')) {
                      unlockBadge('streak_7_days');
                    }
                    const day = getChallengeDay();
                    const completedDays = getCompletedDays() + 1;
                    if (day >= 33 && completedDays >= 33) {
                      awardPoints('core33_completed');
                      unlockBadge('core33_finisher');
                    }
                  }
                }}
                className={cn(
                  'card-elevated w-full flex items-center gap-3.5 p-4 transition-all active:scale-[0.98]',
                  isDone && 'bg-accent-green/[0.06] border-accent-green/20'
                )}
              >
                {/* Check circle */}
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                    isDone ? 'bg-foreground border-foreground' : 'border-border/60'
                  )}
                >
                  {isDone && <Check className="h-4 w-4 text-primary-foreground" />}
                </div>

                {/* Text */}
                <div className="flex-1 text-left min-w-0">
                  <p className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider',
                    isDone ? 'text-muted-foreground' : 'text-muted-foreground/70'
                  )}>
                    {meta.label}
                  </p>
                  <p className={cn(
                    'text-[15px] font-semibold mt-0.5 truncate',
                    isDone ? 'text-foreground' : 'text-foreground/80'
                  )}>
                    {habit.name}
                  </p>
                </div>

                {/* Category icon */}
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isDone ? 'bg-secondary' : 'bg-card'
                )}>
                  <Icon className={cn('h-4 w-4', isDone ? 'text-foreground' : 'text-muted-foreground/50')} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Success banner ── */}
      {allTodayDone && (
        <div className="mt-4 mx-5 card-elevated p-4 bg-accent-green/[0.06] border-accent-green/20 text-center animate-scale-in">
          <p className="text-xl">🎉</p>
          <h3 className="mt-1 font-bold text-foreground text-sm">¡Todo listo por hoy!</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Nos vemos mañana. Mantén la racha.</p>
        </div>
      )}

      {/* ── Streak stats ── */}
      <div className="mt-5 px-5 grid grid-cols-2 gap-2.5">
        <div className="card-elevated p-3.5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
            <Flame className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground tabular-nums leading-none">{currentStreak}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Racha actual</p>
          </div>
        </div>
        <div className="card-elevated p-3.5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50">
            <Trophy className="h-4.5 w-4.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground tabular-nums leading-none">{longestStreak}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Mejor racha</p>
          </div>
        </div>
      </div>

      {/* ── Motivational text ── */}
      {!allTodayDone && (
        <p className="mt-3.5 px-5 text-xs text-muted-foreground/70 text-center leading-relaxed">
          Completa los 3 hábitos hoy para mantener tu racha.
        </p>
      )}

    </div>
  );
}
