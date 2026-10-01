import {
  LOGIN_CREDENTIALS_ERROR,
  toLoginError,
} from '../src/features/auth/loginError';

describe('toLoginError', () => {
  it('uses the design copy and the password ring for wrong credentials', () => {
    expect(toLoginError('Correo o contraseña incorrectos.')).toEqual({
      text: LOGIN_CREDENTIALS_ERROR,
      ringOnPassword: true,
    });
  });

  it('keeps other errors as they are, without the ring', () => {
    const message =
      'Tu correo aún no está verificado. Revisa tu bandeja de entrada antes de iniciar sesión.';

    expect(toLoginError(message)).toEqual({
      text: message,
      ringOnPassword: false,
    });
  });
});
