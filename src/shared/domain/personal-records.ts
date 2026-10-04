export type PRType =
  | 'max_weight'
  | 'weight_reps'
  | 'max_reps'
  | 'duration'
  | 'distance';

export type PersonalRecord = {
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
  // personal_records.source: 'manual' (registered by hand) or 'session'
  // (detected in a session, linked by session_set_id).
  source: 'manual' | 'session';
  workoutSessionId: string | null;
  sessionSetId: string | null;
};

export type PRInsert = {
  exerciseId: string;
  prType: PRType;
  valueWeight?: number | null;
  valueReps?: number | null;
  valueDurationSec?: number | null;
  valueDistanceM?: number | null;
  unit?: string | null;
  notes?: string | null;
  recordedAt?: string;
};

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
      const seconds = pr.valueDurationSec ?? 0;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
    }
    case 'distance':
      return `${pr.valueDistanceM ?? 0} m`;
  }
}

export function getBestPR(
  records: PersonalRecord[],
  prType: PRType,
): PersonalRecord | null {
  const matching = records.filter(record => record.prType === prType);

  if (matching.length === 0) {
    return null;
  }

  return [...matching].sort((left, right) => {
    const delta = getPRMainValue(right) - getPRMainValue(left);
    if (delta !== 0) {
      return delta;
    }

    return right.recordedAt.localeCompare(left.recordedAt);
  })[0];
}
