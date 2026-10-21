import type { PlannedExercise } from '@app/features/session/sessionModel';
import type { EquipmentGroup, VariantReason } from '@app/services/routines/routinesService';

// Variants in Sesión activa (handoff v2.15 §25.6, V2_15_SHAPES.md §3): an
// exercise swapped for another one with the same primary muscle and pattern.
// Sets, reps, rest and the sets already done do not change.

export type SessionVariantReason = VariantReason | 'other';

export type SessionVariant = {
  position: number;
  exerciseId: string;
  name: string;
  note: string | null;
  originalExerciseId: string;
  originalName: string;
  reason: SessionVariantReason;
  // 'routine' once it was also saved in the routine.
  scope: 'today' | 'routine';
};

export type SessionVariants = Record<number, SessionVariant>;

// "¿Qué pasa?" (25.6) plus "Otro" (variant_reason 'other', no filter).
export const VARIANT_REASONS: { key: SessionVariantReason; label: string }[] = [
  { key: 'machine_busy', label: 'Máquina ocupada' },
  { key: 'no_dumbbells', label: 'Sin mancuernas' },
  { key: 'discomfort', label: 'Molestia' },
  { key: 'other', label: 'Otro' },
];

// The reason the RPC filters or orders by ('other' asks without one).
export function rpcReason(reason: SessionVariantReason | null): VariantReason | null {
  return reason && reason !== 'other' ? reason : null;
}

const EQUIPMENT: Record<EquipmentGroup, string> = {
  barbell: 'Barra',
  machine: 'Máquina',
  cable: 'Cable',
  bodyweight: 'Peso corporal',
  dumbbell: 'Mancuernas',
};

export function equipmentLabel(group: EquipmentGroup): string {
  return EQUIPMENT[group];
}

// movement_patterns slugs; an unknown one is shown with its own words.
const PATTERNS: Record<string, string> = {
  squat: 'Sentadilla',
  hinge: 'Bisagra de cadera',
  lunge: 'Zancada',
  push: 'Empuje',
  pull: 'Tracción',
  'horizontal-push': 'Empuje horizontal',
  'vertical-push': 'Empuje vertical',
  'horizontal-pull': 'Tracción horizontal',
  'vertical-pull': 'Tracción vertical',
  carry: 'Acarreo',
  rotation: 'Rotación',
  'anti-rotation': 'Antirrotación',
  'anti-extension': 'Antiextensión',
  core: 'Core',
  isolation: 'Aislamiento',
  gait: 'Marcha',
  jump: 'Salto',
  plyometric: 'Pliometría',
  mobility: 'Movilidad',
};

export function patternLabel(slug: string | null): string | null {
  if (!slug) {
    return null;
  }
  const known = PATTERNS[slug];
  if (known) {
    return known;
  }
  const words = slug.replace(/[-_]/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// "CUÁDRICEPS · SENTADILLA"
export function variantEyebrow(muscle: string | null, pattern: string | null): string {
  return [muscle, patternLabel(pattern)].filter(Boolean).join(' · ');
}

// The plan with the variants applied: another exercise id and name in the
// same position; sets, reps and rest stay.
export function applyVariants(
  plan: PlannedExercise[],
  variants: SessionVariants,
): PlannedExercise[] {
  if (Object.keys(variants).length === 0) {
    return plan;
  }
  return plan.map(exercise => {
    const variant = variants[exercise.position];
    return variant
      ? {
          ...exercise,
          exerciseId: variant.exerciseId,
          name: variant.name,
          originalExerciseId: variant.originalExerciseId,
          variantReason: variant.reason,
        }
      : exercise;
  });
}

export function variantTag(variant: SessionVariant | null | undefined): string | null {
  if (!variant) {
    return null;
  }
  return variant.scope === 'routine' ? 'VARIANTE · EN TU RUTINA' : 'VARIANTE · HOY';
}

export type VariantToast =
  | { kind: 'today' }
  | { kind: 'routine'; routineTitle: string; copied: boolean }
  | { kind: 'reverted' };

export function variantToastText(toast: VariantToast): string {
  switch (toast.kind) {
    case 'today':
      return 'Cambiado solo para hoy';
    case 'reverted':
      return 'Volviste al ejercicio original';
    case 'routine':
      return toast.copied
        ? `Guardado en tu versión de ${toast.routineTitle}`
        : `Guardado en ${toast.routineTitle}`;
  }
}
