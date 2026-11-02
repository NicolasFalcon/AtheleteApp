import type {
  ProposalChangeTag,
  ProposalExercise,
  ProposalStep,
  ProposalVariant,
  RoutineEdits,
  RoutineProposal,
} from '@app/services/ellie/ellieProposals';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { focusWord } from '@app/features/workouts/routineFocus';

// ELLIE · routine proposal (ELLIE_CARDS_FLOW §1.4–1.5, handoff 28.3): what the
// card and the detail sheet show, without UI.

// Ajustes rápidos under an open card: each one is sent as the user's message,
// adjusting that card. payload.quick_adjustments in its order (the first may
// come first because of the day's state), or these.
export const ROUTINE_QUICK_ADJUSTS = ['Más corta', 'Menos intensidad'] as const;

export function quickAdjustments(proposal: Pick<RoutineProposal, 'quickAdjustments'>): string[] {
  return proposal.quickAdjustments.length > 0 ? proposal.quickAdjustments : [...ROUTINE_QUICK_ADJUSTS];
}

// The text the Ajustar button leaves in the composer.
export const ROUTINE_ADJUST_PREFIX = 'Ajusta la rutina: ';

export const TAG_LABEL: Record<ProposalChangeTag, string> = {
  ajustado: 'Ajustado',
  añadido: 'Añadido',
  cambiado: 'Cambiado',
};

// NUEVA · AJUSTADA · <AJUSTE>. The version number is never shown.
export function proposalBadge(proposal: Pick<RoutineProposal, 'version' | 'adjustLabel' | 'mode'>): string {
  if (proposal.mode === 'nueva' && proposal.version === 1) {
    return 'NUEVA';
  }
  const label = proposal.adjustLabel?.trim().toUpperCase();
  return label ? `AJUSTADA · ${label}` : 'AJUSTADA';
}

export function proposalMeta(proposal: RoutineProposal): string {
  const count = proposal.main.length;
  return `${proposal.minutes} min · ${count} ${count === 1 ? 'ejercicio' : 'ejercicios'} · ${proposal.level}`;
}

const kgText = (kg: number) =>
  Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace('.', ',');

// "3 × 10 · 2 × 14 kg · 60 s" (also "1 × 20 kg", as the prototype);
// bodyweight: "3 × 12 · 45 s".
export function exerciseDetail(exercise: Pick<ProposalExercise, 'sets' | 'reps' | 'units' | 'kg' | 'restS'>): string {
  const parts = [`${exercise.sets} × ${exercise.reps}`];
  if (exercise.kg !== null && exercise.kg > 0) {
    parts.push(`${Math.max(1, exercise.units)} × ${kgText(exercise.kg)} kg`);
  }
  parts.push(`${exercise.restS} s`);
  return parts.join(' · ');
}

// Minutes of a warm-up / cool-down block from its steps' detail ("2 min").
export function blockMinutes(steps: ProposalStep[]): number | null {
  let total = 0;
  let found = false;
  steps.forEach(step => {
    const match = step.detail?.match(/(\d+(?:[.,]\d+)?)\s*min/i);
    if (match) {
      found = true;
      total += Number(match[1].replace(',', '.'));
    }
  });
  return found ? Math.round(total) : null;
}

export function blockTitle(label: string, steps: ProposalStep[]): string {
  const minutes = blockMinutes(steps);
  return minutes ? `${label} · ${minutes} min` : label;
}

// "Movilidad de cadera y hombro": the steps' names in one line.
export function stepsLine(steps: ProposalStep[]): string {
  return steps.map(step => step.name).join(' · ');
}

// The compact list of the card: the warm-up (one row) always first, then the
// main exercises; at most 6 rows, the rest as "+N más".
export const COMPACT_ROWS = 6;

