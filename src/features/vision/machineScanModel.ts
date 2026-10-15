import type { MachineCandidate, MachineExercise, MachineScan } from '@app/services/vision/visionService';

// What the machine scan screen shows once the server answered (design §10):
// a confident match shows the equipment and its exercises; an ambiguous one
// asks which of up to 3 candidates it is, and only then shows the exercises.
export type MachineResult =
  | { kind: 'found'; scanId: string; name: string; confidence: number; exercises: MachineExercise[] }
  | { kind: 'choose'; scanId: string; candidates: MachineCandidate[] };

export function resultFromScan(scan: MachineScan): MachineResult {
  if (scan.match === 'confident' && scan.equipment) {
    return {
      kind: 'found',
      scanId: scan.scanId,
      name: scan.equipment.name,
      confidence: scan.confidence,
      exercises: scan.exercises,
    };
  }
  return { kind: 'choose', scanId: scan.scanId, candidates: scan.candidates.slice(0, 3) };
}

// After choosing a candidate the server returns only the exercise ids: the
// names come from the exercise library the app already has.
export function exercisesFromIds(ids: readonly string[], library: readonly { id: string; slug: string; name: string }[]) {
  const byId = new Map(library.map(item => [item.id, item]));
  return ids.flatMap(id => {
    const found = byId.get(id);
    return found ? [{ id: found.id, slug: found.slug, name: found.name }] : [];
  });
}

export const percent = (confidence: number): number => Math.round(Math.max(0, Math.min(1, confidence)) * 100);

// One id per photo, kept across retries of that photo: the server answers the
// same scan (replayed) and charges nothing again.
export function createScanSession(makeId: () => string) {
  let current: { uri: string; clientRequestId: string } | null = null;
  return {
    idFor(uri: string): string {
      if (!current || current.uri !== uri) {
        current = { uri, clientRequestId: makeId() };
      }
      return current.clientRequestId;
    },
    reset() {
      current = null;
    },
  };
}

export const MACHINE_QUESTION = { es: '¿Cómo uso esta máquina?', en: 'How do I use this machine?' } as const;
