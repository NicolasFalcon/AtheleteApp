import { EllieError, type EllieInvoke } from '../src/services/ellie/ellieService';
import {
  analyzeMeal,
  parseMachineScan,
  parseMealAnalysis,
  parseVisionError,
  scanMachine,
  VisionError,
} from '../src/services/vision/visionService';
import { lowQuotaNotice, remainingAnalyses, visionFailureCopy } from '../src/features/vision/visionCopy';

const mealBody = {
  ok: true,
  draft: {
    title: 'Pollo con arroz',
    meal_type_suggestion: 'lunch',
    items: [
      { name: 'Pollo', grams: 150, kcal: 248, protein: 46, carbs: 0, fats: 6 },
      { name: 'Arroz', grams: 100, kcal: 130, protein: 3, carbs: 28, fats: 0 },
    ],
    totals: { kcal: 378, protein: 49, carbs: 28, fats: 6 },
    confidence: 0.9,
    warnings: ['Puede variar'],
    image_path: 'u/meals/a.jpg',
  },
  usage: { kind: 'meal', used: 1, limit: 10, remaining: 9 },
};
const scanBody = (extra: object = {}) => ({
  ok: true,
  scan_id: 'scan-1',
  match: 'confident',
  equipment: { id: 'eq-1', slug: 'barbell', name: 'Barra' },
  confidence: 0.9,
  candidates: [{ equipment_id: 'eq-1', slug: 'barbell', name: 'Barra', confidence: 0.9 }],
  exercise_ids: ['ex-1'],
  exercises: [{ id: 'ex-1', slug: 'squat', name: 'Sentadilla' }],
  usage: { kind: 'machine', used: 1, limit: 10, remaining: 9 },
  ...extra,
});

describe('ellie-vision · meal', () => {
  it('sends mode meal with the photo path and the note, and returns the editable draft', async () => {
    const invoke = jest.fn<ReturnType<EllieInvoke>, Parameters<EllieInvoke>>(async () => ({ status: 200, body: mealBody }));
    const { draft, usage } = await analyzeMeal(
      { imagePath: 'u/meals/a.jpg', clientRequestId: 'req-1', hint: 'es medio plato' },
      { invoke },
    );
    expect(invoke).toHaveBeenCalledWith({
      mode: 'meal',
      image_path: 'u/meals/a.jpg',
      client_request_id: 'req-1',
      hint: 'es medio plato',
    });
    expect(draft).toMatchObject({ title: 'Pollo con arroz', mealTypeSuggestion: 'lunch', confidence: 0.9 });
    expect(draft.items).toHaveLength(2);
    expect(draft.totals).toEqual({ kcal: 378, protein: 49, carbs: 28, fats: 6 });
    expect(usage).toEqual({ kind: 'meal', used: 1, limit: 10, remaining: 9 });
  });

  it('keeps the totals as the sum of the items when the server omits them', () => {
    const parsed = parseMealAnalysis({ title: 't', items: mealBody.draft.items, image_path: 'p' });
    expect(parsed?.totals).toEqual({ kcal: 378, protein: 49, carbs: 28, fats: 6 });
  });
});

describe('ellie-vision · machine', () => {
  it('the same client_request_id on every try of the same photo (idempotent scan)', async () => {
    const ids: unknown[] = [];
    let n = 0;
    const invoke: EllieInvoke = async body => {
      ids.push(body.client_request_id);
      n += 1;
      return n === 1 ? { status: 502, body: { ok: false, error: 'ai_unavailable' } } : { status: 200, body: scanBody({ replayed: true }) };
    };
    const input = { imagePath: 'u/machines/a.jpg', clientRequestId: 'req-1' };
    await expect(scanMachine(input, { invoke })).rejects.toMatchObject({ code: 'ai_unavailable' });
    const scan = await scanMachine(input, { invoke });
    expect(ids).toEqual(['req-1', 'req-1']);
    expect(scan.replayed).toBe(true);
    expect(scan.exercises[0]).toEqual({ id: 'ex-1', slug: 'squat', name: 'Sentadilla' });
  });

  it('reads confident and ambiguous scans', () => {
    const confident = parseMachineScan(scanBody());
    expect(confident).toMatchObject({ match: 'confident', equipment: { id: 'eq-1' }, exerciseIds: ['ex-1'] });
    const ambiguous = parseMachineScan(
      scanBody({
        match: 'ambiguous',
        equipment: null,
        exercise_ids: [],
        exercises: [],
        confidence: 0.4,
        candidates: [
          { equipment_id: 'a', slug: 'a', name: 'A', confidence: 0.4 },
          { equipment_id: 'b', slug: 'b', name: 'B', confidence: 0.3 },
        ],
      }),
    );
    expect(ambiguous).toMatchObject({ match: 'ambiguous', equipment: null, exerciseIds: [] });
    expect(ambiguous.candidates.map(candidate => candidate.equipmentId)).toEqual(['a', 'b']);
  });
});

