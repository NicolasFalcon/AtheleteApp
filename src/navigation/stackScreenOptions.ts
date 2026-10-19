import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

// The one place where every native stack of the app is configured (Root,
// Auth, Onboarding). B-01: on iOS 26 the native stack gives the first
// ScrollView of each screen an "automatic" scroll edge effect, a frosted band
// under the status bar and the Dynamic Island that is LIGHT with the light
// theme: it drew a pale strip over the full-bleed photos (Inicio hero, routine
// detail, profiles, summary…). The app paints its own protection where it is
// needed (StatusBarShield / GlassHeader, always dark over photos), so the
// system effect is hidden on every edge.
export const STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  scrollEdgeEffects: { top: 'hidden', bottom: 'hidden', left: 'hidden', right: 'hidden' },
};
