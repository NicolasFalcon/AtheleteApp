import {parsePasswordRecoveryUrl} from '@app/lib/auth/passwordRecoveryUrl';

describe('parsePasswordRecoveryUrl', () => {
  test('lee los tokens del flujo implícito de Supabase', () => {
    expect(
      parsePasswordRecoveryUrl(
        'athelete://reset-password#access_token=access%20token&refresh_token=refresh-token&type=recovery',
      ),
    ).toEqual({
      isRecoveryUrl: true,
      credentials: {
        type: 'tokens',
        accessToken: 'access token',
        refreshToken: 'refresh-token',
      },
    });
  });

  test('lee el código del flujo PKCE', () => {
    expect(
      parsePasswordRecoveryUrl(
        'athelete://reset-password?code=recovery-code&type=recovery',
      ),
    ).toEqual({
      isRecoveryUrl: true,
      credentials: {
        type: 'code',
        code: 'recovery-code',
      },
    });
  });

  test('reconoce un enlace de recovery inválido sin credenciales', () => {
    expect(
      parsePasswordRecoveryUrl('athelete://reset-password?error=access_denied'),
    ).toEqual({
      isRecoveryUrl: true,
      credentials: null,
    });
  });

  test('ignora enlaces ajenos al reset de contraseña', () => {
    expect(parsePasswordRecoveryUrl('athelete://workouts/123')).toEqual({
      isRecoveryUrl: false,
      credentials: null,
    });
  });
});
