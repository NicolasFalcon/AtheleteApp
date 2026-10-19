import { ellieErrorLine, failureEffect, isRetryable } from '../src/features/ellie/ellieCopy';
import { lastLine } from '../src/features/ellie/chatModel';
import { parseInline, parseMarkdown, plainMarkdown } from '../src/features/ellie/markdown';
import { buildDayRings } from '../src/features/home/homePriority';
import {
  draftFromAnalysis,
  draftFromMeal,
  draftTotals,
  itemValues,
  perUnitLine,
  stepItem,
  toSaveInput,
  unitLabel,
  unitLine,
} from '../src/features/nutrition/mealDraft';
import { buildDayTotals, waterGoalGlasses, waterGoalMl } from '../src/features/nutrition/nutritionModel';
import { buildHydrationWeek } from '../src/features/progress/progressModel';
import { resultFromScan } from '../src/features/vision/machineScanModel';
import { createPhotoRequestSession } from '../src/features/vision/photoRequest';
import { visionFailureCopy, visionFailureFrom } from '../src/features/vision/visionCopy';
import {
  AI_REQUEST_TIMEOUT_MS,
  EllieError,
  parseEllieError,
  transportError,
  type EllieInvoke,
} from '../src/services/ellie/ellieService';
import { itemPayload, parseMeal, savePayload } from '../src/services/nutrition/mealsService';
import {
  VISION_DUPLICATE_WAITS_MS,
  analyzeMeal,
  parseMachineScan,
  parseMealAnalysis,
  scanMachine,
} from '../src/services/vision/visionService';

const NOW = new Date('2026-10-17T13:00:00');

const eggs = {
  name: 'huevos fritos', unit_count: 2, unit_label: 'huevo',
  grams_per_unit: 50, kcal_per_unit: 70, protein_per_unit: 6, carbs_per_unit: 0.4, fats_per_unit: 5,
  grams: 100, kcal: 140, protein: 12, carbs: 0.8, fats: 10, kcal_adjusted: false,
};
const rice = {
  name: 'arroz', unit_count: null, unit_label: null, grams_per_unit: null, kcal_per_unit: null,
  protein_per_unit: null, carbs_per_unit: null, fats_per_unit: null,
  grams: 150, kcal: 195, protein: 4, carbs: 42, fats: 0, kcal_adjusted: true,
};
const analysis = () =>
  parseMealAnalysis({ title: 'Huevos con arroz', meal_type_suggestion: 'lunch', items: [eggs, rice], confidence: 0.9, image_path: 'u/meals/a.jpg' })!;

