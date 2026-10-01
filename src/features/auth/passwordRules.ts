// Live password requirements (Auth.dc.html). One policy for every new
// password: 8+ characters, a number, an uppercase letter. Restablecer adds
// "Coinciden" (the prototype lists only 8+, number and match there — D-38).
export type PasswordRequirement = {
  label: string;
  met: boolean;
};

const UPPERCASE = /[A-ZÁÉÍÓÚÑÜ]/;
const DIGIT = /\d/;

export function registerPasswordRequirements(
  password: string,
): PasswordRequirement[] {
  return [
    { label: 'Al menos 8 caracteres', met: password.length >= 8 },
    { label: 'Un número', met: DIGIT.test(password) },
    { label: 'Una mayúscula', met: UPPERCASE.test(password) },
  ];
}

export function resetPasswordRequirements(
  password: string,
  confirmation: string,
): PasswordRequirement[] {
  // Same policy as Crear cuenta (D-38) plus the confirmation.
  return [
    ...registerPasswordRequirements(password),
    {
      label: 'Coinciden',
      met: password.length > 0 && password === confirmation,
    },
  ];
}

export function allRequirementsMet(requirements: PasswordRequirement[]) {
  return requirements.every(requirement => requirement.met);
}
