import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { LocationAccess } from '@app/features/route/locationSource';
import { getLocationSource } from '@app/features/route/locationSourceFactory';
import { routeStore } from '@app/features/route/routeStore';
import type { RoutePoint } from '@app/features/route/routeTypes';

const FIX_RETRY_MS = 3000;

// Permission state and the person's current position for the Ruta screens
// that need to know where they are (Salir ahora, Generar, Crear a mano). The
// position also goes to `routeStore.origin`. It is re-read when the app comes
// back from Ajustes, and retried every few seconds until a fix arrives.
export function useLocationAccess() {
  const source = getLocationSource();
  const [access, setAccess] = useState<LocationAccess | null>(null);
  const [fix, setFix] = useState<RoutePoint | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    const next = await source.getAccess().catch(() => null);
    if (!alive.current || !next) {
      return;
    }
    setAccess(next);
    if (next.permission === 'granted' && next.precise) {
      const here = await source.getCurrent().catch(() => null);
      if (alive.current && here) {
        setFix(here);
        routeStore.patch({ origin: { lat: here.lat, lon: here.lon } });
      }
    } else {
      setFix(null);
    }
  }, [source]);

  const request = useCallback(async () => {
    const next = await source.requestAccess().catch(() => null);
    if (!alive.current || !next) {
      return null;
    }
    setAccess(next);
    refresh().catch(() => undefined);
    return next;
  }, [refresh, source]);

  useEffect(() => {
    alive.current = true;
    refresh().catch(() => undefined);
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

  const usable = access?.permission === 'granted' && access.precise;
  useEffect(() => {
    if (!usable || fix) {
      return undefined;
    }
    const timer = setInterval(() => {
      refresh().catch(() => undefined);
    }, FIX_RETRY_MS);
    return () => clearInterval(timer);
  }, [fix, refresh, usable]);

  return { access, fix, usable, request, refresh };
}
