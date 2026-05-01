import { useState, useMemo } from 'react';
import { ArrowLeft, Trophy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonalRecord, PRType, prTypeLabels, formatPRValue, getPRMainValue, getBestPR, prTypeUnits } from '@/hooks/usePersonalRecords';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface PRHistoryScreenProps {
  exerciseName: string;
  records: PersonalRecord[];
  onBack: () => void;
  onDelete: (id: string) => Promise<boolean>;
  onRegisterPR: () => void;
}

export function PRHistoryScreen({ exerciseName, records, onBack, onDelete, onRegisterPR }: PRHistoryScreenProps) {
  const types = useMemo(() => [...new Set(records.map(r => r.prType))] as PRType[], [records]);
  const [activeType, setActiveType] = useState<PRType>(types[0] || 'max_weight');

  const filteredRecords = useMemo(
    () => records.filter(r => r.prType === activeType).sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()),
    [records, activeType]
  );

  const best = getBestPR(records, activeType);

  const chartData = filteredRecords.map(r => ({
    date: new Date(r.recordedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    value: getPRMainValue(r),
    secondary: r.prType === 'weight_reps' ? r.valueReps : undefined,
  }));

  return (
    <div className="animate-fade-in page-safe-bottom">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/30 bg-background/95 px-4 pb-3 pt-3 backdrop-blur-sm safe-area-pt">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-card/80 border border-border/60">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Récords personales</h1>
            <p className="text-sm text-muted-foreground">{exerciseName}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Type selector */}
        {types.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {types.map(t => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  activeType === t ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                )}
              >
                {prTypeLabels[t]}
              </button>
            ))}
          </div>
        )}

        {/* Best PR */}
        {best && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">Mejor marca</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatPRValue(best)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(best.recordedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}

        {/* Chart */}
        {chartData.length >= 2 && (
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Progreso</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={40} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value} ${prTypeUnits[activeType]}`, prTypeLabels[activeType]]}
                  />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* History list */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Historial ({filteredRecords.length})</h3>
          {filteredRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin registros de este tipo</p>
          ) : (
            <div className="space-y-0">
              {[...filteredRecords].reverse().map((pr, i, arr) => (
                <div key={pr.id} className={cn("flex items-center justify-between py-3", i < arr.length - 1 && "border-b border-border/30")}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground tabular-nums">{formatPRValue(pr)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(pr.recordedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {pr.notes && ` · ${pr.notes}`}
                    </p>
                  </div>
                  <button onClick={() => onDelete(pr.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button onClick={onRegisterPR} className="w-full rounded-full h-12">
          <Trophy className="h-4 w-4 mr-2" />
          Registrar nuevo PR
        </Button>
      </div>
    </div>
  );
}
