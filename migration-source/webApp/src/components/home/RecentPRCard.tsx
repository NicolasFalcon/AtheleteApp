import { Trophy, Plus, ChevronRight } from 'lucide-react';
import { useAllPersonalRecords } from '@/hooks/usePersonalRecords';
import { useExercises } from '@/hooks/useExercises';
import { useMemo } from 'react';

interface RecentPRCardProps {
  onRegisterPR: () => void;
  onViewProgress: () => void;
}

function formatPRValue(pr: { prType: string; valueWeight: number | null; valueReps: number | null; valueDurationSec: number | null; valueDistanceM: number | null }): string {
  switch (pr.prType) {
    case 'max_weight': return `${pr.valueWeight ?? 0} kg`;
    case 'weight_reps': return `${pr.valueWeight ?? 0} kg × ${pr.valueReps ?? 0} reps`;
    case 'max_reps': return `${pr.valueReps ?? 0} reps`;
    case 'duration': {
      const sec = pr.valueDurationSec ?? 0;
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return m > 0 ? `${m}m ${s}s` : `${s}s`;
    }
    case 'distance': return `${pr.valueDistanceM ?? 0} m`;
    default: return '';
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem`;
  return `Hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? 'es' : ''}`;
}

export function RecentPRCard({ onRegisterPR, onViewProgress }: RecentPRCardProps) {
  const { records } = useAllPersonalRecords();
  const { exercises } = useExercises();

  const latestPR = useMemo(() => {
    if (records.length === 0) return null;
    const sorted = [...records].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    const pr = sorted[0];
    const exercise = exercises.find(e => e.id === pr.exerciseId);
    return { ...pr, exerciseName: exercise?.name ?? 'Ejercicio' };
  }, [records, exercises]);

  if (!latestPR) {
    return (
      <div className="mx-4">
        <button
          onClick={onRegisterPR}
          className="w-full rounded-2xl border border-dashed border-border bg-card/50 p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
        >
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5 text-foreground" />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-foreground">Récords personales</p>
            <p className="text-xs text-muted-foreground">Registra tu primer PR y empieza a trackear tu progreso</p>
          </div>
          <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-4">
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <button
          onClick={onViewProgress}
          className="w-full p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
        >
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5 text-foreground" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-foreground truncate">🏆 {latestPR.exerciseName}</p>
              <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(latestPR.recordedAt)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPRValue(latestPR)}
              {latestPR.notes ? ` · ${latestPR.notes}` : ''}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>

        <div className="border-t border-border">
          <button
            onClick={onRegisterPR}
            className="w-full px-4 py-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-foreground active:bg-secondary/50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Registrar nuevo PR
          </button>
        </div>
      </div>
    </div>
  );
}