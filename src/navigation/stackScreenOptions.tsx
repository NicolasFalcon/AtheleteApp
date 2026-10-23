import type { ReactElement } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { TopSafeBar, TopSafeBarContent } from '@app/components/v2/TopSafeBar';

function renderTopSafeBar() {
  return <TopSafeBar />;
}

// The one place where every native stack of the app is configured (Root,
// Auth, Onboarding). B-01: the status bar area is a solid TopSafeBar (theme
// background + hairline) rendered as the custom header of every screen, and
// the content starts below it, so iOS 26 has nothing to draw its frosted
// scroll edge effect over. The effect also stays hidden for the full-screen
// routes, which keep their content under the status bar.
export const STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  header: renderTopSafeBar,
  scrollEdgeEffects: { top: 'hidden', bottom: 'hidden', left: 'hidden', right: 'hidden' },
};

// Routes without the bar: camera, live route, active session, sheets that do
// not reach the status bar, and the routes that only host a nested stack
// (that stack draws the bar of its own screens).
export const FULL_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
};

// screenLayout of every stack: the screen content measures its own insets
// (0 at the top under the bar).
export function stackScreenLayout({
  options,
  children,
}: {
  options: NativeStackNavigationOptions;
  children: ReactElement;
}) {
  return (
    <TopSafeBarContent barShown={options.headerShown !== false}>
      {children}
    </TopSafeBarContent>
  );
}
