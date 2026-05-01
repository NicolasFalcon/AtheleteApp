import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGamification } from '@/contexts/GamificationContext';
import { Badge as BadgeType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AchievementsSectionProps {
  previewCount?: number;
}

export function AchievementsSection({ previewCount = 4 }: AchievementsSectionProps) {
  const { gamification, allBadges } = useGamification();
  const [showAll, setShowAll] = useState(false);

  const earnedMap = useMemo(
    () => new Map(gamification.badges.map((badge) => [badge.id, badge])),
    [gamification.badges],
  );

  const sortedBadges = useMemo(
    () =>
      [...allBadges].sort((a, b) => {
        const earnedA = earnedMap.get(a.id);
        const earnedB = earnedMap.get(b.id);

        if (Boolean(earnedA) !== Boolean(earnedB)) {
          return earnedA ? -1 : 1;
        }

        if (earnedA?.earnedAt && earnedB?.earnedAt) {
          return new Date(earnedB.earnedAt).getTime() - new Date(earnedA.earnedAt).getTime();
        }

        return a.title.localeCompare(b.title);
      }),
    [allBadges, earnedMap],
  );

  const visibleBadges = showAll ? sortedBadges : sortedBadges.slice(0, previewCount);
  const earnedCount = gamification.badges.length;
  const lockedCount = allBadges.length - earnedCount;

  return (
    <div className="rounded-[28px] border border-border/60 bg-card/95 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Logros y badges
          </p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Hitos desbloqueados</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {earnedCount > 0
              ? 'Mostrando tus logros más recientes primero.'
              : 'Tus próximos hitos aparecerán aquí a medida que avances.'}
          </p>
        </div>

        <div className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {earnedCount}/{allBadges.length}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {visibleBadges.map((badge) => {
          const earnedBadge = earnedMap.get(badge.id);

          return (
            <BadgeCard
              key={badge.id}
              badge={badge}
              earned={Boolean(earnedBadge)}
              earnedAt={earnedBadge?.earnedAt}
              expanded={showAll}
            />
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-border/60 bg-background/70 px-3.5 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">{earnedCount} desbloqueados</p>
          <p className="text-xs text-muted-foreground">{lockedCount} pendientes por conseguir</p>
        </div>

        {allBadges.length > previewCount && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full px-4"
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll ? 'Mostrar menos' : 'Ver todos los logros'}
          </Button>
        )}
      </div>
    </div>
  );
}

function BadgeCard({
  badge,
  earned,
  earnedAt,
  expanded,
}: {
  badge: BadgeType;
  earned: boolean;
  earnedAt?: string;
  expanded: boolean;
}) {
  const earnedDateLabel = earnedAt
    ? new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(new Date(earnedAt))
    : 'Sigue avanzando';

  return (
    <div
      className={cn(
        'rounded-[22px] border p-3.5 transition-all',
        earned
          ? 'border-foreground/10 bg-background/80 shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
          : 'border-border/60 bg-secondary/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base',
            earned ? 'bg-foreground text-background' : 'bg-background text-muted-foreground',
          )}
        >
          {earned ? badge.icon : <Lock className="h-4 w-4" />}
        </div>

        <span
          className={cn(
            'rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
            earned ? 'bg-secondary text-foreground' : 'bg-background text-muted-foreground',
          )}
        >
          {earned ? 'Listo' : 'Bloqueado'}
        </span>
      </div>

      <p className={cn('mt-3 text-sm font-semibold leading-tight', earned ? 'text-foreground' : 'text-muted-foreground')}>
        {badge.title}
      </p>

      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {expanded ? badge.description : earned ? `Desbloqueado ${earnedDateLabel}` : earnedDateLabel}
      </p>
    </div>
  );
}
