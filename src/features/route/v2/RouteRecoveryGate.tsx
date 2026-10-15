import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Sheet, TextV2, useToast } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import {
  clearRecording,
  loadRecording,
  type ActiveRecording,
} from '@app/features/route/activeRecording';
import { MIN_SAVE_M, saveFinishedRecording } from '@app/features/route/finishRecording';
import { stopAllLocationUpdates } from '@app/features/route/RealLocationSource';
import type { RejectedSave } from '@app/features/route/rejectedSaves';
import { formatDuration, formatKm } from '@app/features/route/routeFormat';
import { routeStore } from '@app/features/route/routeStore';
import { restoreTracker, trackerActiveSec, trackerReducer } from '@app/features/route/routeTracker';
import { useAuth } from '@app/hooks/useAuth';
import { navigationRef } from '@app/navigation/navigationRef';
import { RouteServiceError } from '@app/services/route/routeService';
import { useRouteService } from '@app/services/route/useRouteService';

// Opens with the app (signed in): what Ruta left unfinished.
//  1. A recording found on the phone (the app was closed mid-route):
//     Continuar / Guardar / Descartar.
//  2. An activity the server refused: Reintentar / Descartar (it is never lost
//     silently).
// It also stops any location updates left running by a previous run of the
// app, and stops them when the session is closed.
export function RouteRecoveryGate() {
  const { session, flow } = useAuth();
  const service = useRouteService();
  const toast = useToast();
  const queryClient = useQueryClient();
  const userId = flow === 'app' ? session?.user.id ?? null : null;
  const checkedFor = useRef<string | null>(null);
  const [recording, setRecording] = useState<ActiveRecording | null>(null);
  const [refused, setRefused] = useState<RejectedSave | null>(null);
  const [busy, setBusy] = useState(false);

  // Signing out: nothing may keep tracking.
  useEffect(() => {
    if (!session) {
      stopAllLocationUpdates().catch(() => undefined);
      checkedFor.current = null;
    }
  }, [session]);

  const showRejected = useCallback(async () => {
    const list = await service.getRejected().catch(() => []);
    setRefused(list[0] ?? null);
  }, [service]);

  useEffect(() => {
    if (!userId || checkedFor.current === userId) {
      return;
    }
    checkedFor.current = userId;
    (async () => {
      const found = await loadRecording(userId);
      if (found) {
        setRecording(found);
        return;
      }
      await stopAllLocationUpdates();
      await showRejected();
    })().catch(() => undefined);
  }, [showRejected, userId]);

  const next = useCallback(async () => {
    setRecording(null);
    await showRejected();
  }, [showRejected]);

  const goOn = () => {
    if (!recording) {
      return;
    }
    routeStore.patch({
      sport: recording.state.sport,
      plan: recording.plan,
      visibility: recording.visibility,
      hideEndpoints: recording.hideEndpoints,
      autoPause: recording.state.autoPause,
      resume: recording,
    });
    setRecording(null);
    if (navigationRef.isReady()) {
      (navigationRef.navigate as (name: string) => void)(APP_ROUTES.RouteActive);
    }
  };

  const saveIt = async () => {
    if (!recording || !userId) {
      return;
    }
    setBusy(true);
    try {
      // Closed at the last instant that was saved.
      const state = trackerReducer(restoreTracker(recording.state), {
        type: 'finish',
        t: recording.state.now,
      });
      if (state.distanceM < MIN_SAVE_M) {
        await clearRecording(userId);
        toast.show('La salida era demasiado corta para guardarla.');
        await next();
        return;
      }
      const outcome = await saveFinishedRecording({
        service,
        state,
        userId,
        clientId: recording.clientId,
        visibility: recording.visibility,
        hideEndpoints: recording.hideEndpoints,
        plannedRouteId: recording.plan?.id ?? null,
      });
      if (outcome.kind === 'saved') {
        queryClient.invalidateQueries().catch(() => {});
        routeStore.reset({ finished: outcome.activity, posted: false });
        setRecording(null);
        if (navigationRef.isReady()) {
          (navigationRef.navigate as (name: string, params: object) => void)(APP_ROUTES.RouteResult, {
            activityId: outcome.activity.id,
          });
        }
      } else if (outcome.kind === 'rejected') {
        setRecording(null);
        await showRejected();
      } else {
        toast.show(outcome.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const discardIt = () => {
    Alert.alert(
      'Descartar la salida',
      'Se borra lo que se grabó y no se puede recuperar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            const run = async () => {
              if (userId) {
                await clearRecording(userId);
              }
              await stopAllLocationUpdates();
              await next();
            };
            run().catch(() => undefined);
          },
        },
      ],
    );
  };

  const retryRefused = async () => {
    if (!refused) {
      return;
    }
    setBusy(true);
    try {
      const { activityId } = await service.retryRejected(refused.clientId);
      queryClient.invalidateQueries().catch(() => {});
      setRefused(null);
      if (navigationRef.isReady()) {
        (navigationRef.navigate as (name: string, params: object) => void)(APP_ROUTES.RouteResult, {
          activityId,
        });
      }
    } catch (error) {
      if (error instanceof RouteServiceError && error.code !== 'network') {
        await showRejected();
      } else {
        toast.show(error instanceof RouteServiceError ? error.message : 'No pudimos guardar la actividad.');
      }
    } finally {
      setBusy(false);
    }
  };

  const discardRefused = async () => {
    if (refused) {
      await service.discardRejected(refused.clientId).catch(() => undefined);
    }
    await showRejected();
  };

  const restored = recording ? restoreTracker(recording.state) : null;
  return (
    <>
      <Sheet
        open={recording !== null}
        onClose={() => undefined}
        title="Tienes una salida sin terminar"
        footer={
          <View style={styles.actions}>
            <Button label="Continuar" variant="primary" fullWidth disabled={busy} onPress={goOn} />
            <View style={styles.row}>
              <Button
                label="Guardar"
                variant="secondary"
                style={styles.flex}
                disabled={busy}
                onPress={() => {
                  saveIt().catch(() => {});
                }}
              />
              <Button label="Descartar" variant="secondary" style={styles.flex} disabled={busy} onPress={discardIt} />
            </View>
          </View>
        }
      >
        <TextV2 variant="body" tone="secondary">
          {restored
            ? `${restored.sport === 'running' ? 'Carrera' : 'Ciclismo'} · ${formatKm(restored.distanceM)} km · ${formatDuration(trackerActiveSec(restored))}. La app se cerró mientras grababas. Continúa desde donde quedó, guárdala tal como está o descártala.`
            : ''}
        </TextV2>
      </Sheet>

      <Sheet
        open={refused !== null && recording === null}
        onClose={() => undefined}
        title="Una actividad no se pudo guardar"
        footer={
          <View style={styles.row}>
            <Button
              label="Descartar"
              variant="secondary"
              style={styles.flex}
              disabled={busy}
              onPress={() => {
                discardRefused().catch(() => {});
              }}
            />
            <Button
              label="Reintentar"
              variant="primary"
              style={styles.flex}
              disabled={busy}
              onPress={() => {
                retryRefused().catch(() => {});
              }}
            />
          </View>
        }
      >
        <TextV2 variant="body" tone="secondary">
          {refused
            ? `${refused.message} Sigue guardada en este teléfono: puedes reintentar (quitamos los saltos de GPS) o descartarla.`
            : ''}
        </TextV2>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