export function compactExercises(proposal: RoutineProposal): {
  warmup: boolean;
  exercises: ProposalExercise[];
  more: number;
} {
  const warmup = proposal.warmup.length > 0;
  const room = COMPACT_ROWS - (warmup ? 1 : 0);
  return {
    warmup,
    exercises: proposal.main.slice(0, room),
    more: Math.max(0, proposal.main.length - room),
  };
}

// ── Sheet: the proposal with its edits ──────────────────────────────────────
export type SheetExercise = ProposalExercise & {
  // The exercise_id of the proposal this row comes from (the key of edits).
  originalId: string;
  // Chosen in the sheet (a variant).
  swapped: boolean;
};

// The main block as the sheet shows it: removed ones out, variants in place
// (same series and parameters, marked "Cambiado").
export function editedMain(proposal: RoutineProposal, edits: RoutineEdits): SheetExercise[] {
  return proposal.main
    .filter(exercise => !edits.remove.includes(exercise.exerciseId))
    .map(exercise => {
      const variant = edits.replace[exercise.exerciseId];
      if (!variant) {
        return { ...exercise, originalId: exercise.exerciseId, swapped: false };
      }
      return {
        ...exercise,
        exerciseId: variant.exerciseId,
        name: variant.name,
        image: variant.image ?? exercise.image,
        // The variant's video and cues are not in the proposal.
        video: null,
        tips: [],
        tag: 'cambiado' as const,
        variants: [],
        originalId: exercise.exerciseId,
        swapped: true,
      };
    });
}

// Live totals: removing an exercise takes 5 min off (minimum 10); the series
// are summed from the current list.
export function liveTotals(
  proposal: RoutineProposal,
  edits: RoutineEdits,
): { minutes: number; exercises: number; sets: number } {
  const main = editedMain(proposal, edits);
  const minutes =
    edits.remove.length > 0
      ? Math.max(10, proposal.totals.minutes - 5 * edits.remove.length)
      : proposal.totals.minutes;
  return {
    minutes,
    exercises: main.length,
    sets: main.reduce((sum, exercise) => sum + exercise.sets, 0),
  };
}

export type ProposalChanges = {
  title: string;
  added: string[];
  adjusted: string[];
  removed: string[];
};

// The Cambios block: Añadidos (with Cambiados) · Ajustados · Quitados (with
// the ones removed in the sheet). null when there is nothing to show.
export function proposalChanges(proposal: RoutineProposal, edits: RoutineEdits): ProposalChanges | null {
  const main = editedMain(proposal, edits);
  const added = main.filter(item => item.tag === 'añadido' || item.tag === 'cambiado').map(item => item.name);
  const adjusted = main.filter(item => item.tag === 'ajustado').map(item => item.name);
  const removed = [
    ...proposal.removed.map(item => item.name),
    ...proposal.main.filter(item => edits.remove.includes(item.exerciseId)).map(item => item.name),
  ];
  if (added.length + adjusted.length + removed.length === 0) {
    return null;
  }
  const title =
    proposal.version > 1
      ? 'CAMBIOS VS LA ANTERIOR'
      : proposal.sourceRoutineName
        ? `CAMBIOS VS TU ${proposal.sourceRoutineName.toUpperCase()}`
        : 'CAMBIOS';
  return { title, added, adjusted, removed };
}

// Up to 3 variants that are not already in the routine.
export function availableVariants(
  exercise: SheetExercise,
  current: SheetExercise[],
): ProposalVariant[] {
  const inRoutine = new Set(current.map(item => item.exerciseId));
  return exercise.variants.filter(variant => !inRoutine.has(variant.exerciseId)).slice(0, 3);
}

// "PROPUESTA DE ELLIE · EMPUJE · INTERMEDIO" (the focus of the cover, when
// target_groups gives one).
export function sheetEyebrow(proposal: RoutineProposal, language: EllieLanguage = 'es'): string {
  return ['PROPUESTA DE ELLIE', proposal.focus ? focusWord(proposal.focus, language) : null, proposal.level.toUpperCase()]
    .filter(Boolean)
    .join(' · ');
}
