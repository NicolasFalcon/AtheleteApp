import type { ImageSourcePropType } from 'react-native';
import { Dumbbell, Moon, Salad, type LucideIcon } from 'lucide-react-native';
import { ROUTE_TITLES } from '@app/features/play/playModel';
import type { PlayHome, PlayRoute } from '@app/services/supabase/play';

// Route icons of Play (Quiz.dc.html: bowl, dumbbell, moon).
export const ROUTE_ICONS: Record<PlayRoute, LucideIcon> = {
  nutricion: Salad,
  entrenamiento: Dumbbell,
  recuperacion: Moon,
};

// Photo of the challenge-of-the-day card, by route.
export const ROUTE_PHOTOS: Record<PlayRoute, ImageSourcePropType> = {
  nutricion: require('@app/assets/v2/photos/quiz/nutrition.jpg'),
  entrenamiento: require('@app/assets/v2/photos/quiz/training.jpg'),
  recuperacion: require('@app/assets/v2/photos/quiz/recovery.jpg'),
};

// The route's title as the server names it (fallback: our own).
export function routeTitleOf(home: PlayHome | undefined | null) {
  return (route: PlayRoute): string =>
    home?.routes.find(item => item.route === route)?.title ?? ROUTE_TITLES[route];
}
