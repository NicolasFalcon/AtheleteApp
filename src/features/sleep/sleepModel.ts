import { getLocalDateKey } from '@app/lib/date';

// Sueño (handoff v2.15 §25.2, contract docs/backend/V2_15_SHAPES.md §1): the
// shapes of get_sleep_overview as the app reads them, the texts of the screen,
// the manual form and the grouping of Apple Health samples into nights.
// Pure: nothing here talks to HealthKit or Supabase.

export type SleepSource = 'apple_health' | 'manual';
export type WakeFeeling = 'exhausted' | 'tired' | 'normal' | 'rested' | 'energized';
export type SleepStage = 'awake' | 'rem' | 'core' | 'deep';

export type SleepStages = {
  awakeMin: number;
  remMin: number;
  coreMin: number;
  deepMin: number;
  segments: { stage: SleepStage; start: string; end: string }[];
};

export type SleepNight = {
  nightDate: string;
  source: SleepSource;
  bedtimeAt: string;
  wakeAt: string;
  durationMin: number;
  quality: number | null;
  wakeFeeling: WakeFeeling | null;
  stages: SleepStages | null;
  restingHr: number | null;
  hrvMs: number | null;
};

export type RecoveryLevel = 'low' | 'medium' | 'high';

export type SleepRecovery = {
  score: number;
  level: RecoveryLevel;
  headlineCode: 'ready' | 'moderate' | 'easy';
  estimate: boolean;
};

export type SleepOverview = {
  date: string;
  source: SleepSource | 'none';
  lastNight: SleepNight | null;
  wakeFeeling: WakeFeeling | null;
  recovery: SleepRecovery | null;
  nights7: { nightDate: string; durationMin: number; bedtimeAt: string; wakeAt: string; source: SleepSource }[];
  avg7Min: number | null;
  consistencyMin: number | null;
  deltaVsPrevWeekMin: number | null;
  yesterdayLoad: { level: RecoveryLevel; minutes: number; volumeKg: number } | null;
};

// ── Parsing ─────────────────────────────────────────────────────────────────
const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const str = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const WAKE_FEELINGS: { key: WakeFeeling; label: string }[] = [
  { key: 'exhausted', label: 'Agotado' },
  { key: 'tired', label: 'Cansado' },
  { key: 'normal', label: 'Normal' },
  { key: 'rested', label: 'Descansado' },
  { key: 'energized', label: 'Con energía' },
];
const FEELINGS = WAKE_FEELINGS.map(item => item.key);
const STAGES: readonly SleepStage[] = ['awake', 'rem', 'core', 'deep'];
const LEVELS: readonly RecoveryLevel[] = ['low', 'medium', 'high'];

const feelingOf = (value: unknown): WakeFeeling | null =>
  FEELINGS.find(item => item === value) ?? null;
const sourceOf = (value: unknown): SleepSource =>
  value === 'apple_health' ? 'apple_health' : 'manual';

function parseStages(raw: unknown): SleepStages | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  const segments = Array.isArray(row.segments) ? row.segments : [];
  return {
    awakeMin: num(row.awake_min) ?? 0,
    remMin: num(row.rem_min) ?? 0,
    coreMin: num(row.core_min) ?? 0,
    deepMin: num(row.deep_min) ?? 0,
    segments: segments
      .map(item => asRecord(item) ?? {})
      .map(item => ({
        stage: STAGES.find(stage => stage === item.stage) ?? 'core',
        start: str(item.start) ?? '',
        end: str(item.end) ?? '',
      }))
      .filter(item => item.start && item.end),
  };
}

export function parseSleepNight(raw: unknown): SleepNight | null {
  const row = asRecord(raw);
  const nightDate = str(row?.night_date);
  if (!row || !nightDate) {
    return null;
  }
  return {
    nightDate,
    source: sourceOf(row.source),
    bedtimeAt: str(row.bedtime_at) ?? '',
    wakeAt: str(row.wake_at) ?? '',
    durationMin: num(row.duration_min) ?? 0,
    quality: num(row.quality),
    wakeFeeling: feelingOf(row.wake_feeling),
    stages: parseStages(row.stages),
    restingHr: num(row.resting_hr),
    hrvMs: num(row.hrv_ms),
  };
}

