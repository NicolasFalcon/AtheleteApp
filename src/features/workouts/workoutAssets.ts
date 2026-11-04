import type { ImageSourcePropType } from 'react-native';
import type {
  EquipmentKey,
  ZoneKey,
} from '@app/features/workouts/workoutsModel';
import type { WorkoutType } from '@app/shared';

// PLACEHOLDER assets of Entrenos, baked from the handoff package with the
// prototype filters (see MIGRATION_PROGRESS §18):
// - zone-*: anatomical crops of `anatomia.jpg` (Piernas / Glúteos: photos)
//   with grayscale .85 · sepia .22 · brightness .9 · contrast 1.12 and the
//   left fade. The 7 definitive anatomical assets are TO CREATE (§15).
export const ZONE_IMAGES: Record<ZoneKey, ImageSourcePropType> = {
  chest: require('@app/assets/v2/workouts/zone-chest.png'),
  back: require('@app/assets/v2/workouts/zone-back.png'),
  shoulders: require('@app/assets/v2/workouts/zone-shoulders.png'),
  arms: require('@app/assets/v2/workouts/zone-arms.png'),
  core: require('@app/assets/v2/workouts/zone-core.png'),
  legs: require('@app/assets/v2/workouts/zone-legs.png'),
  glutes: require('@app/assets/v2/workouts/zone-glutes.png'),
};

// Zone-grid images (Ejercicios · Por zona): full-bleed, no text or borders.
// Static requires only; the tile crops them with resizeMode "cover".
export const MUSCLE_IMAGES: Record<ZoneKey, ImageSourcePropType> = {
  chest: require('@app/assets/images/musculos_atheleteapp/musculo_pecho.png'),
  back: require('@app/assets/images/musculos_atheleteapp/musculo_espalda.png'),
  shoulders: require('@app/assets/images/musculos_atheleteapp/musculo_hombros.png'),
  arms: require('@app/assets/images/musculos_atheleteapp/musculo_brazos.png'),
  core: require('@app/assets/images/musculos_atheleteapp/musculo_core.png'),
  legs: require('@app/assets/images/musculos_atheleteapp/musculo_piernas.png'),
  glutes: require('@app/assets/images/musculos_atheleteapp/musculo_gluteos.png'),
};

// Ember hotspot center per zone, in percent of the tile (top / left). Tweak
// here if a crop with resizeMode "cover" moves the point off the muscle; keep
// it clear of the label (bottom-left) in the tile.
export const MUSCLE_HOTSPOTS: Record<ZoneKey, { top: number; left: number }> = {
  chest: { top: 50, left: 62 },
  back: { top: 45, left: 76 },
  shoulders: { top: 33, left: 54 },
  arms: { top: 40, left: 78 },
  core: { top: 34, left: 68 },
  legs: { top: 32, left: 66 },
  glutes: { top: 26, left: 62 },
};

// Brand placeholder of exercise media (no media, still loading or failed):
// cover-bg for the large areas, its crop on the isotipo for thumbnails.
export const MEDIA_PLACEHOLDER: ImageSourcePropType = require('@app/assets/covers/cover-bg.jpg');
export const MEDIA_PLACEHOLDER_THUMB: ImageSourcePropType = require('@app/assets/covers/cover-thumb.jpg');

export const EQUIPMENT_IMAGES: Record<EquipmentKey, ImageSourcePropType> = {
  bodyweight: require('@app/assets/v2/workouts/eq-bodyweight.jpg'),
  dumbbells: require('@app/assets/v2/workouts/eq-dumbbells.jpg'),
  barbell: require('@app/assets/v2/workouts/eq-barbell.jpg'),
  cable: require('@app/assets/v2/workouts/eq-cable.jpg'),
  machines: require('@app/assets/v2/workouts/eq-machines.jpg'),
};

export const TYPE_IMAGES: Record<WorkoutType, ImageSourcePropType> = {
  strength: require('@app/assets/v2/workouts/type-strength.jpg'),
  cardio: require('@app/assets/v2/workouts/type-cardio.jpg'),
  fullbody: require('@app/assets/v2/workouts/type-fullbody.jpg'),
  hiit: require('@app/assets/v2/workouts/type-hiit.jpg'),
  mobility: require('@app/assets/v2/workouts/type-mobility.jpg'),
};

export const SCAN_IMAGE: ImageSourcePropType = require('@app/assets/v2/workouts/scan-prensa.jpg');

// Entrenos · Por tipo (v2.19 §29.4): category photo by key (slug without
// separators, see libraryCategoryKey), delivered in colour; the card applies
// the series treatment. Focal point = object-position of the handoff, so the
// vertical (164 × 208) and wide (353 × 150) crops keep the subject.
export type CategoryFocus = { left: `${number}%`; top: `${number}%` };

export type CategoryCover = {
  image: ImageSourcePropType;
  focus: CategoryFocus;
  // Wide card ("Tus rutinas"), when it differs.
  focusWide?: CategoryFocus;
};

export const CATEGORY_COVERS: Record<string, CategoryCover> = {
  fuerza: { image: require('@app/assets/covers/categorias/cat-fuerza.jpg'), focus: { left: '35%', top: '40%' } },
  hipertrofia: { image: require('@app/assets/covers/categorias/cat-hipertrofia.jpg'), focus: { left: '50%', top: '25%' } },
  funcional: { image: require('@app/assets/covers/categorias/cat-funcional.jpg'), focus: { left: '45%', top: '30%' } },
  fullbody: { image: require('@app/assets/covers/categorias/cat-fullbody.jpg'), focus: { left: '50%', top: '35%' } },
  cardio: { image: require('@app/assets/covers/categorias/cat-cardio.jpg'), focus: { left: '50%', top: '20%' } },
  hiit: { image: require('@app/assets/covers/categorias/cat-hiit.jpg'), focus: { left: '45%', top: '40%' } },
  calistenia: { image: require('@app/assets/covers/categorias/cat-calistenia.jpg'), focus: { left: '52%', top: '40%' } },
  core: { image: require('@app/assets/covers/categorias/cat-core.jpg'), focus: { left: '62%', top: '35%' } },
  movilidad: { image: require('@app/assets/covers/categorias/cat-movilidad.jpg'), focus: { left: '50%', top: '45%' } },
  viejaescuela: { image: require('@app/assets/covers/categorias/cat-vieja-escuela.jpg'), focus: { left: '50%', top: '25%' } },
  encasa: {
    image: require('@app/assets/covers/categorias/cat-en-casa.jpg'),
    focus: { left: '50%', top: '45%' },
    focusWide: { left: '50%', top: '55%' },
  },
  misrutinas: { image: require('@app/assets/covers/categorias/cat-mis-rutinas.jpg'), focus: { left: '40%', top: '30%' } },
};

// Missing photo or failed load: same card, same gradient and text.
export const CATEGORY_COVER_FALLBACK: CategoryCover = {
  image: require('@app/assets/covers/categorias/cover-bg.jpg'),
  focus: { left: '50%', top: '50%' },
};
