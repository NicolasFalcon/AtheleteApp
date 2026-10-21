import { Platform } from 'react-native';
import {
  AuthorizationRequestStatus,
  getRequestStatusForAuthorization,
  isHealthDataAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import {
  buildHealthNights,
  type HealthNight,
  type HealthQuantity,
  type HealthSample,
} from '@app/features/sleep/sleepModel';

// Apple Health, read only (handoff v2.15 §25.2): sleep with stages, resting
// heart rate and HRV. iOS only; anywhere else the app works with the manual
// log. HealthKit never says whether reading was denied: "unnecessary" only
// means the question was already asked.

const READ = [
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
] as const;

const NIGHTS = 14;

export function healthAvailable(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }
  try {
    return isHealthDataAvailable();
  } catch {
    return false;
  }
}

// true once the system sheet was shown (whatever the person chose).
export async function healthAsked(): Promise<boolean> {
  if (!healthAvailable()) {
    return false;
  }
  try {
    const status = await getRequestStatusForAuthorization({ toRead: READ });
    return status === AuthorizationRequestStatus.unnecessary;
  } catch {
    return false;
  }
}

// Shows the system sheet (only the first time; afterwards iOS answers at once).
export async function requestHealthAccess(): Promise<boolean> {
  if (!healthAvailable()) {
    return false;
  }
  try {
    await requestAuthorization({ toRead: READ });
    return true;
  } catch {
    return false;
  }
}

// The last 14 nights, grouped and ready for upsert_sleep_from_health.
export async function readHealthNights(now: Date = new Date()): Promise<HealthNight[]> {
  if (!healthAvailable()) {
    return [];
  }
  const startDate = new Date(now.getTime() - (NIGHTS + 1) * 24 * 60 * 60 * 1000);
  const filter = { date: { startDate, endDate: now } };
  const [sleep, resting, hrv] = await Promise.all([
    queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', { limit: 0, filter, ascending: true }),
    queryQuantitySamples('HKQuantityTypeIdentifierRestingHeartRate', { limit: 0, filter, unit: 'count/min' }).catch(
      () => [],
    ),
    queryQuantitySamples('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', { limit: 0, filter, unit: 'ms' }).catch(
      () => [],
    ),
  ]);
  const samples: HealthSample[] = sleep.map(item => ({
    value: Number(item.value),
    start: new Date(item.startDate),
    end: new Date(item.endDate),
  }));
  const quantity = (items: readonly { quantity: number; startDate: Date; endDate: Date }[]): HealthQuantity[] =>
    items.map(item => ({ value: item.quantity, start: new Date(item.startDate), end: new Date(item.endDate) }));
  return buildHealthNights(samples, quantity(resting), quantity(hrv));
}