describe('B-14/16 · times and retries', () => {
  it('the app waits longer than the server (~25 s)', () => {
    expect(AI_REQUEST_TIMEOUT_MS).toBeGreaterThan(25_000);
  });

  it('504 ai_timeout → "Está tardando más de lo normal" + Reintentar, never "sin conexión"', () => {
    const error = parseEllieError(504, { ok: false, error: 'ai_timeout' });
    expect(error.code).toBe('ai_timeout');
    expect(parseEllieError(504, null).code).toBe('ai_timeout');
    const meal = visionFailureCopy({ code: 'ai_timeout' }, 'meal', 'es');
    expect(meal.title).toBe('Está tardando más de lo normal');
    expect(meal.actions[0]).toBe('retry');
    expect(`${meal.title} ${meal.text}`).not.toMatch(/conexi[oó]n|red\b/i);
    expect(visionFailureCopy({ code: 'ai_timeout' }, 'machine', 'en').title).toBe('This is taking longer than usual');
    expect(ellieErrorLine({ code: 'ai_timeout' }, 'es')).toMatch('tardando más de lo normal');
    expect(failureEffect('ai_timeout')).toBe('retry');
    expect(isRetryable('ai_timeout')).toBe(true);
  });

  it('the app\'s own wait running out is ai_timeout; only a network failure is offline', () => {
    const abort = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    expect(transportError({ name: 'FunctionsFetchError', message: 'x', context: abort }, false).code).toBe('ai_timeout');
    expect(transportError(new Error('x'), true).code).toBe('ai_timeout');
    expect(transportError(new TypeError('Network request failed'), false).code).toBe('offline');
    expect(visionFailureFrom(new TypeError('Network request failed')).code).toBe('offline');
    expect(visionFailureFrom(new Error('storage: bucket not found')).code).toBe('internal');
    expect(visionFailureFrom(new EllieError('ai_timeout')).code).toBe('ai_timeout');
    expect(visionFailureFrom(Object.assign(new Error('big'), { name: 'ImageTooLargeError' })).code).toBe('image_too_large');
  });

  it('meal: one client_request_id per photo, the same on every retry', async () => {
    const session = createPhotoRequestSession(
      (() => {
        let n = 0;
        return () => `id-${(n += 1)}`;
      })(),
    );
    const sent: unknown[] = [];
    const invoke: EllieInvoke = async body => {
      sent.push(body.client_request_id);
      return sent.length === 1
        ? { status: 504, body: { ok: false, error: 'ai_timeout' } }
        : { status: 200, body: { ok: true, draft: { title: 'x', items: [eggs] } } };
    };
    await expect(
      analyzeMeal({ imagePath: 'p', clientRequestId: session.idFor('file://a.jpg') }, { invoke }),
    ).rejects.toMatchObject({ code: 'ai_timeout' });
    await analyzeMeal({ imagePath: 'p', clientRequestId: session.idFor('file://a.jpg') }, { invoke });
    expect(sent).toEqual(['id-1', 'id-1']);
    expect(session.idFor('file://b.jpg')).toBe('id-2');
    session.reset();
    expect(session.idFor('file://b.jpg')).toBe('id-3');
  });

  it('409 duplicate_in_progress: silent retries with the same body, at most 3, longer each time', async () => {
    const waits: number[] = [];
    const bodies: unknown[] = [];
    let calls = 0;
    const invoke: EllieInvoke = async body => {
      calls += 1;
      bodies.push(body);
      return calls <= 3
        ? { status: 409, body: { ok: false, error: 'duplicate_in_progress' } }
        : { status: 200, body: { ok: true, draft: { title: 'x', items: [eggs] } } };
    };
    const sleep = async (ms: number) => {
      waits.push(ms);
    };
    await analyzeMeal({ imagePath: 'p', clientRequestId: 'same' }, { invoke, sleep });
    expect(waits).toEqual([...VISION_DUPLICATE_WAITS_MS]);
    expect(waits[0]).toBeLessThan(waits[1]);
    expect(new Set(bodies.map(body => JSON.stringify(body))).size).toBe(1);

    calls = -10;
    const always: EllieInvoke = async () => ({ status: 409, body: { ok: false, error: 'duplicate_in_progress' } });
    const spy = jest.fn(always);
    await expect(scanMachine({ imagePath: 'p', clientRequestId: 'c' }, { invoke: spy, sleep })).rejects.toMatchObject({
      code: 'duplicate_in_progress',
    });
    expect(spy).toHaveBeenCalledTimes(4);
  });
});

describe('B-15 · machine scan', () => {
  const body = {
    ok: true, scan_id: 'scan-1', match: 'confident',
    machine_type: { id: 'mt-1', slug: 'leg-press', name: 'Prensa de piernas' },
    equipment: { id: 'eq-1', slug: 'machine', name: 'Máquina' },
    confidence: 1,
    candidates: [{ equipment_id: 'eq-1', slug: 'machine', name: 'Máquina', confidence: 1, machine_type_id: 'mt-1', machine_type_slug: 'leg-press', machine_type_name: 'Prensa de piernas' }],
    exercise_ids: ['c', 'a', 'b'],
    exercises: [
      { id: 'c', slug: 'leg-press', name: 'Prensa de Piernas en Máquina' },
      { id: 'a', slug: 'calf', name: 'Gemelos en prensa' },
      { id: 'b', slug: 'single', name: 'Prensa a una pierna' },
    ],
    usage: { kind: 'machine', used: 1, limit: 10, remaining: 9 },
  };

  it('the concrete machine is the title and its 3–6 exercises keep the order received', () => {
    const scan = parseMachineScan(body);
    expect(scan.machineType).toEqual({ id: 'mt-1', slug: 'leg-press', name: 'Prensa de piernas' });
    expect(scan.candidates[0]).toMatchObject({ machineTypeId: 'mt-1', machineTypeName: 'Prensa de piernas' });
    const result = resultFromScan(scan);
    expect(result).toMatchObject({ kind: 'found', name: 'Prensa de piernas' });
    expect(result.kind === 'found' && result.exercises.map(item => item.id)).toEqual(['c', 'a', 'b']);
  });

  it('without machine_type (ambiguous / older answers) nothing changes', () => {
    const ambiguous = parseMachineScan({ ...body, match: 'ambiguous', machine_type: null, equipment: null });
    expect(ambiguous.machineType).toBeNull();
    expect(resultFromScan(ambiguous).kind).toBe('choose');
    expect(resultFromScan(parseMachineScan({ ...body, machine_type: undefined }))).toMatchObject({ name: 'Máquina' });
  });
});

