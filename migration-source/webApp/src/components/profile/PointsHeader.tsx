import { Flame, Trophy, Zap } from 'lucide-react';
import { useGamification } from '@/contexts/GamificationContext';
import { useApp } from '@/contexts/AppContext';

export function PointsHeader() {
  const { gamification } = useGamification();
  const { challenge, getCompletedDays, getCurrentStreak, getLongestStreak, getChallengeDay } = useApp();

  const currentStreak = getCurrentStreak();
  const longestStreak = getLongestStreak();
  const completedDays = getCompletedDays();

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card/95 p-5 shadow-[0_16px_38px_rgba(15,23,42,0.07)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-secondary/90 to-transparent" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Identidad de progreso
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Puntos Athelete</h3>
            </div>
          </div>

          <div className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Resumen
          </div>
        </div>

        <div className="mt-5">
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {gamification.points.toLocaleString()}
            <span className="ml-2 text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
              pts
            </span>
          </p>
          <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
            Gana puntos entrenando, completando retos y sosteniendo tu ritmo dentro del plan.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <ProgressStat
            icon={Flame}
            label="Racha actual"
            value={`${currentStreak}`}
            meta="días"
          />
          <ProgressStat
            icon={Trophy}
            label="Mejor racha"
            value={`${longestStreak}`}
            meta="días"
          />
          <ProgressStat
            icon={Zap}
            label="Core 33"
            value={challenge ? `${completedDays}` : '—'}
            meta={challenge ? `Día ${getChallengeDay()}` : 'Sin reto'}
          />
        </div>
      </div>
    </div>
  );
}

function ProgressStat({
  icon: Icon,
  label,
  value,
  meta,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <div className="rounded-[22px] border border-border/60 bg-background/80 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{meta}</p>
    </div>
  );
}
