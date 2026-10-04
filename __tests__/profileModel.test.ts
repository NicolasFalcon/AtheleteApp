import {
  buildTimeline,
  draftFromProfile,
  formatBirthDate,
  formatHeight,
  formatThousands,
  formatWeight,
  goalLabel,
  goalOptions,
  heroLine,
  isDirty,
  isValid,
  memberSince,
  stepDays,
  stepMinutes,
  stepWeight,
  toPatch,
  trainingLine,
  validateDraft,
} from '@app/features/profile/profileModel';
import type { ProfileRecord } from '@app/types/auth';

const profile = {
  name: 'Nicolas',
  goal: 'gain_muscle',
  birthDate: '1989-08-30',
  weight: 76,
  height: 170,
  trainingDaysPerWeek: 6,
  trainingLevel: 'intermedio',
  preferredSessionMinutes: 45,
} as ProfileRecord;

describe('profile labels and units', () => {
  it('reuses the onboarding labels and keeps improve_health', () => {
    expect(goalLabel('gain_muscle')).toBe('Ganar músculo');
    expect(goalLabel('improve_health')).toBe('Mejorar salud');
    expect(goalOptions('maintain')).toHaveLength(4);
    expect(goalOptions('improve_health')).toHaveLength(5);
  });

  it('formats lines, units and dates', () => {
    expect(heroLine('gain_muscle', 6)).toBe('Ganar músculo · 6 días por semana');
    expect(trainingLine(6, 45)).toBe('6 días/sem · 45 min');
    expect(trainingLine(null, null)).toBe('Sin configurar');
    expect(formatWeight(76.5)).toBe('76,5 kg');
    expect(formatWeight(76)).toBe('76 kg');
    expect(formatHeight(170.4)).toBe('170 cm');
    expect(formatThousands(4860)).toBe('4.860');
    expect(formatBirthDate('1989-08-30')).toBe('30 ago 1989');
    expect(formatBirthDate(null)).toBe('Sin fecha');
    expect(memberSince('2026-01-12T10:00:00Z')).toBe('Atleta desde enero 2026');
    expect(memberSince(null)).toBeNull();
  });
});

describe('editing', () => {
  const saved = draftFromProfile(profile);

  it('starts clean and detects changes', () => {
    expect(isDirty(saved, saved)).toBe(false);
    expect(isDirty({ ...saved, name: '  Nicolas ' }, saved)).toBe(false);
    expect(isDirty({ ...saved, days: 5 }, saved)).toBe(true);
  });

  it('writes only what changed', () => {
    expect(toPatch({ ...saved, days: 5, minutes: 60, level: 'avanzado' }, saved)).toEqual({
      trainingDaysPerWeek: 5,
      preferredSessionMinutes: 60,
      trainingLevel: 'avanzado',
    });
    expect(toPatch(saved, saved)).toEqual({});
  });

  it('respects the CHECK constraints of profiles', () => {
    expect(isValid(validateDraft(saved))).toBe(true);
    expect(validateDraft({ ...saved, minutes: 4 }).minutes).toBeDefined();
    expect(validateDraft({ ...saved, minutes: 241 }).minutes).toBeDefined();
    expect(validateDraft({ ...saved, minutes: 5 }).minutes).toBeUndefined();
    expect(validateDraft({ ...saved, days: 8 }).days).toBeDefined();
    expect(validateDraft({ ...saved, name: '  ' }).name).toBeDefined();
    expect(validateDraft({ ...saved, goal: null }).goal).toBeDefined();
    expect(validateDraft({ ...saved, weight: 20 }).weight).toBeDefined();
    expect(
      validateDraft({ ...saved, birthDate: '2999-01-01' }, new Date('2026-10-04')).birthDate,
    ).toBeDefined();
  });

  it('clamps the steppers', () => {
    expect(stepDays(7, 1)).toBe(7);
    expect(stepDays(1, -1)).toBe(1);
    expect(stepMinutes(5, -1)).toBe(5);
    expect(stepMinutes(240, 1)).toBe(240);
    expect(stepWeight(76, 1)).toBe(76.5);
  });
});

describe('trajectory', () => {
  it('mixes badges, records and the first session, newest first', () => {
    const now = new Date('2026-10-04T12:00:00');
    const timeline = buildTimeline({
      badges: [
        { id: 'a', title: 'Racha de 7 días', subtitle: 'Una semana', earnedAt: '2026-10-04T09:00:00' },
        { id: 'b', title: 'Sin fecha', subtitle: '' },
      ],
      records: [{ id: 'r', at: '2026-09-23T10:00:00', title: 'Arnold press · 32,5 kg × 8', subtitle: 'Récord personal' }],
      firstSession: { at: '2026-01-12T10:00:00', title: 'Movilidad esencial' },
      now,
    });
    expect(timeline.map(entry => entry.id)).toEqual(['badge-a', 'pr-r', 'first-session']);
    expect(timeline[0].fresh).toBe(true);
    expect(timeline[1].fresh).toBe(false);
  });
});
