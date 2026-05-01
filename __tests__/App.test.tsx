import { env } from '@app/lib/config/env';
import { createTheme } from '@app/theme/theme';

test('creates the premium theme foundation', () => {
  const theme = createTheme('light');

  expect(theme.colors.accent).toBe('#111111');
  expect(theme.spacing.lg).toBe(20);
  expect(theme.radii.lg).toBe(22);
});

test('keeps Supabase safe until env values are provided', () => {
  expect(env.supabase.isConfigured).toBe(false);
  expect(env.supabase.url).toBe('');
  expect(env.supabase.anonKey).toBe('');
});
