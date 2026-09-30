import { useMemo } from 'react';
import { useIsInScene, useThemeContext } from '@app/providers/ThemeProvider';
import { toSceneThemeV2 } from '@app/theme/v2';

export function useAppTheme() {
  const context = useThemeContext();
  const inScene = useIsInScene();

  return useMemo(
    () =>
      inScene
        ? {
            ...context,
            theme: { ...context.theme, v2: toSceneThemeV2(context.theme.v2) },
          }
        : context,
    [context, inScene],
  );
}
