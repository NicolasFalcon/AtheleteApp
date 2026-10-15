import {
  createScanSession,
  exercisesFromIds,
  percent,
  resultFromScan,
} from '../src/features/vision/machineScanModel';
import type { MachineScan } from '../src/services/vision/visionService';

const base: MachineScan = {
  scanId: 's1', replayed: false, match: 'confident', confidence: 0.9,
  equipment: { id: 'e1', slug: 'barbell', name: 'Barra' },
  candidates: [{ equipmentId: 'e1', slug: 'barbell', name: 'Barra', confidence: 0.9 }],
  exerciseIds: ['x1'], exercises: [{ id: 'x1', slug: 'squat', name: 'Sentadilla' }], usage: null,
};

describe('machine scan result', () => {
  it('confident: the equipment and its exercises', () => {
    expect(resultFromScan(base)).toEqual({
      kind: 'found', scanId: 's1', name: 'Barra', confidence: 0.9, exercises: base.exercises,
    });
  });

  it('ambiguous: at most 3 candidates to choose from, no exercises yet', () => {
    const candidates = [1, 2, 3, 4].map(n => ({ equipmentId: `e${n}`, slug: `s${n}`, name: `M${n}`, confidence: 0.4 }));
    const result = resultFromScan({ ...base, match: 'ambiguous', equipment: null, exerciseIds: [], exercises: [], candidates });
    expect(result.kind).toBe('choose');
    expect(result.kind === 'choose' && result.candidates).toHaveLength(3);
  });

  it('names the exercises of a chosen candidate from the library, skipping unknown ids', () => {
    const library = [{ id: 'x1', slug: 'squat', name: 'Sentadilla' }, { id: 'x2', slug: 'row', name: 'Remo' }];
    expect(exercisesFromIds(['x2', 'zz', 'x1'], library)).toEqual([
      { id: 'x2', slug: 'row', name: 'Remo' },
      { id: 'x1', slug: 'squat', name: 'Sentadilla' },
    ]);
  });

  it('percent stays between 0 and 100', () => {
    expect([percent(0.904), percent(2), percent(-1)]).toEqual([90, 100, 0]);
  });
});

describe('scan idempotency: one client_request_id per photo', () => {
  it('the same photo keeps its id on every retry; another photo gets a new one', () => {
    let n = 0;
    const session = createScanSession(() => `id-${(n += 1)}`);
    expect(session.idFor('file:///a.jpg')).toBe('id-1');
    expect(session.idFor('file:///a.jpg')).toBe('id-1');
    expect(session.idFor('file:///b.jpg')).toBe('id-2');
    session.reset();
    expect(session.idFor('file:///b.jpg')).toBe('id-3');
  });
});
