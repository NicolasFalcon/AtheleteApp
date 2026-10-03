import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Settings, useColorScheme } from 'react-native';
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

// Development only (iOS launch argument, never persisted), for screenshots:
// xcrun simctl launch booted <bundle> -themeMode dark
function devThemeOverride(): ThemeMode | null {
  if (!__DEV__ || Platform.OS !== 'ios') {
    return null;
  }
  try {
    const value = Settings.get('themeMode');
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    // No native SettingsManager (tests).
    return null;
  }
}

export function ThemeProvider({children}: PropsWithChildren) {
  const systemMode = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [preferredMode, setPreferredModeState] =
    useState<ThemePreference>('system');
  const [devOverride] = useState(devThemeOverride);
  const mode =
    devOverride ?? (preferredMode === 'system' ? systemMode : preferredMode);

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

// Marks a subtree as a dark scene (heroes, session, Core 33, celebrations…).
// Inside it, useAppTheme() returns theme.v2 with the scene colours, which are
// the same in light and dark mode. Legacy theme keys are not affected.
const SceneContext = createContext(false);

export function SceneScope({children}: PropsWithChildren) {
  return (
    <SceneContext.Provider value={true}>{children}</SceneContext.Provider>
  );
}

export function useIsInScene(): boolean {
  return useContext(SceneContext);
}

// Forces theme.v2 to light or dark inside a subtree without touching the
// user preference (previews such as the dev catalog). Legacy keys unaffected.
const ThemeV2ModeContext = createContext<ThemeMode | null>(null);

export function ThemeV2ModeScope({
  mode,
  children,
}: PropsWithChildren<{mode: ThemeMode}>) {
  return (
    <ThemeV2ModeContext.Provider value={mode}>
      {children}
    </ThemeV2ModeContext.Provider>
  );
}

export function useForcedThemeV2Mode(): ThemeMode | null {
  return useContext(ThemeV2ModeContext);
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider.');
  }

  return context;
}
