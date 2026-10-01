// Maps the (already normalised) sign-in error to the v2 Login copy.
// Wrong credentials get the design sentence and the ring on the password
// field; any other problem (unverified email, network…) keeps its own text.
export type LoginErrorView = {
  text: string;
  ringOnPassword: boolean;
};

const WRONG_CREDENTIALS = 'correo o contraseña incorrectos';

export const LOGIN_CREDENTIALS_ERROR =
  'Correo o contraseña incorrectos. Revísalos o recupera tu contraseña.';

export function toLoginError(message: string): LoginErrorView {
  if (message.toLowerCase().includes(WRONG_CREDENTIALS)) {
    return { text: LOGIN_CREDENTIALS_ERROR, ringOnPassword: true };
  }

  return { text: message, ringOnPassword: false };
}
