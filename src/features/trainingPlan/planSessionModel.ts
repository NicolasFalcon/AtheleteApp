import type { Workout } from '@app/shared';
import type {
  PlanSessionDetail,
  PlanSessionExercise,
  PlanOutcomeExercise,
} from '@app/services/supabase/trainingPlanSession';
import type { TrainingPlanT } from '@app/features/trainingPlan/trainingPlanCopy';

// Pure rules of the plan session (handoff v2.21 §31.7): what each exercise
// says about its scheme, its last time and its weight, and which banners show.

// "77,5": the figure of a weight, no unit.
export function kgValue(kg: number): string {
  return String(Math.round(kg * 10) / 10).replace('.', ',');
}

// "6–9" or "8" (a range that collapses to one number).
export function repsRange(exercise: Pick<PlanSessionExercise, 'repMin' | 'repMax'>): string | null {
  const { repMin, repMax } = exercise;
  if (repMin === null && repMax === null) {
    return null;
  }
  const low = repMin ?? repMax;
  const high = repMax ?? repMin;
  return low === high ? String(low) : `${low}–${high}`;
}

// "3 × 6–9 · RIR 2" (RIR left out when the plan does not give one).
export function schemeLine(exercise: PlanSessionExercise, t: TrainingPlanT): string {
  const reps = repsRange(exercise);
  const base = reps ? `${exercise.sets} × ${reps}` : `${exercise.sets}`;
  return exercise.rir !== null ? `${base} · ${t('session.rir', { n: exercise.rir })}` : base;
}

// "Última vez": "{sets} × {reps} con {kg} kg", without kg for bodyweight,
// or "Sin registros todavía" with no data.
export function lastTimeLine(exercise: Pick<PlanSessionExercise, 'lastTime'>, t: TrainingPlanT): string {
  const last = exercise.lastTime;
  if (!last) {
    return t('session.lastNone');
  }
  return last.kg !== null
    ? t('session.last', { sets: last.sets, reps: last.reps, kg: kgValue(last.kg) })
    : t('session.lastNoKg', { sets: last.sets, reps: last.reps });
}

export type WeightLine =
  | { kind: 'kg'; value: string; unit: 'kg' }
  | { kind: 'calibrate'; text: string }
  | { kind: 'bodyweight'; text: string };

// The weight on the right of the row: the recommended kg in big figures;
// "Calibrar · elige tu peso" when it has to be calibrated; "Peso corporal"
// without a weight (recommended_kg null and not calibrating).
export function weightLine(exercise: PlanSessionExercise, t: TrainingPlanT): WeightLine {
  if (exercise.calibrate) {
    return { kind: 'calibrate', text: t('session.weight.calibrate') };
  }
  if (exercise.recommendedKg === null) {
    return { kind: 'bodyweight', text: t('session.weight.body') };
  }
  return { kind: 'kg', value: kgValue(exercise.recommendedKg), unit: 'kg' };
}

export const warmupOf = (session: PlanSessionDetail) =>
  session.exercises.filter(exercise => exercise.block === 'warmup');

export const mainOf = (session: PlanSessionDetail) =>
  session.exercises.filter(exercise => exercise.block !== 'warmup');

// The banners: calibration (the flag or any exercise to calibrate) and deload.
export function sessionBanners(session: PlanSessionDetail): { calibration: boolean; deload: boolean } {
  return {
    calibration: session.banners.calibration || session.exercises.some(exercise => exercise.calibrate),
    deload: session.banners.deload,
  };
}

// A session already done, missed, skipped or substituted cannot start.
export const canStartPlanSession = (session: PlanSessionDetail) =>
  session.status === 'pending' || session.status === 'paused';

// "Próxima vez" of one exercise: the line and its tone.
export type OutcomeLine = { text: string; tone: 'up' | 'down' | 'same' };

export function outcomeLine(item: PlanOutcomeExercise, t: TrainingPlanT): OutcomeLine {
  switch (item.change) {
    case 'up':
      return item.nextKg !== null
        ? { text: t('outcome.up', { kg: kgValue(item.nextKg) }), tone: 'up' }
        : { text: t('outcome.same'), tone: 'same' };
    case 'down':
      return item.nextKg !== null
        ? { text: t('outcome.down', { kg: kgValue(item.nextKg) }), tone: 'down' }
        : { text: t('outcome.same'), tone: 'same' };
    case 'reps_up':
      return item.nextReps !== null
        ? { text: t('outcome.repsUp', { n: item.nextReps }), tone: 'up' }
        : { text: t('outcome.same'), tone: 'same' };
    case 'variant':
      return item.nextVariantName
        ? { text: t('outcome.variant', { name: item.nextVariantName }), tone: 'up' }
        : { text: t('outcome.same'), tone: 'same' };
    default:
      return { text: t('outcome.same'), tone: 'same' };
  }
}

// The routine of a started plan session with the plan's targets on its main
// exercises (matched by exercise id, in order): sets, rep range, rest, the
// recommended kg and the target for the runner (31.7). Warm-up and cool-down
// rows stay as the routine has them.
export function withPlanTargets(workout: Workout, session: PlanSessionDetail): Workout {
  const queues = new Map<string, PlanSessionExercise[]>();
  mainOf(session).forEach(exercise => {
    queues.set(exercise.exerciseId, [...(queues.get(exercise.exerciseId) ?? []), exercise]);
  });
  return {
    ...workout,
    exercises: workout.exercises.map(exercise => {
      const target =
        exercise.exerciseId && exercise.block !== 'warmup' && exercise.block !== 'cooldown'
          ? queues.get(exercise.exerciseId)?.shift()
          : undefined;
      if (!target) {
        return exercise;
      }
      return {
        ...exercise,
        sets: target.sets > 0 ? target.sets : exercise.sets,
        reps: target.repMin ?? exercise.reps,
        repsMax: target.repMax ?? undefined,
        restTime: target.restS ?? exercise.restTime,
        plannedWeightKg: target.recommendedKg ?? undefined,
        plan: {
          repMin: target.repMin,
          repMax: target.repMax,
          rir: target.rir,
          recommendedKg: target.recommendedKg,
          calibrate: target.calibrate,
          lastTime: target.lastTime,
        },
      };
    }),
  };
}
