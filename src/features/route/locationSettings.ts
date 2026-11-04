import { Linking, Platform } from 'react-native';

// "Abrir Ajustes" for the location. servicesOff: the phone's location switch
// (Android opens that system page; iOS has no public link to it, so both open
// the app's page, where Ubicación is one tap away).
export function openLocationSettings(servicesOff = false): void {
  if (servicesOff && Platform.OS === 'android') {
    Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => {
      Linking.openSettings().catch(() => {});
    });
    return;
  }
  Linking.openSettings().catch(() => {});
}
