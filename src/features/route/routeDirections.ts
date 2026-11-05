import { Linking, Platform } from 'react-native';
import { haversine } from '@app/features/route/routeGeo';
import type { LatLng, RouteSport } from '@app/features/route/routeTypes';

// "Cómo llegar": directions from where the person is to the first point of a
// route, in the phone's maps app. The origin is left to the maps app (it uses
// the current location).

// Closer than this to the start, the button is not shown.
export const DIRECTIONS_HIDE_M = 100;

export function needsDirections(here: LatLng | null | undefined, start: LatLng | undefined): boolean {
  if (!start) {
    return false;
  }
  return !here || haversine(here, start) >= DIRECTIONS_HIDE_M;
}

const coords = (point: LatLng) => `${point.lat.toFixed(6)},${point.lon.toFixed(6)}`;

// iOS 18.4 brought the new Apple Maps URL (maps.apple.com/directions) with
// mode=cycling. `Platform.Version` on iOS is the system version ("18.4.1").
export function supportsAppleMapsDirections(version: string | number): boolean {
  const [major = 0, minor = 0] = String(version).split('.').map(Number);
  return major > 18 || (major === 18 && minor >= 4);
}

// Apple Maps: new format on iOS ≥ 18.4; before that the old one, which has
// no bike mode (walking for both).
export function appleMapsUrl(start: LatLng, sport: RouteSport, version: string | number): string {
  if (supportsAppleMapsDirections(version)) {
    const mode = sport === 'cycling' ? 'cycling' : 'walking';
    return `https://maps.apple.com/directions?destination=${coords(start)}&mode=${mode}`;
  }
  return `https://maps.apple.com/?daddr=${coords(start)}&dirflg=w`;
}

// Google Maps app on iOS (URL scheme, listed in LSApplicationQueriesSchemes).
export function googleMapsAppUrl(start: LatLng): string {
  return `comgooglemaps://?daddr=${coords(start)}&directionsmode=bicycling`;
}

// Google Maps (Android, or the web/app link elsewhere).
export function googleMapsUrl(start: LatLng, sport: RouteSport): string {
  const mode = sport === 'cycling' ? 'bicycling' : 'walking';
  return `https://www.google.com/maps/dir/?api=1&destination=${coords(start)}&travelmode=${mode}`;
}

// The URL to open on this phone. On iOS < 18.4, cycling goes to the Google
// Maps app when it is installed (it has a bike mode); otherwise Apple Maps.
export async function resolveDirectionsUrl(start: LatLng, sport: RouteSport): Promise<string> {
  if (Platform.OS === 'android') {
    return googleMapsUrl(start, sport);
  }
  if (sport === 'cycling' && !supportsAppleMapsDirections(Platform.Version)) {
    const hasGoogleMaps = await Linking.canOpenURL('comgooglemaps://').catch(() => false);
    if (hasGoogleMaps) {
      return googleMapsAppUrl(start);
    }
  }
  return appleMapsUrl(start, sport, Platform.Version);
}

export async function openDirections(start: LatLng, sport: RouteSport): Promise<void> {
  await Linking.openURL(await resolveDirectionsUrl(start, sport));
}