describe('B-17 · meal draft by units', () => {
  it('reads the per-unit fields; a food by grams has none', () => {
    const [egg, grain] = analysis().items;
    expect(egg.unit).toEqual({ count: 2, label: 'huevo', gramsPer: 50, kcalPer: 70, proteinPer: 6, carbsPer: 0.4, fatsPer: 5 });
    expect(grain.unit).toBeNull();
    expect(grain.kcalAdjusted).toBe(true);
  });

  it('"2 huevos · 100 g · total" and "por unidad: 50 g · 70 kcal · P 6 g"', () => {
    const draft = draftFromAnalysis(analysis(), NOW);
    const egg = itemValues(draft.items[0]);
    expect(unitLine(egg, 'es')).toBe('2 huevos · 100 g · total');
    expect(perUnitLine(egg.unit!, 'es')).toBe('por unidad: 50 g · 70 kcal · P 6 g');
    expect(unitLine(itemValues(draft.items[1]), 'es')).toBe('150 g');
    expect(unitLabel('pan', 3, 'es')).toBe('panes');
    expect(unitLabel('slice', 2, 'en')).toBe('slices');
    expect(unitLabel('huevo', 1, 'es')).toBe('huevo');
  });

  it('− / + by units for a countable food (never below 1), by grams otherwise; values at once', () => {
    let draft = draftFromAnalysis(analysis(), NOW);
    const [egg, grain] = draft.items;
    draft = stepItem(stepItem(draft, egg.id, 1), egg.id, 1);
    expect(itemValues(draft.items[0])).toMatchObject({ grams: 200, kcal: 280, protein: 24, fats: 20, unit: { count: 4 } });
    draft = stepItem(stepItem(stepItem(stepItem(draft, egg.id, -1), egg.id, -1), egg.id, -1), egg.id, -1);
    expect(draft.items[0].unit?.count).toBe(1);
    draft = stepItem(draft, grain.id, 1);
    expect(itemValues(draft.items[1])).toMatchObject({ grams: 175, kcal: Math.round((195 * 175) / 150), unit: null });
    expect(draftTotals(draft).kcal).toBe(70 + Math.round((195 * 175) / 150));
  });

  it('save_meal / update_meal send the per-unit fields (and never kcal_adjusted)', () => {
    let draft = draftFromAnalysis(analysis(), NOW);
    draft = stepItem(draft, draft.items[0].id, 1);
    const payload = savePayload(toSaveInput(draft, { source: 'photo' }));
    expect(payload.items?.[0]).toEqual({
      name: 'huevos fritos', grams: 150, kcal: 210, protein: 18, carbs: 1, fats: 15,
      unit_count: 3, unit_label: 'huevo', grams_per_unit: 50, kcal_per_unit: 70,
      protein_per_unit: 6, carbs_per_unit: 0.4, fats_per_unit: 5,
    });
    expect(payload.items?.[1]).toEqual({ name: 'arroz', grams: 150, kcal: 195, protein: 4, carbs: 42, fats: 0 });
    expect(JSON.stringify(payload)).not.toContain('kcal_adjusted');
    expect(itemPayload({ name: 'x', grams: 1, kcal: 1, protein: 0, carbs: 0, fats: 0, unit: null })).not.toHaveProperty('unit_count');
  });

  it('a saved meal opens again by units', () => {
    const meal = parseMeal({ id: 'm1', meal_type: 'lunch', title: 't', items: [{ ...eggs, unit_count: 3, grams: 150, kcal: 210 }], kcal: 210 })!;
    const draft = draftFromMeal(meal);
    expect(draft.items[0].unit?.count).toBe(3);
    expect(itemValues(stepItem(draft, draft.items[0].id, 1).items[0]).kcal).toBe(280);
  });
});

