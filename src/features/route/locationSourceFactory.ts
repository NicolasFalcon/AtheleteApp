import { getRouteDevConfig } from '@app/dev/routeDevConfig';
import { SAMPLE_TRACKS } from '@app/dev/routeFixtures';
import {
  SimulatedLocationSource,
  type LocationSource,
} from '@app/features/route/locationSource';
import type { LatLng, RouteSport } from '@app/features/route/routeTypes';

// The one place that decides which LocationSource the screens use.
// 5a: always the simulation (the real flow is not reachable yet).
// TODO(route-wire): 5c/5d return an ExpoLocationSource here (expo-location,
// "Al usar la app" + background updates while recording); the screens do not
// change.
export function createLocationSource(
  sport: RouteSport,
  plan: readonly LatLng[] | null,
): LocationSource {
  const dev = getRouteDevConfig();
  const track = plan && plan.length > 1 ? plan : sport === 'running' ? SAMPLE_TRACKS.parque5k : SAMPLE_TRACKS.bici42k;
  return new SimulatedLocationSource({
    polyline: track,
    sport,
    permission: dev.permission,
    speedup: dev.speedup,
    detour: dev.detour ?? undefined,
    startM: dev.startM,
    // "Sin señal": an endless gap.
    gaps: dev.noSignal ? [{ atSec: 0, forSec: 1e9 }] : undefined,
  });
}
