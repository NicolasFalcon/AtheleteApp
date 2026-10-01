import { Moon, Sun } from 'lucide-react-native';
import {
  IconButton,
  type IconButtonVariant,
} from '@app/components/v2/IconButton';
import { useAppTheme } from '@app/hooks/useAppTheme';

// Light/Dark switch used on Auth heroes (glass over the photo). Stores the
// explicit preference, like the previous Auth toggle.
export function ThemeToggleButton({
  variant = 'glass',
}: {
  variant?: IconButtonVariant;
}) {
  const { mode, setPreferredMode } = useAppTheme();
  const isDark = mode === 'dark';

  return (
    <IconButton
      icon={isDark ? Sun : Moon}
      variant={variant}
      accessibilityLabel={isDark ? 'Usar tema claro' : 'Usar tema oscuro'}
      onPress={() => setPreferredMode(isDark ? 'light' : 'dark')}
    />
  );
}
