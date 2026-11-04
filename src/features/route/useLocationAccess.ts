import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { LocationAccess } from '@app/features/route/locationSource';
import { getLocationSource } from '@app/features/route/locationSourceFactory';
import { isReadyFix, locationStore } from '@app/features/route/locationStore';
import { routeStore } from '@app/features/route/routeStore';
import type { RoutePoint } from '@app/features/route/routeTypes';

// Permission state and where the person is, for the Ruta screens that need it
// (Salir ahora, Generar, Crear a mano). The position comes from the shared
// `locationStore`: the last known one at once (approximate), a reused one for
// 3 min after leaving Ruta, and the foreground search while the screen is
// focused; it stops when the screen loses focus (the recording has its own
// updates). The position also goes to `routeStore.origin`.
//
// `unanswered`: "Continuar" asked for the permission but the system dialog
// never showed (iOS drops the request while another system alert is up, and
// expo-location then never resolves). The screen offers Ajustes instead.
const DIALOG_WAIT_MS = 1500;

export function useLocationAccess() {
  const source = getLocationSource();
  const [access, setAccess] = useState<LocationAccess | null>(null);
  const [unanswered, setUnanswered] = useState(false);
  const snapshot = useSyncExternalStore(locationStore.subscribe, locationStore.get, locationStore.get);
  const alive = useRef(true);
  const usable = access?.permission === 'granted' && access.precise;

  const refresh = useCallback(async () => {
    const next = await source.getAccess().catch(() => null);
    if (alive.current && next) {
      setAccess(next);
      if (next.permission !== 'undetermined') {
        setUnanswered(false);
      }
    }
    return next;
  }, [source]);

  const request = useCallback(async () => {
    // The dialog takes the app out of 'active'; if that has not happened
    // after DIALOG_WAIT_MS, the dialog is not coming.
    let dialogShown = AppState.currentState !== 'active';
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        dialogShown = true;
      }
    });
    const asked = source.requestAccess().catch(() => null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const waited = new Promise<'waited'>(resolve => {
      timer = setTimeout(() => resolve('waited'), DIALOG_WAIT_MS);
    });
    let next = await Promise.race([asked, waited]);
    if (next === 'waited') {
      next = dialogShown ? await asked : await source.getAccess().catch(() => null);
    }
    clearTimeout(timer);
    subscription.remove();
    if (!alive.current || !next) {
      return null;
    }
    setAccess(next);
    setUnanswered(next.permission === 'undetermined');
    return next;
  }, [source]);

  useEffect(() => {
    alive.current = true;
    refresh().catch(() => undefined);
    // Back from Ajustes: the permission may have changed.
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh().catch(() => undefined);
      }
    });
    return () => {
      alive.current = false;
      subscription.remove();
    };
  }, [refresh]);

  // While the screen is focused and the permission allows it: show the known
  // position and look for a real one; stop when leaving.
  useFocusEffect(
    useCallback(() => {
      if (!usable) {
        return undefined;
      }
      locationStore.warm().catch(() => undefined);
      locationStore.start();
      return () => locationStore.stop();
    }, [usable]),
  );

  const point: RoutePoint | null = usable ? snapshot.fix?.point ?? null : null;
  useEffect(() => {
    if (point) {
      routeStore.patch({ origin: { lat: point.lat, lon: point.lon } });
    }
  }, [point]);

  return {
    access,
    // The best position known (may be approximate: see `approximate`).
    fix: point,
    approximate: usable ? Boolean(snapshot.fix?.approximate) : false,
    // Accurate enough to record (≤ 30 m, not the last known one).
    ready: usable && isReadyFix(snapshot.fix),
    usable,
    unanswered,
    request,
    refresh,
  };
}
