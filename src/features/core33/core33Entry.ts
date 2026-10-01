import type { AppStackParamList } from '@app/types/navigation';

// Where the user is in Core 33. Today only 'intro' (no participation),
// 'active' and 'completed' come from the backend; 'explore' (catalogue of
// challenges) and 'ready' (habits chosen, start date pending) are the v2
// states that will get their own screens.
export type Core33EntryState =
  | 'intro'
  | 'explore'
  | 'ready'
  | 'active'
  | 'completed';

// Routes that can open Core 33 (add the future v2 screens here; they must be
// registered in AppStackParamList).
type Core33Route = Extract<keyof AppStackParamList, 'Core33'>;

export type Core33Entry = { name: Core33Route };

export function core33EntryState(
  status: 'active' | 'completed' | string | null | undefined,
): Core33EntryState {
  if (status === 'active') {
    return 'active';
  }
  if (status === 'completed') {
    return 'completed';
  }
  return 'intro';
}

// Single place that decides which screen opens Core 33. Every entry point
// (Inicio, Progreso, Notificaciones, Perfil) goes through here.
// Extension point: when the v2 intro / catálogo / preparado screens exist,
// map 'intro' | 'explore' | 'ready' to their routes here.
export function resolveCore33Entry(_state: Core33EntryState): Core33Entry {
  // ChallengeScreen already picks intro / habits / tracker / summary itself.
  return { name: 'Core33' };
}
