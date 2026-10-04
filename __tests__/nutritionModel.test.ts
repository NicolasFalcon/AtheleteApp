import {
  adherenceScore,
  applyIncrements,
  buildDayTotals,
  ellieLine,
  formatLiters,
  gaugeDash,
  kcalLine,
  parseKcal,
  stepMacro,
  toGlasses,
  waterLine,
} from '@app/features/nutrition/nutritionModel';
import { buildDayRings } from '@app/features/home/homePriority';
import { buildHydrationWeek } from '@app/features/progress/progressModel';

const plan = {
  id: 'p',
  userId: 'u',
  targetCalories: 2850,
  targetProtein: 168,
  targetCarbs: 330,
  targetFats: 85,
};
const log = { calories: 1240, protein: 92, carbs: 140, fats: 38 };

describe('day totals', () => {
  it('computes kcal, macros and water against the plan', () => {
    const totals = buildDayTotals({ plan, log, waterMl: 1500, goalGlasses: 14 });
    expect(totals.hasPlan).toBe(true);
    expect(totals.kcal).toMatchObject({ consumed: 1240, target: 2850, left: 1610, done: false });
    expect(totals.macros.map(macro => macro.pct)).toEqual([55, 42, 45]);
    expect(totals.macros[0]).toMatchObject({ label: 'Proteína', value: 92, goal: 168 });
    expect(totals.water).toMatchObject({ glasses: 6, goalGlasses: 14, liters: 1.5, done: false });
    expect(kcalLine(totals)).toBe('Te quedan 1.610 kcal');
    expect(waterLine(totals)).toBe('1,5 L · 1 vaso = 250 ml');
  });

  it('without a plan shows what was eaten and no goal', () => {
    const totals = buildDayTotals({ plan: null, log, waterMl: 0 });
    expect(totals.kcal).toMatchObject({ consumed: 1240, target: null, progress: 0, done: false });
    expect(totals.macros.every(macro => macro.goal === null && macro.pct === 0)).toBe(true);
    expect(kcalLine(totals)).toMatch(/Sin plan activo/);
    expect(totals.water.goalGlasses).toBe(14);
  });

  it('caps at the goal and reports it done', () => {
    const totals = buildDayTotals({
      plan,
      log: { ...log, calories: 3000, protein: 200 },
      waterMl: 14 * 250,
      goalGlasses: 14,
    });
    expect(totals.kcal).toMatchObject({ progress: 1, left: 0, done: true });
    expect(totals.macros[0].pct).toBe(100);
    expect(kcalLine(totals)).toBe('Objetivo del día cumplido');
    expect(totals.water.done).toBe(true);
    expect(waterLine(totals)).toMatch(/objetivo cumplido/);
  });

  it('says what is missing for the ELLIE card', () => {
    expect(ellieLine(buildDayTotals({ plan, log, waterMl: 0 }))).toBe(
      'Te faltan 76 g de proteína. Una cena con huevos o pescado lo cierra.',
    );
    expect(
      ellieLine(buildDayTotals({ plan, log: { ...log, protein: 170 }, waterMl: 0 })),
    ).toMatch(/Te quedan 1\.610 kcal/);
  });

  it('rounds glasses like the rest of the app and formats liters', () => {
    expect(toGlasses(1500)).toBe(6);
    expect(toGlasses(-10)).toBe(0);
    expect(formatLiters(0.25)).toBe('0,25');
    expect(formatLiters(3.5)).toBe('3,5');
    expect(gaugeDash(0.5)).toBe(278);
    expect(gaugeDash(2)).toBe(556);
  });
});

describe('registrar nutrición', () => {
  it('adds the increments to what is already logged', () => {
    expect(applyIncrements(log, { kcal: 500, protein: 25, carbs: 0, fats: 5 })).toEqual({
      calories: 1740,
      protein: 117,
      carbs: 140,
      fats: 43,
    });
    expect(applyIncrements(null, { kcal: 250, protein: 0, carbs: 0, fats: 0 }).calories).toBe(250);
  });

  it('parses and steps the inputs', () => {
    expect(parseKcal('4a5,0')).toBe(450);
    expect(parseKcal('')).toBe(0);
    expect(parseKcal('99999')).toBe(5000);
    expect(stepMacro(0, -1)).toBe(0);
    expect(stepMacro(5, 1)).toBe(10);
  });

  it('scores the day against the plan like v1 (null without plan)', () => {
    expect(adherenceScore(null, { calories: 1, protein: 1, carbs: 1, fats: 1 })).toBeNull();
    expect(adherenceScore(plan, { calories: 2850, protein: 168, carbs: 330, fats: 85 })).toBe(100);
    expect(adherenceScore(plan, { calories: 0, protein: 0, carbs: 0, fats: 0 })).toBe(0);
  });
});

describe('the same numbers on every screen', () => {
  it('Inicio rings and Progreso water agree with Nutrición', () => {
    const totals = buildDayTotals({ plan, log, waterMl: 1750, goalGlasses: 14 });
    const { rings } = buildDayRings({
      mode: 'workout',
      challenge: null as never,
      workout: { minutesToday: 0, completedToday: false, targetMinutes: 30 },
      nutrition: { hasPlan: true, calories: log.calories, targetCalories: plan.targetCalories },
      hydration: { todayMl: 1750, goalGlasses: 14 },
    });
    const nutrition = rings.find(ring => ring.kind === 'nutrition')!;
    const hydration = rings.find(ring => ring.kind === 'hydration')!;
    expect(nutrition.progress).toBeCloseTo(totals.kcal.progress);
    expect(nutrition.value).toBe('1.240');
    expect(hydration.value).toBe(String(totals.water.glasses));
    expect(hydration.progress).toBeCloseTo(totals.water.progress);
    const week = buildHydrationWeek(
      [{ date: '2026-10-04', waterMl: 14 * 250 }],
      14,
      ['2026-10-04'],
      '2026-10-04',
    );
    expect(week.dots[0]).toBe('met');
    expect(buildDayTotals({ plan, log, waterMl: 14 * 250, goalGlasses: 14 }).water.done).toBe(true);
  });
});
