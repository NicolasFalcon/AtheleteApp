import {
  GOALS,
  STEPS,
  canContinue,
  daysLine,
  initialAnswers,
  toOnboardingPayload,
  toggleEquipment,
  weekPattern,
} from '../src/features/onboarding/onboardingModel';

describe('onboarding v2 model', () => {
  it('has the 8 steps of the prototype in 3 blocks', () => {
    expect(STEPS).toHaveLength(8);
    expect(STEPS.map(step => step.block)).toEqual([0, 0, 0, 1, 1, 2, 2, 2]);
  });

  it('only continues when the current step is answered', () => {
    const answers = initialAnswers();

    expect(canContinue('name', answers)).toBe(false);
    expect(canContinue('name', { ...answers, name: ' Ana ' })).toBe(true);
    expect(canContinue('birthDate', answers)).toBe(false);
    expect(canContinue('body', answers)).toBe(true);
    expect(canContinue('goal', answers)).toBe(false);
    expect(canContinue('equipment', answers)).toBe(false);
    expect(
      canContinue('equipment', { ...answers, equipment: ['Barra'] }),
    ).toBe(true);
  });

  it('draws the training days on the week like the prototype', () => {
    expect(weekPattern(1)).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
    expect(weekPattern(3).filter(Boolean)).toHaveLength(3);
    expect(weekPattern(9).every(Boolean)).toBe(true);
    expect(daysLine(6)).toMatch(/descanso activo/);
    expect(daysLine(2)).toMatch(/Poco a poco/);
  });

  it('toggles equipment', () => {
    expect(toggleEquipment(['Barra'], 'Bandas')).toEqual(['Barra', 'Bandas']);
    expect(toggleEquipment(['Barra', 'Bandas'], 'Barra')).toEqual(['Bandas']);
  });

  it('maps answers to existing profile columns only', () => {
    const payload = toOnboardingPayload({
      ...initialAnswers(' Nicolas '),
      birthDate: '1989-08-30',
      weight: 76,
      height: 170,
      goal: 3, // Rendimiento
      level: 1,
      days: 6,
      equipment: ['Peso corporal', 'Mancuernas'],
      duration: 2,
    });

    expect(payload.name).toBe('Nicolas');
    expect(payload.data).toEqual({
      avatarKey: null,
      profilePhotoUrl: null,
      goal: GOALS[3].value,
      birthDate: '1989-08-30',
      gender: null,
      weight: 76,
      height: 170,
      trainingDaysPerWeek: 6,
      availableEquipment: ['Peso corporal', 'Mancuernas'],
    });
    expect(GOALS[3].value).toBe('improve_health');
    expect(payload.data).not.toHaveProperty('level');
  });

  it('refuses to build the payload with missing answers', () => {
    expect(() => toOnboardingPayload(initialAnswers('Ana'))).toThrow();
  });
});
