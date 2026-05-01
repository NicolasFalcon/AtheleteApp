import { useMemo } from 'react';
import { Trophy, ChevronRight } from 'lucide-react';
import { PersonalRecord, PRType, prTypeLabels, formatPRValue, getBestPR } from '@/hooks/usePersonalRecords';

interface ExerciseInfo {
  id: string;
  name: string;
}

interface PersonalRecordsCardProps {
  records: PersonalRecord[];
  exercises: ExerciseInfo[];
  onSelectExercise: (exerciseId: string) => void;
}

export function PersonalRecordsCard({ records, exercises, onSelectExercise }: PersonalRecordsCardProps) {
  const exerciseSummaries = useMemo(() => {
    const byExercise = new Map<string, PersonalRecord[]>();
    records.forEach(r => {
      const arr = byExercise.get(r.exerciseId) || [];
      arr.push(r);
      byExercise.set(r.exerciseId, arr);
    });

    return Array.from(byExercise.entries()).map(([exId, recs]) => {
      const ex = exercises.find(e => e.id === exId);
      const types = [...new Set(recs.map(r => r.prType))] as PRType[];
      const best = types.map(t => getBestPR(recs, t)).filter(Boolean) as PersonalRecord[];
      const topBest = best.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
      return {
        exerciseId: exId,
        exerciseName: ex?.name ?? 'Ejercicio',
        totalEntries: recs.length,
        latestBest: topBest,
        types,
      };
    }).sort((a, b) => new Date(b.latestBest?.recordedAt ?? 0).getTime() - new Date(a.latestBest?.recordedAt ?? 0).getTime());
  }, [records, exercises]);

  if (exerciseSummaries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-5 w-5 text-foreground" />
        <h3 className="font-semibold text-foreground">Récords personales</h3>
      </div>
      <div className="space-y-0">
        {exerciseSummaries.slice(0, 5).map((summary, i, arr) => (
          <button
            key={summary.exerciseId}
            onClick={() => onSelectExercise(summary.exerciseId)}
            className={`flex w-full items-center justify-between py-3 text-left hover:bg-secondary/30 rounded-lg transition-colors ${i < arr.length - 1 ? 'border-b border-border/30' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{summary.exerciseName}</p>
              {summary.latestBest && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {prTypeLabels[summary.latestBest.prType]}: <span className="text-foreground font-medium tabular-nums">{formatPRValue(summary.latestBest)}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <span className="text-xs text-muted-foreground">{summary.totalEntries} PR{summary.totalEntries !== 1 ? 's' : ''}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}