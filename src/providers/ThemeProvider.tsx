import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import {
  createTheme,
  type AppTheme,
  type ThemeMode,
} from '@app/theme/theme';

type ThemePreference = ThemeMode | 'system';

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  preferredMode: ThemePreference;
  isDark: boolean;
  setMode: (mode: ThemeMode | null) => void;
  setPreferredMode: (mode: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_STORAGE_KEY = '@athelete/theme-mode';

export function ThemeProvider({children}: PropsWithChildren) {
  const systemMode = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [preferredMode, setPreferredModeState] =
    useState<ThemePreference>('system');
  const mode = preferredMode === 'system' ? systemMode : preferredMode;

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(value => {
        if (value === 'light' || value === 'dark' || value === 'system') {
          setPreferredModeState(value);
        }
      })
      .catch(() => undefined);
  }, []);

  const setPreferredMode = (nextMode: ThemePreference) => {
    setPreferredModeState(nextMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => undefined);
  };

  const value = useMemo(
    () => ({
      theme: createTheme(mode),
      mode,
      preferredMode,
      isDark: mode === 'dark',
      setMode: (nextMode: ThemeMode | null) =>
        setPreferredMode(nextMode ?? 'system'),
      setPreferredMode,
    }),
    [mode, preferredMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider.');
  }

  return context;
}
