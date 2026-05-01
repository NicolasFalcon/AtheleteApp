export type PRType = 'max_weight' | 'weight_reps' | 'max_reps' | 'duration' | 'distance';

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  prType: PRType;
  valueWeight: number | null;
  valueReps: number | null;
  valueDurationSec: number | null;
  valueDistanceM: number | null;
  unit: string | null;
  notes: string | null;
  recordedAt: string;
  createdAt: string;
}

export interface PRInsert {
  exerciseId: string;
  prType: PRType;
  valueWeight?: number | null;
  valueReps?: number | null;
  valueDurationSec?: number | null;
  valueDistanceM?: number | null;
  unit?: string;
  notes?: string;
  recordedAt?: string;
}

export interface ExercisePRSummary {
  exerciseId: string;
  exerciseName: string;
  prType: PRType;
  bestValue: number;
  bestDate: string;
  totalEntries: number;
}

export const prTypeLabels: Record<PRType, string> = {
  max_weight: 'Peso máximo',
  weight_reps: 'Peso + repeticiones',
  max_reps: 'Repeticiones máximas',
  duration: 'Tiempo',
  distance: 'Distancia',
};

export const prTypeUnits: Record<PRType, string> = {
  max_weight: 'kg',
  weight_reps: 'kg',
  max_reps: 'reps',
  duration: 'seg',
  distance: 'm',
};

export function getPRMainValue(pr: PersonalRecord): number {
  switch (pr.prType) {
    case 'max_weight':
    case 'weight_reps':
      return pr.valueWeight ?? 0;
    case 'max_reps':
      return pr.valueReps ?? 0;
    case 'duration':
      return pr.valueDurationSec ?? 0;
    case 'distance':
      return pr.valueDistanceM ?? 0;
  }
}

export function formatPRValue(pr: PersonalRecord): string {
  switch (pr.prType) {
    case 'max_weight':
      return `${pr.valueWeight ?? 0} kg`;
    case 'weight_reps':
      return `${pr.valueWeight ?? 0} kg × ${pr.valueReps ?? 0} reps`;
    case 'max_reps':
      return `${pr.valueReps ?? 0} reps`;
    case 'duration': {
      const sec = pr.valueDurationSec ?? 0;
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return m > 0 ? `${m}m ${s}s` : `${s}s`;
    }
    case 'distance':
      return `${pr.valueDistanceM ?? 0} m`;
  }
}

export function getBestPR(records: PersonalRecord[], prType: PRType): PersonalRecord | null {
  const filtered = records.filter((record) => record.prType === prType);
  if (filtered.length === 0) return null;
  return filtered.reduce((best, record) =>
    getPRMainValue(record) > getPRMainValue(best) ? record : best,
  );
}
