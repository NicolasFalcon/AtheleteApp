import { useEffect, useMemo, useState } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function useTheme() {
  const nextTheme = useNextTheme();
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('athelete-theme') as Theme | null;
    return stored ?? 'light';
  });

  const hasNextThemesProvider = useMemo(
    () => Array.isArray(nextTheme.themes) && nextTheme.themes.length > 0,
    [nextTheme.themes],
  );

  useEffect(() => {
    if (hasNextThemesProvider) return;
    applyTheme(theme);
    localStorage.setItem('athelete-theme', theme);
  }, [hasNextThemesProvider, theme]);

  // Listen for system changes when in system mode
  useEffect(() => {
    if (hasNextThemesProvider || typeof window === 'undefined') return;
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [hasNextThemesProvider, theme]);

  if (hasNextThemesProvider) {
    return {
      theme: (nextTheme.theme as Theme | undefined) ?? 'light',
      setTheme: (value: Theme) => nextTheme.setTheme(value),
    };
  }

  return { theme, setTheme: setThemeState };
}
