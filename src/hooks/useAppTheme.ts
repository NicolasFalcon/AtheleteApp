import { useMemo } from 'react';
import {
  useForcedThemeV2Mode,
  useIsInScene,
  useThemeContext,
} from '@app/providers/ThemeProvider';
import { createThemeV2, toSceneThemeV2 } from '@app/theme/v2';

export function useAppTheme() {
  const context = useThemeContext();
  const inScene = useIsInScene();
  const forcedMode = useForcedThemeV2Mode();

  return useMemo(() => {
    if (!inScene && !forcedMode) {
      return context;
    }

    const base = forcedMode ? createThemeV2(forcedMode) : context.theme.v2;

    return {
      ...context,
      theme: {
        ...context.theme,
        v2: inScene ? toSceneThemeV2(base) : base,
      },
    };
  }, [context, forcedMode, inScene]);
}