export function parseSleepOverview(body: Record<string, unknown>): SleepOverview {
  const recovery = asRecord(body.recovery);
  const load = asRecord(body.yesterday_load);
  const nights = Array.isArray(body.nights_7) ? body.nights_7 : [];
  const score = num(recovery?.score);
  return {
    date: str(body.date) ?? getLocalDateKey(),
    source: body.source === 'apple_health' || body.source === 'manual' ? body.source : 'none',
    lastNight: parseSleepNight(body.last_night),
    wakeFeeling: feelingOf(body.wake_feeling),
    recovery:
      recovery && score !== null
        ? {
            score: Math.round(score),
            level: LEVELS.find(item => item === recovery.level) ?? 'medium',
            headlineCode:
              recovery.headline_code === 'ready' || recovery.headline_code === 'easy'
                ? recovery.headline_code
                : 'moderate',
            estimate: recovery.estimate !== false,
          }
        : null,
    nights7: nights
      .map(item => asRecord(item) ?? {})
      .filter(item => str(item.night_date))
      .map(item => ({
        nightDate: str(item.night_date) as string,
        durationMin: num(item.duration_min) ?? 0,
        bedtimeAt: str(item.bedtime_at) ?? '',
        wakeAt: str(item.wake_at) ?? '',
        source: sourceOf(item.source),
      })),
    avg7Min: num(body.avg_7_min),
    consistencyMin: num(body.consistency_min),
    deltaVsPrevWeekMin: num(body.delta_vs_prev_week_min),
    yesterdayLoad: load
      ? {
          level: LEVELS.find(item => item === load.level) ?? 'low',
          minutes: num(load.minutes) ?? 0,
          volumeKg: num(load.volume_kg) ?? 0,
        }
      : null,
  };
}

// ── Formats ─────────────────────────────────────────────────────────────────
const pad = (value: number) => String(value).padStart(2, '0');

// "23:48" in local time.
export function clock(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function splitMinutes(total: number): { h: number; m: number } {
  const rounded = Math.max(0, Math.round(total));
  return { h: Math.floor(rounded / 60), m: rounded % 60 };
}

// "7 h 42", or "7h 24m" (Inicio tile).
export function hoursLabel(total: number | null, compact = false): string {
  if (total === null) {
    return '—';
  }
  const { h, m } = splitMinutes(total);
  return compact ? `${h}h ${pad(m)}m` : `${h} h ${pad(m)}`;
}

export const QUALITY_WORDS = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];

export function qualityTitle(quality: number | null): string {
  if (!quality) {
    return 'Tu noche.';
  }
  return quality >= 4 ? 'Buena noche.' : quality === 3 ? 'Noche regular.' : 'Noche difícil.';
}

export function feelingLabel(feeling: WakeFeeling | null): string {
  return WAKE_FEELINGS.find(item => item.key === feeling)?.label ?? '—';
}

export function isTired(feeling: WakeFeeling | null): boolean {
  return feeling === 'exhausted' || feeling === 'tired';
}

export const RECOVERY_HEADLINES: Record<SleepRecovery['headlineCode'], string> = {
  ready: 'Listo para cargar.',
  moderate: 'Carga moderada.',
  easy: 'Hoy, suave.',
};

export function recoveryText(overview: SleepOverview): string {
  const night = overview.lastNight;
  const slept = night ? `Dormiste ${hoursLabel(night.durationMin)}.` : '';
  const advice =
    overview.recovery?.level === 'high'
      ? 'Hoy puedes entrenar a intensidad completa.'
      : overview.recovery?.level === 'low'
        ? 'Mejor una sesión suave o movilidad.'
        : 'Entrena, pero sin buscar marcas.';
  return [slept, advice].filter(Boolean).join(' ');
}

export const LOAD_WORDS: Record<RecoveryLevel, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };

