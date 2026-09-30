import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

// Single photo-scrim recipe (handoff §5): soft at the top, almost opaque at
// the bottom so white text stays readable. `hero` follows the Inicio hero.
const RECIPES = {
  bottom: {
    colors: ['rgba(20,19,18,0)', 'rgba(20,19,18,.55)', 'rgba(20,19,18,.96)'],
    locations: [0, 0.5, 1],
  },
  hero: {
    colors: [
      'rgba(20,19,18,.6)',
      'rgba(20,19,18,.05)',
      'rgba(20,19,18,.35)',
      'rgba(20,19,18,.94)',
      'rgba(20,19,18,1)',
    ],
    locations: [0, 0.26, 0.52, 0.84, 1],
  },
} as const;

export type ScrimProps = {
  variant?: keyof typeof RECIPES;
  style?: StyleProp<ViewStyle>;
};

export function Scrim({ variant = 'bottom', style }: ScrimProps) {
  const recipe = RECIPES[variant];

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[...recipe.colors]}
      locations={[...recipe.locations]}
      style={[StyleSheet.absoluteFill, style]}
    />
  );
}
