export type PasswordRecoveryCredentials =
  | {
      type: 'tokens';
      accessToken: string;
      refreshToken: string;
    }
  | {
      type: 'code';
      code: string;
    };

export type PasswordRecoveryUrlResult = {
  isRecoveryUrl: boolean;
  credentials: PasswordRecoveryCredentials | null;
};

function decodeUrlParam(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function parseUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const [, queryPart = ''] = url.split('?');
  const query = queryPart.split('#')[0] ?? '';
  const [, hash = ''] = url.split('#');
  const rawParams = [query, hash].filter(Boolean).join('&');

  rawParams.split('&').forEach(pair => {
    if (!pair) {
      return;
    }

    const [rawKey, ...rawValue] = pair.split('=');
    const key = decodeUrlParam(rawKey ?? '');

    if (!key) {
      return;
    }

    params[key] = decodeUrlParam(rawValue.join('='));
  });

  return params;
}

export function parsePasswordRecoveryUrl(
  url: string,
): PasswordRecoveryUrlResult {
  const params = parseUrlParams(url);
  const normalizedUrl = url.toLowerCase();
  const isRecoveryUrl =
    params.type === 'recovery' ||
    normalizedUrl.includes('reset-password') ||
    normalizedUrl.includes('password-recovery');

  if (!isRecoveryUrl) {
    return {isRecoveryUrl: false, credentials: null};
  }

  if (params.access_token && params.refresh_token) {
    return {
      isRecoveryUrl: true,
      credentials: {
        type: 'tokens',
        accessToken: params.access_token,
        refreshToken: params.refresh_token,
      },
    };
  }

  if (params.code) {
    return {
      isRecoveryUrl: true,
      credentials: {
        type: 'code',
        code: params.code,
      },
    };
  }

  return {isRecoveryUrl: true, credentials: null};
}
