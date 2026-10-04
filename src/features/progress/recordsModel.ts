import {
  getPRMainValue,
  prTypeLabels,
  type PersonalRecord,
  type PRInsert,
  type PRType,
} from '@app/shared';
import { MONTH_ABBR } from '@app/features/progress/progressModel';
import { getLocalDateKey } from '@app/lib/date';

// Récords (RECORDS_01 / RECORDS_02): grouping by exercise, formatting with the
// right unit per pr_type, history deltas and the "Registrar récord" draft.

export const PR_TYPES: PRType[] = [
  'weight_reps',
  'max_weight',
  'max_reps',
  'duration',
  'distance',
];

export function recordSource(record: PersonalRecord): 'session' | 'manual' {
  return record.sessionSetId || record.source === 'session'
    ? 'session'
    : 'manual';
}

// 1.240 · 32,5
export function formatNumber(value: number): string {
  const [int, decimal] = String(Math.round(value * 100) / 100).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal ? `${grouped},${decimal}` : grouped;
}

// 1:30 · 45 s
export function formatSeconds(seconds: number): {
  value: string;
  unit: string;
} {
  if (seconds < 60) {
    return { value: String(Math.round(seconds)), unit: 's' };
  }
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return { value: `${minutes}:${String(rest).padStart(2, '0')}`, unit: 'min' };
}

const repsWord = (n: number) => (n === 1 ? 'rep' : 'reps');

// Display value and unit of a record. `long` spells the reps ("kg × 2 reps").
export function formatRecord(
  record: Pick<
    PersonalRecord,
    | 'prType'
    | 'valueWeight'
    | 'valueReps'
    | 'valueDurationSec'
    | 'valueDistanceM'
  >,
  long = false,
): { value: string; unit: string } {
  switch (record.prType) {
    case 'weight_reps': {
      const reps = record.valueReps ?? 0;
      return {
        value: formatNumber(record.valueWeight ?? 0),
        unit: long ? `kg × ${reps} ${repsWord(reps)}` : `kg × ${reps}`,
      };
    }
    case 'max_reps': {
      const reps = record.valueReps ?? 0;
      return { value: formatNumber(reps), unit: repsWord(reps) };
    }
    case 'duration':
      return formatSeconds(record.valueDurationSec ?? 0);
    case 'distance':
      return { value: formatNumber(record.valueDistanceM ?? 0), unit: 'm' };
    default:
      return { value: formatNumber(record.valueWeight ?? 0), unit: 'kg' };
  }
}

