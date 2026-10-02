import type { ImageSourcePropType } from 'react-native';
import type { HomeMode } from '@app/features/home/homePriority';

// PLACEHOLDER photos from the handoff package with the hero treatment baked
// in (saturate .45 · contrast 1.08 · brightness .78). Wear: grayscale(1) ·
// contrast 1.12 · brightness .78.
export const HOME_PHOTOS = {
  core: require('@app/assets/v2/photos/home/hero-core.jpg'),
  workout: require('@app/assets/v2/photos/home/hero-entreno.jpg'),
  total: require('@app/assets/v2/photos/home/total.jpg'),
  effort: require('@app/assets/v2/photos/home/esfuerzo.jpg'),
  mobility: require('@app/assets/v2/photos/home/movilidad.jpg'),
  overhead: require('@app/assets/v2/photos/home/overhead.jpg'),
  wear: require('@app/assets/v2/photos/home/mancuerna-bn.jpg'),
} satisfies Record<string, ImageSourcePropType>;

export const HERO_PHOTO: Record<
  HomeMode,
  { source: ImageSourcePropType; focus: { x: number; y: number } }
> = {
  core33: { source: HOME_PHOTOS.core, focus: { x: 0.5, y: 0.3 } },
  workout: { source: HOME_PHOTOS.workout, focus: { x: 0.5, y: 0.25 } },
  resume: { source: HOME_PHOTOS.total, focus: { x: 0.4, y: 0.3 } },
  workoutDone: { source: HOME_PHOTOS.effort, focus: { x: 0.5, y: 0.3 } },
  new: { source: HOME_PHOTOS.mobility, focus: { x: 0.5, y: 0.4 } },
  allDone: { source: HOME_PHOTOS.overhead, focus: { x: 0.5, y: 0.25 } },
};
