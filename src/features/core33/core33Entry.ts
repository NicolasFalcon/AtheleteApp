import type { Core33ChallengeId } from '@app/features/core33/core33Catalog';
import type { AppStackParamList } from '@app/types/navigation';

// Where the user is in Core 33. 'active' and 'completed' come from the
// participation; 'intro' (never saw it) and 'explore' (saw it, no active
// challenge) from the profile. "Elegido pero no empezado" ('ready') is not
// stored by the backend (BT-01): it is a screen of the flow, never an entry.
export type Core33EntryState =
  | 'intro'
  | 'explore'
  | 'ready'
  | 'active'
  | 'completed';

type Core33Route = Extract<
  keyof AppStackParamList,
  'Core33' | 'Core33Intro' | 'Core33Explore'
>;

export type Core33Entry = { name: Core33Route };

export function core33EntryState(
  status: 'active' | 'completed' | string | null | undefined,
  introSeen = false,
): Core33EntryState {
  if (status === 'active') {
    return 'active';
  }
  if (status === 'completed') {
    return 'completed';
  }
  return introSeen ? 'explore' : 'intro';
}

// Single place that decides which screen opens Core 33. Every entry point
// (Inicio, Progreso, Notificaciones, Perfil, Ajustes, the discovery card)
// goes through here:
//  - active or completed → the day screen (Core33)
//  - never saw the intro → Intro (3 moments) → Explorar retos
//  - saw it → Explorar retos
export function resolveCore33Entry(state: Core33EntryState): Core33Entry {
  switch (state) {
    case 'active':
    case 'completed':
      return { name: 'Core33' };
    case 'intro':
      return { name: 'Core33Intro' };
    default:
      return { name: 'Core33Explore' };
  }
}

// The discovery card (HOME_10 / HOME_11) has no active challenge by
// definition: "Descubrir Core 33" opens the Intro the first time and
// "Explorar retos" afterwards; "Empieza otro Core 33" always explores.
export function resolveCore33Discovery(input: {
  introSeen: boolean;
  completedCount: number;
}): Core33Entry {
  return resolveCore33Entry(
    input.introSeen || input.completedCount > 0 ? 'explore' : 'intro',
  );
}

export type { Core33ChallengeId };
