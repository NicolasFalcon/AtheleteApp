import type { ImageSourcePropType } from 'react-native';
import type { SessionType } from '@app/components/v2';
import { CATEGORY_COVERS, type CategoryCover } from '@app/features/workouts/workoutAssets';

// The colour cover of a plan session, by its type (v2.21 Plan.dc.html):
// pesado → Fuerza, volumen → Hipertrofia, técnico → Funcional, descarga →
// Movilidad, test → Vieja escuela. Photos are always in colour.
const TYPE_COVER: Record<SessionType, string> = {
  pesado: 'fuerza',
  volumen: 'hipertrofia',
  tecnico: 'funcional',
  descarga: 'movilidad',
  test: 'viejaescuela',
};

export function sessionTypeCover(type: SessionType | null): CategoryCover {
  return CATEGORY_COVERS[TYPE_COVER[type ?? 'pesado']] ?? CATEGORY_COVERS.fuerza;
}

export function sessionTypePhoto(type: SessionType | null): ImageSourcePropType {
  return sessionTypeCover(type).image;
}