describe('B-24 · markdown of ELLIE', () => {
  const answer = [
    '### Tu semana',
    'Hoy llevas **1.250 kcal** y *vas bien*.',
    '',
    '- Proteína: **95 g**',
    '* Agua: 6 vasos',
    '1. Desayuno',
    '2. Cena',
    'Ojo con el **cierre',
    '¿Seguimos mañana?',
  ].join('\n');

  it('bold, italics and short lists as blocks; no mark ever left', () => {
    const blocks = parseMarkdown(answer);
    expect(blocks.map(block => block.kind)).toEqual(['heading', 'paragraph', 'bullets', 'numbered', 'paragraph']);
    expect(blocks[1]).toEqual({
      kind: 'paragraph',
      spans: [
        { text: 'Hoy llevas ' },
        { text: '1.250 kcal', bold: true },
        { text: ' y ' },
        { text: 'vas bien', italic: true },
        { text: '.' },
      ],
    });
    expect(blocks[2].kind === 'bullets' && blocks[2].items).toHaveLength(2);
    const text = JSON.stringify(blocks);
    expect(text).not.toMatch(/\*|###/);
    expect(plainMarkdown(answer)).toContain('Ojo con el cierre');
  });

  it('keeps plain arithmetic and inline code readable', () => {
    expect(parseInline('3 * 4 = 12 y `kcal`')).toEqual([{ text: '3 * 4 = 12 y kcal' }]);
    expect(parseInline('***clave***')).toEqual([{ text: 'clave', bold: true, italic: true }]);
  });

  it('the last line of ELLIE (Inicio de ELLIE) has no marks either', () => {
    expect(lastLine([{ content: '**Bien hecho.** Hoy *cerraste* el día.', createdAt: NOW.toISOString() }], NOW)?.text).toBe(
      'Bien hecho. Hoy cerraste el día.',
    );
  });
});

describe('B-25 · water goal from profiles.daily_water_goal only', () => {
  it('no fixed or calculated goal: without it there is none', () => {
    expect(waterGoalGlasses(8)).toBe(8);
    expect(waterGoalGlasses(null)).toBeNull();
    expect(waterGoalGlasses(0)).toBeNull();
    expect(waterGoalMl(8)).toBe(2000);
    expect(waterGoalMl(null)).toBe(0);
  });

  it('day totals, rings and the week follow the profile goal', () => {
    const withGoal = buildDayTotals({ plan: null, log: null, waterMl: 1000, goalGlasses: 8 });
    expect(withGoal.water).toMatchObject({ glasses: 4, goalGlasses: 8, progress: 0.5, done: false });
    const none = buildDayTotals({ plan: null, log: null, waterMl: 1000, goalGlasses: null });
    expect(none.water).toMatchObject({ glasses: 4, goalGlasses: null, progress: 0, done: false });

    const rings = (goalGlasses: number | null) =>
      buildDayRings({
        mode: 'workout',
        challenge: null,
        workout: { minutesToday: 0, completedToday: false, targetMinutes: 30 },
        nutrition: { hasPlan: false, calories: 0, targetCalories: 0 },
        hydration: { todayMl: 2000, goalGlasses },
      }).rings.find(ring => ring.kind === 'hydration')!;
    expect(rings(8)).toMatchObject({ unit: 'de 8 vasos', done: true, progress: 1 });
    expect(rings(null)).toMatchObject({ unit: 'vasos', done: false, progress: 0 });

    const week = buildHydrationWeek([{ date: '2026-10-16', waterMl: 3000 }], null, ['2026-10-16', '2026-10-17'], '2026-10-17');
    expect(week).toEqual({ dots: ['missed', 'today'], daysMet: 0, goalGlasses: null });
    expect(buildHydrationWeek([{ date: '2026-10-16', waterMl: 3000 }], 10, ['2026-10-16'], '2026-10-17').daysMet).toBe(1);
  });
});