// "Sin Apple Health no vemos tu noche" vs "Anoche · registrado por ti":
// a manual night counts as last night if it ended today or yesterday.
export function isRecent(nightDate: string, today: string): boolean {
  const yesterday = shiftDate(today, -1);
  return nightDate === today || nightDate === yesterday;
}

export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const value = new Date(Date.UTC(y, m - 1, d, 12));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

const LETTERS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

// The 7 days ending today, each with its night (or null).
export function weekSlots(overview: SleepOverview): {
  date: string;
  letter: string;
  night: SleepOverview['nights7'][number] | null;
}[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(overview.date, i - 6);
    const [y, m, d] = date.split('-').map(Number);
    return {
      date,
      letter: LETTERS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()],
      night: overview.nights7.find(night => night.nightDate === date) ?? null,
    };
  });
}

// A bedtime after midnight is a "late night" (Ember dot in Horario).
export function isLateBedtime(iso: string): boolean {
  const date = new Date(iso);
  return !Number.isNaN(date.getTime()) && date.getHours() < 12;
}

// Minutes after 22:00 of a local time (00:30 → 150), for the Horario chart.
export function minutesFrom22(iso: string): number {
  const date = new Date(iso);
  const minutes = date.getHours() * 60 + date.getMinutes();
  return (minutes - 22 * 60 + 1440) % 1440;
}

// ── Manual form ─────────────────────────────────────────────────────────────
export const DEFAULT_BED = 23 * 60 + 30;
export const DEFAULT_WAKE = 7 * 60 + 15;
export const FORM_STEP = 15;

export function stepTime(minutes: number, delta: number): number {
  return (((minutes + delta) % 1440) + 1440) % 1440;
}

