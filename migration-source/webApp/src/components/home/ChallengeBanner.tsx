import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { formatLocalDate } from '@/lib/date';

interface ChallengeBannerProps {
  onStartChallenge: () => void;
}

export function ChallengeBanner({ onStartChallenge }: ChallengeBannerProps) {
  const { challenge, habitLogs, getChallengeDay, getCompletedDays, getCurrentStreak } = useApp();
  const today = formatLocalDate();
  const isActive = challenge?.status === 'active';
  const isCompleted = challenge?.status === 'completed';
  const todayLogs = challenge ? (habitLogs[today] || new Array(challenge.habits.length).fill(false)) : [];
  const completedToday = todayLogs.filter(Boolean).length;
  const totalHabits = challenge?.habits.length || 3;
  const challengeDay = challenge ? getChallengeDay() : 0;
  const completedDays = challenge ? getCompletedDays() : 0;
  const streak = challenge ? getCurrentStreak() : 0;
  const progressPct = challenge ? Math.round((completedDays / 33) * 100) : 0;

  return (
    <div className="relative mx-4 overflow-hidden rounded-2xl">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/40" />
      
      <div className="relative z-10 p-5">
        <div className="flex items-center gap-2">
          <span className="inline-block rounded-full bg-white text-black px-3 py-1 text-xs font-semibold tracking-wider">
            CORE · 33
          </span>
          {(isActive || isCompleted) && (
            <span className="inline-block rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
              {isCompleted ? 'COMPLETADO' : 'EN CURSO'}
            </span>
          )}
        </div>

        {!challenge && (
          <>
            <h2 className="mt-2 text-xl font-bold text-white tracking-tight">
              3 hábitos. 33 días.
            </h2>
            <p className="mt-0.5 text-sm text-white/60">
              Disciplina real, un día a la vez.
            </p>
          </>
        )}

        {isActive && (
          <>
            <h2 className="mt-2 text-xl font-bold text-white tracking-tight">
              Día {challengeDay} de 33
            </h2>
            <p className="mt-0.5 text-sm text-white/70">
              {completedToday === totalHabits
                ? `Hoy ya completaste tus ${totalHabits} hábitos.`
                : `Hoy llevas ${completedToday} de ${totalHabits} hábitos.`}
            </p>

            <div className="mt-4 space-y-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${Math.max(progressPct, completedDays > 0 ? 6 : 0)}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                  {progressPct}% completado
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                  {completedDays} días cerrados
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                  Racha actual: {streak} días
                </div>
              </div>
            </div>
          </>
        )}

        {isCompleted && (
          <>
            <h2 className="mt-2 text-xl font-bold text-white tracking-tight">
              Core 33 completado
            </h2>
            <p className="mt-0.5 text-sm text-white/70">
              Terminaste el reto. Revisa tu progreso y decide si quieres volver a empezarlo.
            </p>
          </>
        )}

        <Button
          onClick={onStartChallenge}
          className="mt-4 rounded-full font-bold bg-white text-black hover:bg-white/90"
        >
          {isActive ? 'Continuar reto' : isCompleted ? 'Ver progreso' : 'Comenzar reto'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