describe('vision error mapping', () => {
  it.each([
    [422, 'not_food'],
    [422, 'low_confidence'],
    [429, 'daily_image_limit'],
    [429, 'daily_machine_limit'],
    [429, 'vision_attempts_limit'],
    [429, 'rate_limited'],
    [402, 'ai_credits_exhausted'],
    [403, 'ai_forbidden'],
    [502, 'ai_unavailable'],
    [500, 'internal'],
    [401, 'unauthorized'],
    [400, 'invalid_input'],
    [403, 'image_forbidden'],
    [404, 'image_not_found'],
    [413, 'image_too_large'],
    [415, 'image_type'],
  ])('%s %s', (status, code) => {
    expect(parseVisionError(status, { ok: false, error: code }).code).toBe(code);
  });

  it('keeps used / limit and the usage that comes with not_food (the quota is given back)', () => {
    const error = parseVisionError(422, {
      ok: false,
      error: 'not_food',
      usage: { kind: 'meal', used: 3, limit: 10, remaining: 7 },
    });
    expect(error).toBeInstanceOf(VisionError);
    expect(error.usage).toEqual({ kind: 'meal', used: 3, limit: 10, remaining: 7 });
    const limit = parseVisionError(429, { ok: false, error: 'daily_image_limit', used: 10, limit: 10 });
    expect(limit).toMatchObject({ used: 10, limit: 10 });
  });

  it('an unreachable server is "offline"', async () => {
    const invoke: EllieInvoke = async () => {
      throw new TypeError('Network request failed');
    };
    await expect(analyzeMeal({ imagePath: 'p', clientRequestId: 'r' }, { invoke })).rejects.toMatchObject({ code: 'offline' });
    await expect(analyzeMeal({ imagePath: 'p', clientRequestId: 'r' }, { invoke })).rejects.toBeInstanceOf(EllieError);
  });
});

describe('what the person reads (es / en)', () => {
  const codes = [
    'not_food', 'low_confidence', 'daily_image_limit', 'daily_machine_limit', 'vision_attempts_limit',
    'rate_limited', 'ai_unavailable', 'ai_forbidden', 'ai_credits_exhausted', 'unauthorized',
    'invalid_input', 'image_type', 'offline', 'internal', 'unknown',
  ] as const;

  it('every failure has a title, a text and at least one action in both languages and contexts', () => {
    for (const code of codes) {
      for (const language of ['es', 'en'] as const) {
        for (const context of ['meal', 'machine'] as const) {
          const copy = visionFailureCopy({ code, limit: 10 }, context, language);
          expect(copy.title.length).toBeGreaterThan(5);
          expect(copy.text.length).toBeGreaterThan(10);
          expect(copy.actions[0]).toBeTruthy();
          expect(`${copy.title} ${copy.text}`).not.toMatch(/credit|gemini|lovable|402|403|429|502/i);
        }
      }
    }
  });

  it('every meal failure but the session one offers Kcal rápidas or another way out', () => {
    for (const code of codes.filter(item => item !== 'unauthorized')) {
      const copy = visionFailureCopy({ code }, 'meal', 'es');
      const all = copy.actions.filter(Boolean);
      expect(all.some(action => action === 'quick_kcal' || action === 'other_photo' || action === 'retry')).toBe(true);
    }
    expect(visionFailureCopy({ code: 'not_food' }, 'meal', 'es').actions).toEqual(['other_photo', 'quick_kcal']);
    expect(visionFailureCopy({ code: 'offline' }, 'meal', 'es').actions).toEqual(['quick_kcal', 'retry']);
  });

  it('the daily limit names the limit', () => {
    expect(visionFailureCopy({ code: 'daily_image_limit', limit: 10 }, 'meal', 'es').title).toBe('Has usado los 10 análisis de hoy');
    expect(visionFailureCopy({ code: 'daily_image_limit', limit: 10 }, 'meal', 'en').title).toContain('10');
  });

  it('the notice of the quota only shows with 3 or fewer left', () => {
    expect(remainingAnalyses(7, 10)).toBe(3);
    expect(remainingAnalyses(6, 10)).toBeNull();
    expect(remainingAnalyses(10, 10)).toBe(0);
    expect(lowQuotaNotice(2, 'es')).toBe('Quedan 2 análisis con foto hoy');
    expect(lowQuotaNotice(2, 'es', true)).toBe('Quedan 2 análisis hoy');
  });
});