// "10 ene"
export function shortDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTH_ABBR[date.getMonth()]}`;
}

// Difference over the previous mark: "+10 kg" · "Igual" · "−2 reps".
export function recordDelta(
  current: PersonalRecord,
  previous: PersonalRecord | null,
): { text: string; positive: boolean } {
  if (!previous) {
    return { text: 'Primera marca', positive: false };
  }
  let diff = getPRMainValue(current) - getPRMainValue(previous);
  let unitText: string;
  let format: (n: number) => string = formatNumber;

  switch (current.prType) {
    case 'max_reps':
      unitText = repsWord(Math.abs(diff));
      break;
    case 'duration':
      unitText = 's';
      break;
    case 'distance':
      unitText = 'm';
      break;
    default:
      unitText = 'kg';
  }
  // Same weight, more reps: the reps are the difference.
  if (current.prType === 'weight_reps' && diff === 0) {
    diff = (current.valueReps ?? 0) - (previous.valueReps ?? 0);
    unitText = repsWord(Math.abs(diff));
    format = n => String(n);
  }
  if (diff === 0) {
    return { text: 'Igual', positive: false };
  }
  const sign = diff > 0 ? '+' : '−';
  return {
    text: `${sign}${format(Math.abs(diff))} ${unitText}`,
    positive: diff > 0,
  };
}

// Best of a list of the same pr_type: highest main value; at the same weight
// more reps; then the newest.
export function bestRecord(records: PersonalRecord[]): PersonalRecord | null {
  if (records.length === 0) {
    return null;
  }
  return [...records].sort((a, b) => {
    const main = getPRMainValue(b) - getPRMainValue(a);
    if (main !== 0) {
      return main;
    }
    const reps = (b.valueReps ?? 0) - (a.valueReps ?? 0);
    return reps !== 0 ? reps : b.recordedAt.localeCompare(a.recordedAt);
  })[0];
}

export type RecordHistoryRow = {
  record: PersonalRecord;
  delta: { text: string; positive: boolean };
  isLatest: boolean;
  source: 'session' | 'manual';
};

export type ExerciseRecords = {
  exerciseId: string;
  exerciseName: string;
  // The pr_type of the most recent record: the one shown (one type per card).
  prType: PRType;
  best: PersonalRecord;
  history: RecordHistoryRow[]; // newest first
  isNew: boolean; // best registered today
};

const byDateDesc = (a: PersonalRecord, b: PersonalRecord) =>
  b.recordedAt.localeCompare(a.recordedAt);

export function historyRows(records: PersonalRecord[]): RecordHistoryRow[] {
  const sorted = [...records].sort(byDateDesc);
  return sorted.map((record, index) => ({
    record,
    delta: recordDelta(record, sorted[index + 1] ?? null),
    isLatest: index === 0,
    source: recordSource(record),
  }));
}

// One entry per exercise, the one with the newest record first.
export function groupRecords(
  records: PersonalRecord[],
  nameOf: (exerciseId: string) => string,
  today: Date,
): ExerciseRecords[] {
  const todayKey = getLocalDateKey(today);
  const byExercise = new Map<string, PersonalRecord[]>();
  records.forEach(record => {
    byExercise.set(record.exerciseId, [
      ...(byExercise.get(record.exerciseId) ?? []),
      record,
    ]);
  });

  const groups: ExerciseRecords[] = [];
  byExercise.forEach((list, exerciseId) => {
    const latest = [...list].sort(byDateDesc)[0];
    const sameType = list.filter(record => record.prType === latest.prType);
    const best = bestRecord(sameType) ?? latest;
    groups.push({
      exerciseId,
      exerciseName: nameOf(exerciseId),
      prType: latest.prType,
      best,
      history: historyRows(sameType),
      isNew: getLocalDateKey(new Date(best.recordedAt)) === todayKey,
    });
  });

  return groups.sort((a, b) =>
    b.history[0].record.recordedAt.localeCompare(
      a.history[0].record.recordedAt,
    ),
  );
}

// "+30 kg desde 10 ene": best over the first mark.
export function deltaSinceFirst(group: ExerciseRecords): string | null {
  const oldest = group.history[group.history.length - 1]?.record;
  if (!oldest || group.history.length < 2) {
    return null;
  }
  const delta = recordDelta(group.best, oldest);
  return delta.text === 'Igual'
    ? null
    : `${delta.text} desde ${shortDate(oldest.recordedAt)}`;
}

// Oldest → newest, at most the last `limit` marks (curve of the detail).
export function curvePoints(
  group: ExerciseRecords,
  limit = 6,
): { value: number; label: string; date: string }[] {
  return [...group.history]
    .reverse()
    .slice(-limit)
    .map(row => ({
      value: getPRMainValue(row.record),
      label: formatRecord(row.record).value,
      date: shortDate(row.record.recordedAt),
    }));
}

// ── "Registrar récord" sheet ────────────────────────────────────────────────
export type PrDraft = {
  prType: PRType;
  weight: number;
  reps: number;
  durationSec: number;
  distanceM: number;
};

export const PR_STEPS = {
  weight: 2.5,
  reps: 1,
  durationSec: 5,
  distanceM: 10,
};

// Starting values: just above the current best (205 over 200 kg).
export function defaultDraft(
  prType: PRType,
  best: PersonalRecord | null,
): PrDraft {
  const weight = best?.valueWeight != null ? best.valueWeight + 5 : 20;
  return {
    prType,
    weight,
    reps: best?.valueReps ?? (prType === 'max_reps' ? 10 : 1),
    durationSec: (best?.valueDurationSec ?? 55) + 5,
    distanceM: (best?.valueDistanceM ?? 90) + 10,
  };
}

export function draftMainValue(draft: PrDraft): number {
  switch (draft.prType) {
    case 'max_reps':
      return draft.reps;
    case 'duration':
      return draft.durationSec;
    case 'distance':
      return draft.distanceM;
    default:
      return draft.weight;
  }
}

export function isDraftValid(draft: PrDraft): boolean {
  return (
    draftMainValue(draft) > 0 &&
    (draft.prType !== 'weight_reps' || draft.reps > 0)
  );
}

// "Supera tu mejor marca por 5 kg" / "No supera tu mejor marca (200 kg)".
export function compareDraft(
  draft: PrDraft,
  best: PersonalRecord | null,
): { beats: boolean; text: string } | null {
  if (!best || best.prType !== draft.prType) {
    return null;
  }
  const diff = draftMainValue(draft) - getPRMainValue(best);
  const current = formatRecord(best);
  if (diff > 0) {
    const unit =
      draft.prType === 'max_reps'
        ? repsWord(diff)
        : draft.prType === 'duration'
        ? 's'
        : draft.prType === 'distance'
        ? 'm'
        : 'kg';
    return {
      beats: true,
      text: `Supera tu mejor marca por ${formatNumber(diff)} ${unit}`,
    };
  }
  if (diff === 0 && draft.prType === 'weight_reps') {
    const repsDiff = draft.reps - (best.valueReps ?? 0);
    if (repsDiff > 0) {
      return {
        beats: true,
        text: `Supera tu mejor marca por ${repsDiff} ${repsWord(repsDiff)}`,
      };
    }
  }
  return {
    beats: false,
    text: `No supera tu mejor marca (${current.value} ${current.unit})`,
  };
}

// Manual record (source 'manual' is set by the hook).
export function draftToInsert(
  exerciseId: string,
  draft: PrDraft,
  notes: string,
  recordedAt = new Date().toISOString(),
): PRInsert {
  const base: PRInsert = {
    exerciseId,
    prType: draft.prType,
    notes: notes.trim() || null,
    recordedAt,
  };
  switch (draft.prType) {
    case 'max_weight':
      return { ...base, valueWeight: draft.weight, unit: 'kg' };
    case 'weight_reps':
      return {
        ...base,
        valueWeight: draft.weight,
        valueReps: draft.reps,
        unit: 'kg',
      };
    case 'max_reps':
      return { ...base, valueReps: draft.reps, unit: 'reps' };
    case 'duration':
      return { ...base, valueDurationSec: draft.durationSec, unit: 's' };
    case 'distance':
      return { ...base, valueDistanceM: draft.distanceM, unit: 'm' };
  }
}

export { prTypeLabels };
