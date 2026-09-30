import { useAppTheme } from '@app/hooks/useAppTheme';
import type { ThemeV2 } from '@app/theme/v2';

// v2 primitives only read theme.v2 (Light, Dark or a SceneScope).
export function useThemeV2(): ThemeV2 {
  return useAppTheme().theme.v2;
}
