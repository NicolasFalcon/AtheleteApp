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
// - thumb-*: square anatomical crops per body part (rows / path / picker)
//   until each exercise has its MoveKit poster.
// - movekit-poster: video area mockup (studio background + anatomy).
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

const THUMBS: Record<ZoneKey | 'default', ImageSourcePropType> = {
  chest: require('@app/assets/v2/workouts/thumb-chest.jpg'),
  back: require('@app/assets/v2/workouts/thumb-back.jpg'),
  shoulders: require('@app/assets/v2/workouts/thumb-shoulders.jpg'),
  arms: require('@app/assets/v2/workouts/thumb-arms.jpg'),
  core: require('@app/assets/v2/workouts/thumb-core.jpg'),
  legs: require('@app/assets/v2/workouts/thumb-legs.jpg'),
  glutes: require('@app/assets/v2/workouts/thumb-glutes.jpg'),
  default: require('@app/assets/v2/workouts/thumb-default.jpg'),
};

export function exerciseThumbnail(bodyPart?: string | null): ImageSourcePropType {
  return THUMBS[(bodyPart as ZoneKey) ?? 'default'] ?? THUMBS.default;
}

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

export const MOVEKIT_POSTER: ImageSourcePropType = require('@app/assets/v2/workouts/movekit-poster.jpg');
