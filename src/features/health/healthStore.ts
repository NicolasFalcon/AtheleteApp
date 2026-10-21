import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  healthAsked,
  healthAvailable,
  readHealthNights,
  requestHealthAccess,
} from '@app/features/health/healthKit';
import { useAuth } from '@app/hooks/useAuth';
import { invalidateSleep } from '@app/hooks/useSleep';
import { sleepService } from '@app/services/sleep/sleepService';

// Apple Health on this device: whether the person connected it, and the
// sync of the last 14 nights (upsert_sleep_from_health) at launch, on coming
// back to the foreground and on opening Sueño — at most once every few hours
// (Sueño: every few minutes).
//
// - unavailable: no HealthKit (Android, iPad without Health).
// - notConnected: never connected from the app.
// - connected: connected and nights came from Health.
// - noData: connected but Health gave no night (reading denied in Ajustes ›
//   Salud, or nothing recorded): the design's state without Health, with
//   "Abrir Ajustes".
export type HealthStatus = 'unavailable' | 'notConnected' | 'connected' | 'noData';

export const HEALTH_STATUS_TEXT: Record<HealthStatus, string> = {
  unavailable: 'No disponible en este dispositivo',
  notConnected: 'Sin conectar',
  connected: 'Conectado',
  noData: 'Sin acceso a tus datos',
};

const KEY = '@athelete/apple-health';
export const SYNC_EVERY_MS = 3 * 60 * 60 * 1000;
export const SYNC_ON_OPEN_MS = 10 * 60 * 1000;

type Saved = { connected: boolean; lastSyncAt: number | null; lastCount: number | null };
type State = Saved & { loaded: boolean; syncing: boolean };

let state: State = { loaded: false, connected: false, lastSyncAt: null, lastCount: null, syncing: false };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach(listener => listener());
}

function persist() {
  const saved: Saved = { connected: state.connected, lastSyncAt: state.lastSyncAt, lastCount: state.lastCount };
  AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() => undefined);
}

export function healthStatusOf(current: State): HealthStatus {
  if (!healthAvailable()) {
    return 'unavailable';
  }
  if (!current.connected) {
    return 'notConnected';
  }
  return current.lastCount === 0 ? 'noData' : 'connected';
}

function load(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const saved = raw ? (JSON.parse(raw) as Partial<Saved>) : {};
        // A reinstall loses the flag, not the permission: asked before counts.
        const connected = saved.connected === true || (await healthAsked());
        set({
          loaded: true,
          connected,
          lastSyncAt: typeof saved.lastSyncAt === 'number' ? saved.lastSyncAt : null,
          lastCount: typeof saved.lastCount === 'number' ? saved.lastCount : null,
        });
      } catch {
        set({ loaded: true });
      }
    })();
  }
  return loading;
}

export async function syncHealthSleep(
  queryClient: QueryClient,
  options: { minIntervalMs?: number } = {},
): Promise<HealthStatus> {
  await load();
  if (!healthAvailable() || !state.connected || state.syncing) {
    return healthStatusOf(state);
  }
  const minInterval = options.minIntervalMs ?? SYNC_EVERY_MS;
  if (state.lastSyncAt && Date.now() - state.lastSyncAt < minInterval) {
    return healthStatusOf(state);
  }
  set({ syncing: true });
  try {
    const nights = await readHealthNights();
    await sleepService.upsertSleepFromHealth(nights);
    set({ lastSyncAt: Date.now(), lastCount: nights.length });
    persist();
    await invalidateSleep(queryClient);
  } catch (error) {
    console.warn('[health] No se pudo sincronizar el sueño:', error);
  } finally {
    set({ syncing: false });
  }
  return healthStatusOf(state);
}

// "Conectar Apple Health": the system sheet, then a first sync.
export async function connectHealth(queryClient: QueryClient): Promise<HealthStatus> {
  await load();
  if (!healthAvailable()) {
    return 'unavailable';
  }
  const asked = await requestHealthAccess();
  if (!asked) {
    return healthStatusOf(state);
  }
  set({ connected: true, lastSyncAt: null });
  persist();
  return syncHealthSleep(queryClient, { minIntervalMs: 0 });
}

// Reading permissions live in Salud (Ajustes › Salud › Acceso a datos y
// dispositivos); the app's own settings are the fallback.
export async function openHealthSettings() {
  try {
    await Linking.openURL('x-apple-health://');
  } catch {
    await Linking.openSettings().catch(() => undefined);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  load().catch(() => undefined);
  return () => {
    listeners.delete(listener);
  };
}
const snapshot = () => state;

export function useHealthState(): { status: HealthStatus; loaded: boolean; syncing: boolean } {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  return { status: healthStatusOf(current), loaded: current.loaded, syncing: current.syncing };
}

// Launch and every return to the foreground (signed in only).
export function useHealthSync() {
  const queryClient = useQueryClient();
  const { flow, profile } = useAuth();
  const active = flow === 'app' && Boolean(profile);

  useEffect(() => {
    if (!active || !healthAvailable()) {
      return undefined;
    }
    syncHealthSleep(queryClient).catch(() => undefined);
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') {
        syncHealthSleep(queryClient).catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [active, queryClient]);
}
