import { useEffect } from 'react';
import { isRouteSampleActive } from '@app/dev/routeDevConfig';
import { routeStore } from '@app/features/route/routeStore';
import type { RouteVisibility } from '@app/features/route/routeTypes';
import { getSocialService } from '@app/services/social/socialSource';

// Privacy defaults of Ruta live in `social_settings` (route_default_visibility,
// route_hide_endpoints_default, route_auto_pause). They are read once per app
// run into the session store, and written back when the person changes them
// in the privacy sheet or the auto-pause chip.
let loaded = false;

const VISIBILITIES: readonly RouteVisibility[] = ['me', 'friends', 'public'];

export function parseVisibility(value: unknown): RouteVisibility | null {
  return VISIBILITIES.includes(value as RouteVisibility) ? (value as RouteVisibility) : null;
}

export function useRouteDefaults(): void {
  useEffect(() => {
    if (loaded || isRouteSampleActive()) {
      return;
    }
    getSocialService()
      .getSettings()
      .then(settings => {
        if (!settings) {
          return;
        }
        loaded = true;
        const visibility = parseVisibility(settings.route_default_visibility);
        routeStore.patch({
          ...(visibility ? { visibility } : {}),
          hideEndpoints: settings.route_hide_endpoints_default !== false,
          autoPause: settings.route_auto_pause !== false,
        });
      })
      .catch(() => {});
  }, []);
}

// Fire and forget: a failure only means the default is not remembered.
export function saveRouteDefaults(next: {
  visibility?: RouteVisibility;
  hideEndpoints?: boolean;
  autoPause?: boolean;
}): void {
  if (isRouteSampleActive()) {
    return;
  }
  getSocialService()
    .updateSettings({
      ...(next.visibility ? { route_default_visibility: next.visibility } : {}),
      ...(next.hideEndpoints !== undefined ? { route_hide_endpoints_default: next.hideEndpoints } : {}),
      ...(next.autoPause !== undefined ? { route_auto_pause: next.autoPause } : {}),
    })
    .catch(() => {});
}
