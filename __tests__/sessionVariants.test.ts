import { buildExerciseRows, buildVariantPatch } from '../src/features/session/sessionDbMapping';
import type { PlannedExercise } from '../src/features/session/sessionModel';
import {
  applyVariants,
  patternLabel,
  rpcReason,
  variantEyebrow,
  variantTag,
  variantToastText,
  type SessionVariant,
} from '../src/features/session/variantModel';
import { createRoutinesService } from '../src/services/routines/routinesService';

const exercise = (position: number, patch: Partial<PlannedExercise> = {}): PlannedExercise => ({
  position,
  templateExerciseId: `te${position}`,
  exerciseId: `ex${position}`,
  name: `Ejercicio ${position}`,
  sets: 3,
  unit: 'reps',
  perSide: false,
  amount: 12,
  amountMax: 12,
  restSec: 45,
  plannedWeightKg: 20,
  reps: 12,
  durationSec: null,
  distanceM: null,
  ...patch,
});

const variant: SessionVariant = {
  position: 0,
  exerciseId: 'barbell-squat',
  name: 'Sentadilla con barra',
  note: 'Barra sobre la espalda alta',
  originalExerciseId: 'ex0',
  originalName: 'Ejercicio 0',
  reason: 'no_dumbbells',
  scope: 'today',
};

describe('Variantes en Sesión', () => {
  it('swaps the exercise and keeps sets, reps, rest and weight', () => {
    const plan = [exercise(0), exercise(1)];
    const applied = applyVariants(plan, { 0: variant });
    expect(applied[0]).toMatchObject({
      exerciseId: 'barbell-squat',
      name: 'Sentadilla con barra',
      sets: 3,
      reps: 12,
      restSec: 45,
      plannedWeightKg: 20,
      templateExerciseId: 'te0',
      originalExerciseId: 'ex0',
      variantReason: 'no_dumbbells',
    });
    expect(applied[1]).toBe(plan[1]);
    expect(applyVariants(plan, {})).toBe(plan);
  });

  it('saves exercise_id = the variant with original_exercise_id and variant_reason', () => {
    const rows = buildExerciseRows('s1', applyVariants([exercise(0), exercise(1)], { 0: variant }), []);
    expect(rows[0]).toMatchObject({
      exercise_id: 'barbell-squat',
      original_exercise_id: 'ex0',
      variant_reason: 'no_dumbbells',
    });
    // A session without variants never sends the new columns.
    expect(rows[1]).not.toHaveProperty('original_exercise_id');
    expect(buildVariantPatch({ exerciseId: 'barbell-squat', name: 'X', originalExerciseId: 'ex0', reason: null })).toEqual({
      exercise_id: 'barbell-squat',
      name: 'X',
      original_exercise_id: 'ex0',
      variant_reason: 'other',
    });
    expect(buildVariantPatch({ exerciseId: 'ex0', name: 'Y', originalExerciseId: null, reason: 'discomfort' })).toMatchObject({
      original_exercise_id: null,
      variant_reason: null,
    });
  });

  it('labels: reason sent, eyebrow, tag and toasts', () => {
    expect(rpcReason('other')).toBeNull();
    expect(rpcReason('machine_busy')).toBe('machine_busy');
    expect(variantEyebrow('Cuádriceps', 'squat')).toBe('Cuádriceps · Sentadilla');
    expect(patternLabel('scap-retraction')).toBe('Scap retraction');
    expect(variantTag(variant)).toBe('VARIANTE · HOY');
    expect(variantTag({ ...variant, scope: 'routine' })).toBe('VARIANTE · EN TU RUTINA');
    expect(variantToastText({ kind: 'today' })).toBe('Cambiado solo para hoy');
    expect(variantToastText({ kind: 'routine', routineTitle: 'Total Body', copied: false })).toBe('Guardado en Total Body');
    expect(variantToastText({ kind: 'routine', routineTitle: 'Total Body', copied: true })).toBe(
      'Guardado en tu versión de Total Body',
    );
  });
});

describe('RPC de variantes', () => {
  it('list_exercise_variants: arguments and at most 3 options', async () => {
    const rpc = jest.fn(async () => ({
      ok: true,
      original: { id: 'ex0', name: 'Sentadilla goblet', primary_muscle: 'quadriceps', pattern: 'squat', equipment_group: 'dumbbell' },
      items: [1, 2, 3, 4].map(i => ({
        id: `v${i}`,
        name: `V${i}`,
        equipment: ['machine'],
        equipment_group: 'machine',
        note: 'En máquina',
        thumb_key: null,
        recommended: i === 1,
      })),
    }));
    const result = await createRoutinesService(rpc).listExerciseVariants({
      exerciseId: 'ex0',
      reason: 'machine_busy',
      excludeExerciseId: 'v9',
      locale: 'es',
    });
    expect(rpc).toHaveBeenCalledWith('list_exercise_variants', {
      _exercise_id: 'ex0',
      _reason: 'machine_busy',
      _exclude_exercise_id: 'v9',
      _locale: 'es',
    });
    expect(result.original).toMatchObject({ primaryMuscle: 'quadriceps', pattern: 'squat', equipmentGroup: 'dumbbell' });
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({ id: 'v1', recommended: true, equipmentGroup: 'machine' });
  });

  it('replace_routine_exercise: in place, or a copy for an official routine', async () => {
    const routine = { id: 'copy1', title: 'Total Body', origin: 'user', is_mine: true, exercises: [] };
    const rpc = jest.fn(async () => ({ ok: true, copied: true, source_routine_id: 'off1', routine }));
    const result = await createRoutinesService(rpc).replaceRoutineExercise({
      routineId: 'off1',
      templateExerciseId: 'te0',
      newExerciseId: 'v1',
    });
    expect(rpc).toHaveBeenCalledWith('replace_routine_exercise', {
      _routine_id: 'off1',
      _template_exercise_id: 'te0',
      _new_exercise_id: 'v1',
    });
    expect(result).toMatchObject({ copied: true, sourceRoutineId: 'off1', routine: { id: 'copy1', isMine: true } });
  });
});
