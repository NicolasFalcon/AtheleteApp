import { StatusBar } from 'react-native';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type StatusBarV2Props = {
  // 'auto' follows theme.v2: dark content only on Light surfaces; light
  // content in Dark and inside any SceneScope (handoff §4, shell status bar).
  // 'light' forces white content (hero photos outside a SceneScope).
  style?: 'auto' | 'light' | 'dark';
};

// Render once per screen (or inside a SceneScope). React Native keeps a stack
// of mounted StatusBar components: the last mounted wins and the previous
// style is restored on unmount, so nested screens and modals compose.
export function StatusBarV2({ style = 'auto' }: StatusBarV2Props) {
  const { mode } = useThemeV2();
  const light = style === 'light' || (style === 'auto' && mode !== 'light');

  return (
    <StatusBar
      barStyle={light ? 'light-content' : 'dark-content'}
      backgroundColor="transparent"
      translucent
      animated
    />
  );
}
