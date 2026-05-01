import { Trophy, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonalRecord, formatPRValue, getBestPR, prTypeLabels, PRType } from '@/hooks/usePersonalRecords';
import { cn } from '@/lib/utils';

interface PRSummaryCardProps {
  records: PersonalRecord[];
  onRegisterPR: () => void;
  onViewHistory: () => void;
}

export function PRSummaryCard({ records, onRegisterPR, onViewHistory }: PRSummaryCardProps) {
  const types = [...new Set(records.map(r => r.prType))] as PRType[];
  const bests = types.map(t => getBestPR(records, t)).filter(Boolean) as PersonalRecord[];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4 text-foreground" />
          Tu mejor marca
        </h2>
        {records.length > 0 && (
          <button onClick={onViewHistory} className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-0.5 transition-colors">
            Ver progreso <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {bests.length === 0 ? (
        <div className="text-center py-3">
          <p className="text-sm text-muted-foreground mb-3">Aún no tienes récords para este ejercicio</p>
          <Button onClick={onRegisterPR} variant="outline" className="rounded-full text-sm">
            <Trophy className="h-4 w-4 mr-2" />
            Registrar PR
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {bests.map(pr => (
            <div key={pr.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
              <div>
                <p className="text-xs text-muted-foreground">{prTypeLabels[pr.prType]}</p>
                <p className="text-sm font-semibold text-foreground tabular-nums">{formatPRValue(pr)}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(pr.recordedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          ))}
          <Button onClick={onRegisterPR} variant="outline" size="sm" className="w-full rounded-full text-xs mt-1">
            <Trophy className="h-3.5 w-3.5 mr-1.5" />
            Nuevo PR
          </Button>
        </div>
      )}
    </div>
  );
}