// Comunidad always talks to the real service (Supabase).
jest.mock('../src/services/social/supabaseSocialService', () => ({
  supabaseSocialService: { source: 'supabase' },
}));

import { getSocialService } from '../src/services/social/socialSource';

describe('socialSource', () => {
  it('always returns the real source (Supabase)', () => {
    expect(getSocialService()).toEqual({ source: 'supabase' });
  });
});
