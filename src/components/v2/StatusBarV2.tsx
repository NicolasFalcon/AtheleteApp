import { StatusBar } from 'react-native';
import { useTopSafeBarHeight } from '@app/components/v2/TopSafeBar';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type StatusBarV2Props = {
  // 'auto' follows theme.v2: dark content on Light, light content on Dark.
  // 'light' forces white content over a photo, only on full-screen routes.
  style?: 'auto' | 'light' | 'dark';
};

// Render once per screen. React Native keeps a stack of mounted StatusBar
// components: the last mounted wins and the previous style is restored on
// unmount, so nested screens and modals compose. Below the TopSafeBar (B-01)
// the status bar sits on the theme background, never on a photo, so it
// always follows the theme there whatever `style` says.
export function StatusBarV2({ style = 'auto' }: StatusBarV2Props) {
  const { mode } = useThemeV2();
  const underTopSafeBar = useTopSafeBarHeight() > 0;
  const light =
    underTopSafeBar || style === 'auto'
      ? mode !== 'light'
      : style === 'light';

  return (
    <StatusBar
      barStyle={light ? 'light-content' : 'dark-content'}
      backgroundColor="transparent"
      translucent
      animated
    />
  );
}
