import {
  GENDER_OPTIONS,
  GENDER_OTHER_STORED,
  estimateBmr,
  genderFromDb,
  genderLabel,
  genderToDb,
} from '../src/features/profile/genderModel';

describe('gender model', () => {
  it('offers Mujer, Hombre and Otro', () => {
    expect(GENDER_OPTIONS.map(option => option.label)).toEqual([
      'Mujer',
      'Hombre',
      'Otro',
    ]);
    expect(genderLabel('female')).toBe('Mujer');
    expect(genderLabel(null)).toBe('');
  });

  it('reads the stored values and ignores unknown ones', () => {
    expect(genderFromDb('male')).toBe('male');
    expect(genderFromDb('female')).toBe('female');
    expect(genderFromDb('other')).toBe('other');
    expect(genderFromDb('x')).toBeNull();
    expect(genderFromDb(null)).toBeNull();
  });

  it('stores "other" now that the CHECK accepts it', () => {
    expect(GENDER_OTHER_STORED).toBe(true);
    expect(genderToDb('male')).toBe('male');
    expect(genderToDb('female')).toBe('female');
    expect(genderToDb('other')).toBe('other');
    expect(genderToDb('other', false)).toBeNull();
    expect(genderToDb(null, true)).toBeNull();
  });

  it('estimates resting energy with the sex constant and a neutral fallback', () => {
    const base = { weightKg: 70, heightCm: 170, ageYears: 30 };
    // 10·70 + 6.25·170 − 5·30 = 1612.5 before the constant.
    expect(estimateBmr({ ...base, gender: 'male' })).toBe(1618);
    expect(estimateBmr({ ...base, gender: 'female' })).toBe(1452);
    expect(estimateBmr({ ...base, gender: 'other' })).toBe(1535);
    expect(estimateBmr({ ...base, gender: null })).toBe(1535);
    expect(estimateBmr({ ...base, gender: undefined })).toBe(1535);
  });
});
