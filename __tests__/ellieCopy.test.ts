import { ellieErrorLine, failureEffect, isRetryable, normalizeLanguage } from '../src/features/ellie/ellieCopy';
import type { EllieErrorCode } from '../src/services/ellie/ellieService';

const CODES: EllieErrorCode[] = [
  'invalid_input', 'unauthorized', 'image_forbidden', 'ai_forbidden', 'conversation_not_found',
  'image_not_found', 'duplicate_in_progress', 'image_too_large', 'image_type', 'daily_limit',
  'daily_image_limit', 'rate_limited', 'ai_credits_exhausted', 'ai_unavailable', 'internal',
  'offline', 'unknown',
];

describe('ELLIE error copy (es / en)', () => {
  it('daily_limit shows used / limit and that it resets tomorrow', () => {
    const es = ellieErrorLine({ code: 'daily_limit', used: 40, limit: 40 }, 'es');
    expect(es).toContain('40 de 40');
    expect(es).toMatch(/mañana/);
    const en = ellieErrorLine({ code: 'daily_limit', used: 40, limit: 40 }, 'en');
    expect(en).toContain('40 of 40');
    expect(en).toMatch(/tomorrow/);
  });

  it('every code has a text in both languages, none leaks codes or internals', () => {
    for (const code of CODES) {
      for (const language of ['es', 'en'] as const) {
        const line = ellieErrorLine({ code }, language);
        expect(line.length).toBeGreaterThan(10);
        expect(line).not.toMatch(/credit|créditos|gemini|lovable|gateway|pasarela|provider|proveedor|502|500|402|403|429/i);
        expect(line).not.toContain(code);
      }
    }
  });

  it('ai_credits_exhausted and ai_forbidden are generic', () => {
    expect(ellieErrorLine({ code: 'ai_credits_exhausted' }, 'es')).not.toMatch(/crédito|pago|saldo/i);
    expect(ellieErrorLine({ code: 'ai_forbidden' }, 'es')).toBe(ellieErrorLine({ code: 'ai_unavailable' }, 'es'));
  });

  it('effects: limit blocks, offline blocks, unauthorized goes to login, the rest retry', () => {
    expect(failureEffect('daily_limit')).toBe('limit');
    expect(failureEffect('daily_image_limit')).toBe('limit');
    expect(failureEffect('offline')).toBe('offline');
    expect(failureEffect('unauthorized')).toBe('login');
    expect(failureEffect('rate_limited')).toBe('retry');
    expect(failureEffect('ai_unavailable')).toBe('retry');
  });

  it('retry is offered only where it can work', () => {
    expect(isRetryable('rate_limited')).toBe(true);
    expect(isRetryable('ai_unavailable')).toBe(true);
    expect(isRetryable('ai_forbidden')).toBe(true);
    expect(isRetryable('offline')).toBe(true);
    expect(isRetryable('daily_limit')).toBe(false);
    expect(isRetryable('unauthorized')).toBe(false);
    expect(isRetryable('invalid_input')).toBe(false);
  });

  it('language defaults to Spanish', () => {
    expect(normalizeLanguage('en')).toBe('en');
    expect(normalizeLanguage('es')).toBe('es');
    expect(normalizeLanguage(null)).toBe('es');
    expect(normalizeLanguage('fr')).toBe('es');
  });
});
