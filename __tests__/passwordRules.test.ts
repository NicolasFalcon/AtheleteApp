import {
  allRequirementsMet,
  registerPasswordRequirements,
  resetPasswordRequirements,
} from '../src/features/auth/passwordRules';

describe('password requirements', () => {
  it('checks length, number and uppercase when creating an account', () => {
    expect(registerPasswordRequirements('abc').map(r => r.met)).toEqual([
      false,
      false,
      false,
    ]);
    expect(registerPasswordRequirements('abcdefg1').map(r => r.met)).toEqual([
      true,
      true,
      false,
    ]);
    expect(allRequirementsMet(registerPasswordRequirements('Ñandú2026'))).toBe(
      true,
    );
  });

  it('applies the sign-up policy plus a matching confirmation when resetting', () => {
    expect(
      resetPasswordRequirements('x', 'x')
        .slice(0, 3)
        .map(r => r.label),
    ).toEqual(registerPasswordRequirements('x').map(r => r.label));
    expect(
      allRequirementsMet(resetPasswordRequirements('nueva2026', 'nueva2026')),
    ).toBe(false); // no uppercase
    expect(
      allRequirementsMet(resetPasswordRequirements('Nueva2026', 'Nueva2025')),
    ).toBe(false);
    expect(
      allRequirementsMet(resetPasswordRequirements('Nueva2026', 'Nueva2026')),
    ).toBe(true);
    expect(resetPasswordRequirements('', '')[3].met).toBe(false);
  });
});
