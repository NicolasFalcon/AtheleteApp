// exercises.recommended_sets_reps (JSON by goal, e.g. {"hypertrophy":"3x12-15"})
// has free-text values: "2x15 each direction", "2x30 sec each side", "2x20m",
// "3x max", "3x12 each", "3x40m", or {"sets":3,"reps":"12"}. This pure parser
// reads them and never throws: what it cannot read is returned as raw text.

export type SetsRepsUnit = 'reps' | 'sec' | 'm' | 'max';

export type ParsedSetsReps =
  | {
      parsed: true;
      sets: number;
      // reps, seconds or metres; both null for 'max'. A range has min < max.
      min: number | null;
      max: number | null;
      unit: SetsRepsUnit;
      // "each side / leg / arm / direction": the same work on each side.
      perSide: boolean;
      raw: string;
    }
  | { parsed: false; raw: string };

const UNREAD = (raw: string): ParsedSetsReps => ({ parsed: false, raw });

const PER_SIDE =
  /\b(?:each|per|every)\s*(?:side|leg|arm|hand|foot|direction|way|knee|shoulder)?\b/;
const MAX = /^(?:max|amrap|to failure|failure)$/;
const VALUE =
  /^(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?))?\s*([a-z]*)$/;

function toNumber(value: string): number {
  return Number(value.replace(',', '.'));
}

function unitOf(
  suffix: string,
): { unit: SetsRepsUnit; factor: number } | null {
  switch (suffix) {
    case '':
    case 'rep':
    case 'reps':
      return { unit: 'reps', factor: 1 };
    case 's':
    case 'sec':
    case 'secs':
    case 'second':
    case 'seconds':
      return { unit: 'sec', factor: 1 };
    case 'min':
    case 'mins':
    case 'minute':
    case 'minutes':
      return { unit: 'sec', factor: 60 };
    case 'm':
    case 'meter':
    case 'meters':
    case 'metre':
    case 'metres':
      return { unit: 'm', factor: 1 };
    case 'km':
      return { unit: 'm', factor: 1000 };
    default:
      return null;
  }
}

function parseText(raw: string): ParsedSetsReps {
  const text = raw.toLowerCase().replace(/×/g, 'x').replace(/\s+/g, ' ').trim();
  const split = text.match(/^(\d+)\s*x\s*(.+)$/);
  if (!split) {
    return UNREAD(raw);
  }
  const sets = Number(split[1]);
  let rest = split[2].trim();

  const perSide = PER_SIDE.test(rest);
  rest = rest.replace(PER_SIDE, '').replace(/\s+/g, ' ').trim();

  if (MAX.test(rest)) {
    return {
      parsed: true,
      sets,
      min: null,
      max: null,
      unit: 'max',
      perSide,
      raw,
    };
  }

  const value = rest.match(VALUE);
  const unit = value ? unitOf(value[3]) : null;
  if (!value || !unit) {
    return UNREAD(raw);
  }
  const low = toNumber(value[1]) * unit.factor;
  const high = value[2] ? toNumber(value[2]) * unit.factor : low;
  return {
    parsed: true,
    sets,
    min: Math.min(low, high),
    max: Math.max(low, high),
    unit: unit.unit,
    perSide,
    raw,
  };
}

// Accepts a text, {sets, reps} (numbers or text) or anything else (unread).
export function parseSetsReps(input: unknown): ParsedSetsReps {
  try {
    if (typeof input === 'string') {
      return parseText(input);
    }
    if (input && typeof input === 'object' && !Array.isArray(input)) {
      const { sets, reps } = input as { sets?: unknown; reps?: unknown };
      if (
        (typeof sets === 'number' || typeof sets === 'string') &&
        (typeof reps === 'number' || typeof reps === 'string')
      ) {
        return parseText(`${String(sets).trim()}x${String(reps).trim()}`);
      }
      return UNREAD(JSON.stringify(input));
    }
    return UNREAD(input === null || input === undefined ? '' : String(input));
  } catch {
    return UNREAD(String(input));
  }
}

export type SetsRepsGoal = 'strength' | 'hypertrophy' | 'endurance';

// Picks the scheme of a goal from the stored JSON. Also reads the shapes
// without goal keys ({"sets":3,"reps":"10"}) and a bare text.
export function recommendationFor(
  json: unknown,
  goal: SetsRepsGoal,
): ParsedSetsReps {
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const record = json as Record<string, unknown>;
    if ('sets' in record || 'reps' in record) {
      return parseSetsReps(record);
    }
    const order: SetsRepsGoal[] = [
      goal,
      ...(['hypertrophy', 'strength', 'endurance'] as SetsRepsGoal[]).filter(
        item => item !== goal,
      ),
    ];
    for (const key of order) {
      if (record[key] !== undefined && record[key] !== null) {
        return parseSetsReps(record[key]);
      }
    }
    return UNREAD('');
  }
  return parseSetsReps(json);
}

const dash = (min: number, max: number) =>
  min === max ? String(min) : `${min}–${max}`;

// "3 × 12–15" · "3 × 30 s · por lado" · "3 × máx" · "3 × 40 m". Unread values
// come back as their original text.
export function formatSetsReps(value: ParsedSetsReps): string {
  if (!value.parsed) {
    return value.raw;
  }
  let amount: string;
  switch (value.unit) {
    case 'max':
      amount = 'máx';
      break;
    case 'sec':
      amount = `${dash(value.min ?? 0, value.max ?? 0)} s`;
      break;
    case 'm':
      amount = `${dash(value.min ?? 0, value.max ?? 0)} m`;
      break;
    default:
      amount = dash(value.min ?? 0, value.max ?? 0);
  }
  return `${value.sets} × ${amount}${value.perSide ? ' · por lado' : ''}`;
}