export function timeLabel(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function inBedMinutes(bed: number, wake: number): number {
  return (((wake - bed) % 1440) + 1440) % 1440;
}

export function minutesOfDay(iso: string): number {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

// The timestamps of a night that ends on `nightDate`: the bedtime is the day
// before when it is later than the wake-up time (it crossed midnight).
export function manualTimestamps(
  nightDate: string,
  bed: number,
  wake: number,
): { bedtimeAt: string; wakeAt: string } {
  const [y, m, d] = nightDate.split('-').map(Number);
  const wakeAt = new Date(y, m - 1, d, Math.floor(wake / 60), wake % 60);
  const bedtime = new Date(y, m - 1, d, Math.floor(bed / 60), bed % 60);
  if (bed >= wake) {
    bedtime.setDate(bedtime.getDate() - 1);
  }
  return { bedtimeAt: bedtime.toISOString(), wakeAt: wakeAt.toISOString() };
}

// ── Apple Health → nights ───────────────────────────────────────────────────
// HKCategoryValueSleepAnalysis.
export const HK_SLEEP = { inBed: 0, asleep: 1, awake: 2, core: 3, deep: 4, rem: 5 } as const;

export type HealthSample = { value: number; start: Date; end: Date };
export type HealthQuantity = { value: number; start: Date; end: Date };

export type HealthNight = {
  night_date: string;
  bedtime_at: string;
  wake_at: string;
  duration_min: number;
  stages: {
    awake_min: number;
    rem_min: number;
    core_min: number;
    deep_min: number;
    segments: { stage: SleepStage; start: string; end: string }[];
  } | null;
  resting_hr: number | null;
  hrv_ms: number | null;
};

// A gap longer than this starts a new sleep (a nap is another session).
const SESSION_GAP_MS = 3 * 60 * 60 * 1000;
// Shorter sessions are naps and are not sent.
const MIN_NIGHT_MIN = 120;

const minutesOf = (ms: number) => Math.round(ms / 60000);

// Total time covered by a set of intervals (overlaps counted once).
function unionMs(intervals: { start: Date; end: Date }[]): number {
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  let total = 0;
  let curStart = -1;
  let curEnd = -1;
  sorted.forEach(({ start, end }) => {
    const s = start.getTime();
    const e = end.getTime();
    if (s > curEnd) {
      if (curEnd > curStart) {
        total += curEnd - curStart;
      }
      curStart = s;
      curEnd = e;
    } else {
      curEnd = Math.max(curEnd, e);
    }
  });
  if (curEnd > curStart) {
    total += curEnd - curStart;
  }
  return total;
}

const average = (values: number[]): number | null =>
  values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;

// Groups the sleep samples of HealthKit into one night per wake-up day (the
// longest session of that day), with stages when a watch recorded them.
// Stage samples win over plain "asleep" ones (an iPhone and a Watch may both
// write the same night); "in bed" only counts when there is nothing else.
export function buildHealthNights(
  samples: HealthSample[],
  restingHr: HealthQuantity[],
  hrv: HealthQuantity[],
): HealthNight[] {
  const sorted = samples
    .filter(sample => sample.end.getTime() > sample.start.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const sessions: HealthSample[][] = [];
  let lastEnd = 0;
  sorted.forEach(sample => {
    if (!sessions.length || sample.start.getTime() - lastEnd > SESSION_GAP_MS) {
      sessions.push([sample]);
    } else {
      sessions[sessions.length - 1].push(sample);
    }
    lastEnd = Math.max(lastEnd, sample.end.getTime());
  });

  const byDate = new Map<string, HealthNight>();
  sessions.forEach(session => {
    const staged = session.filter(
      sample => sample.value === HK_SLEEP.core || sample.value === HK_SLEEP.deep || sample.value === HK_SLEEP.rem,
    );
    const hasStages = staged.length > 0;
    const asleep = hasStages
      ? staged
      : session.filter(sample => sample.value === HK_SLEEP.asleep);
    const used = asleep.length
      ? hasStages
        ? session.filter(sample => sample.value !== HK_SLEEP.inBed && sample.value !== HK_SLEEP.asleep)
        : asleep
      : session.filter(sample => sample.value === HK_SLEEP.inBed);
    if (!used.length) {
      return;
    }
    const start = new Date(Math.min(...used.map(sample => sample.start.getTime())));
    const end = new Date(Math.max(...used.map(sample => sample.end.getTime())));
    const sleptMs = unionMs(asleep.length ? asleep : used);
    const duration = minutesOf(sleptMs);
    if (duration < MIN_NIGHT_MIN) {
      return;
    }
    const stageMin = (value: number) =>
      minutesOf(unionMs(used.filter(sample => sample.value === value)));
    const stageName = (value: number): SleepStage =>
      value === HK_SLEEP.rem ? 'rem' : value === HK_SLEEP.deep ? 'deep' : value === HK_SLEEP.awake ? 'awake' : 'core';

    const nightDate = getLocalDateKey(end);
    const nightHrv = hrv.filter(
      item => item.start.getTime() >= start.getTime() && item.start.getTime() <= end.getTime(),
    );
    const dayHr = restingHr.filter(item => getLocalDateKey(item.start) === nightDate);
    const night: HealthNight = {
      night_date: nightDate,
      bedtime_at: start.toISOString(),
      wake_at: end.toISOString(),
      duration_min: duration,
      stages: hasStages
        ? {
            awake_min: stageMin(HK_SLEEP.awake),
            rem_min: stageMin(HK_SLEEP.rem),
            core_min: stageMin(HK_SLEEP.core),
            deep_min: stageMin(HK_SLEEP.deep),
            segments: used
              .slice()
              .sort((a, b) => a.start.getTime() - b.start.getTime())
              .map(sample => ({
                stage: stageName(sample.value),
                start: sample.start.toISOString(),
                end: sample.end.toISOString(),
              })),
          }
        : null,
      resting_hr: average(dayHr.map(item => item.value)),
      hrv_ms: average(
        (nightHrv.length ? nightHrv : hrv.filter(item => getLocalDateKey(item.start) === nightDate)).map(
          item => item.value,
        ),
      ),
    };
    const existing = byDate.get(nightDate);
    if (!existing || existing.duration_min < night.duration_min) {
      byDate.set(nightDate, night);
    }
  });

  return [...byDate.values()]
    .sort((a, b) => b.night_date.localeCompare(a.night_date))
    .slice(0, 14);
}
