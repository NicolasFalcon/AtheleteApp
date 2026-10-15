import type { LocationSource } from '@app/features/route/locationSource';
import { RealLocationSource } from '@app/features/route/RealLocationSource';

// The one place that decides which LocationSource the screens use.
let source: LocationSource | null = null;

export function getLocationSource(): LocationSource {
  if (!source) {
    source = new RealLocationSource();
  }
  return source;
}
