import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mountain, Pause, Play, Target } from 'lucide-react-native';
import { Button, PressableScale, Sheet, TextV2 } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { getRouteDevConfig } from '@app/dev/routeDevConfig';
import { SimulatedLocationSource } from '@app/features/route/locationSource';
import { createLocationSource } from '@app/features/route/locationSourceFactory';
import { RouteMap } from '@app/features/route/RouteMap';
import {
  formatDuration,
  formatElevation,
  formatKm,
  formatPace,
  formatSpeed,
} from '@app/features/route/routeFormat';
import { nearestOnRoute } from '@app/features/route/routeGeo';
import { routeStore, useRouteSession } from '@app/features/route/routeStore';
import { activityFromTracker } from '@app/features/route/routeSummary';
import {
  initialTracker,
  trackerActiveSec,
  trackerElevation,
  trackerPace,
  trackerPausedSec,
  trackerSignalLost,
  trackerSpeed,
} from '@app/features/route/routeTracker';
import { preplayTracker, useRouteTracker } from '@app/features/route/useRouteTracker';
import { BigFigure, DARK } from '@app/features/route/v2/RouteUi';
import { useRouteService } from '@app/services/route/useRouteService';
import type { AppScreenProps } from '@app/types/navigation';

const MIN_SAVE_M = 100;
const EMBER = '#FF5A1F';

// Grabando (ROUTE_05–07, 23, 24): dark scene in both themes. Map with the
// trail, big distance, time and pace (speed when cycling), pause / resume and
// finish with confirmation. With a plan: the route dotted and "Te alejaste de
// la ruta" when the track leaves it (>40 m running, >60 m cycling for 10 s).
// Fixes come from the LocationSource (simulated in 5a).
export function RouteActiveScreen({ navigation, route }: AppScreenProps<'RouteActive'>) {
  const insets = useSafeAreaInsets();
  const service = useRouteService();
  const session = useRouteSession();
  const dev = getRouteDevConfig();
  const preplayed = __DEV__ && Boolean(route?.params?.dev) && dev.startM > 0;
  const planPoints = session.plan?.points ?? null;
  const sport = session.sport;

  const source = useMemo(() => createLocationSource(sport, planPoints), [sport, planPoints]);
  const initial = useMemo(
    () =>
      preplayed && source instanceof SimulatedLocationSource
        ? preplayTracker({
            source,
            sport,
            plan: planPoints,
            startM: dev.startM,
            elapsedSec: dev.elapsedSec,
            paused: dev.startPaused,
            quietSec: dev.noSignal ? 20 : 0,
          })
        : initialTracker(sport, planPoints),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const tracker = useRouteTracker({ source, sport, plan: planPoints, initial });
  const { state } = tracker;
  const startRef = useRef(tracker.start);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.status === 'ready') {
      startRef.current();
    }
  }, [state.status]);

  const paused = state.status === 'paused';
  const signalLost = trackerSignalLost(state);
  const here = state.points[state.points.length - 1] ?? null;
  const off = state.deviation.off && !paused;
  const guide = useMemo(() => {
    if (!off || !here || !planPoints) {
      return undefined;
    }
    const hit = nearestOnRoute(here, planPoints);
    return hit ? [here, hit.nearest] : undefined;
  }, [off, here, planPoints]);

  const distance = formatKm(state.distanceM);
  const running = sport === 'running';
  const tooShort = state.distanceM < MIN_SAVE_M;
  const subtitle = signalLost
    ? 'Sin señal GPS'
    : paused
      ? 'En pausa'
      : session.plan
        ? `Circular · ${Math.round(session.plan.distanceM / 1000)}K`
        : 'GPS ±3 m';

  const finish = async () => {
    setConfirm(false);
    if (tooShort) {
      routeStore.patch({ finished: null });
      navigation.goBack();
      return;
    }
    setSaving(true);
    tracker.finish();
    const activity = activityFromTracker(state, {
      visibility: session.visibility,
      hideEndpoints: session.hideEndpoints,
      plannedRouteId: session.plan?.id ?? null,
    });
    try {
      const saved = await service.saveActivity(activity);
      routeStore.patch({ finished: saved, posted: false });
      navigation.replace(APP_ROUTES.RouteResult, { activityId: saved.id });
    } catch {
      setSaving(false);
    }
  };

  const pace = running ? formatPace(trackerPace(state)) : formatSpeed(trackerSpeed(state));
  const paceLabel = running ? 'Ritmo /km' : 'Velocidad km/h';

  return (
    <View style={[styles.screen, { backgroundColor: DARK.bg }]}>
      <RouteMap
        style={StyleSheet.absoluteFill}
        mode="dark"
        center={here ?? undefined}
        zoom={running ? 16 : 14.5}
        padding={{ top: insets.top + 90, bottom: 400, left: 30, right: 30 }}
        route={state.points.length > 1 ? state.points : undefined}
        plan={planPoints ?? undefined}
        guide={guide}
        here={here}
        dim={paused ? 0.5 : 1}
        interactive={false}
      />

      <View style={[styles.head, { top: insets.top + 8 }]} pointerEvents="none">
        <View style={styles.headRow}>
          <View
            style={[
              styles.dot,
              paused ? { borderWidth: 2, borderColor: DARK.text } : { backgroundColor: signalLost ? DARK.quiet : EMBER },
            ]}
          />
          <TextV2 variant="bodyStrong" color={DARK.text}>
            {running ? 'Carrera' : 'Ciclismo'}
          </TextV2>
        </View>
        <TextV2 variant="meta" color={DARK.muted}>
          {subtitle}
        </TextV2>
      </View>

      {off ? (
        <View style={[styles.banner, { top: insets.top + 60 }]}>
          <View style={[styles.dotSmall, { borderColor: EMBER }]} />
          <View style={styles.flex}>
            <TextV2 variant="bodyStrong" color={DARK.text}>
              Te alejaste de la ruta
            </TextV2>
            <TextV2 variant="meta" color={DARK.muted}>
              A {Math.round(state.deviation.distanceM ?? 0)} m · tu recorrido se sigue registrando
            </TextV2>
          </View>
        </View>
      ) : signalLost ? (
        <View style={[styles.banner, { top: insets.top + 60 }]}>
          <View style={[styles.dotSmall, { borderColor: DARK.quiet }]} />
          <View style={styles.flex}>
            <TextV2 variant="bodyStrong" color={DARK.text}>
              Sin señal GPS
            </TextV2>
            <TextV2 variant="meta" color={DARK.muted}>
              Seguimos contando el tiempo. Sal a un lugar abierto.
            </TextV2>
          </View>
        </View>
      ) : null}

      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(14,13,12,0)', DARK.bg]}
          style={styles.fade}
        />
        {paused ? (
          <View style={styles.pausedBlock}>
            <View style={styles.headRow}>
              <View style={[styles.dotSmall, { borderColor: DARK.text }]} />
              <TextV2 variant="eyebrow" color={DARK.text}>
                ACTIVIDAD EN PAUSA
              </TextV2>
            </View>
            <TextV2 style={styles.pausedTime}>{formatDuration(trackerActiveSec(state))}</TextV2>
            <TextV2 variant="body" color={DARK.muted}>
              En pausa desde hace{' '}
              <TextV2 variant="bodyStrong" color={DARK.text}>
                {formatDuration(trackerPausedSec(state))}
              </TextV2>
            </TextV2>
            <View style={[styles.line, { borderColor: DARK.hairline }]}>
              <Metric dark value={distance} unit="km" label="Distancia" size={32} />
              <Metric dark value={pace} unit={running ? '/km' : 'km/h'} label={running ? 'Ritmo medio' : 'Velocidad media'} size={32} divider />
            </View>
            <Button label="Continuar" icon={Play} variant="onScene" fullWidth onPress={tracker.resume} />
            <PressableScale
              accessibilityRole="button"
              onPress={() => setConfirm(true)}
              style={[styles.finish, { borderColor: DARK.hairline }]}
            >
              <TextV2 variant="bodyStrong" color={DARK.text}>
                Finalizar
              </TextV2>
            </PressableScale>
          </View>
        ) : (
          <>
            <BigFigure value={distance} unit="km" size={112} color={DARK.text} unitColor={DARK.muted} />
            <View style={styles.statsRow}>
              <Metric dark value={formatDuration(trackerActiveSec(state))} label="Tiempo" size={40} />
              <Metric dark value={pace} unit={running ? undefined : 'km/h'} label={paceLabel} size={40} divider />
            </View>
            <View style={[styles.extra, { borderTopColor: DARK.hairline }]}>
              <View style={styles.extraItem}>
                <Mountain size={15} color={DARK.muted} strokeWidth={2} />
                <TextV2 variant="meta" color={DARK.muted}>
                  {formatElevation(trackerElevation(state))} m
                </TextV2>
              </View>
              {session.plan ? (
                <View style={styles.extraItem}>
                  <Target size={15} color={DARK.muted} strokeWidth={2} />
                  <TextV2 variant="meta" color={DARK.muted}>
                    de {formatKm(session.plan.distanceM)} km
                  </TextV2>
                </View>
              ) : null}
            </View>
            <View style={styles.center}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Pausar"
                onPress={tracker.pause}
                style={styles.pauseButton}
              >
                <Pause size={26} color="#FFFFFF" strokeWidth={2.4} fill="#FFFFFF" />
              </PressableScale>
            </View>
          </>
        )}
      </View>

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title={tooShort ? 'Aún no hay distancia' : '¿Terminar la salida?'}
        footer={
          <View style={styles.sheetActions}>
            <Button label="Seguir" variant="secondary" style={styles.flex} onPress={() => setConfirm(false)} />
            <Button
              label={tooShort ? 'Descartar' : 'Terminar'}
              variant="primary"
              style={styles.flex}
              disabled={saving}
              onPress={() => {
                finish().catch(() => {});
              }}
            />
          </View>
        }
      >
        <TextV2 variant="body" tone="secondary">
          {tooShort
            ? 'Todavía no registramos movimiento. Si terminas ahora, la salida se descarta.'
            : `${distance} km en ${formatDuration(trackerActiveSec(state))}. Guardaremos tu ruta y verás el resumen.`}
        </TextV2>
      </Sheet>
    </View>
  );
}

function Metric({
  value,
  unit,
  label,
  size,
  divider = false,
}: {
  dark?: boolean;
  value: string;
  unit?: string;
  label: string;
  size: number;
  divider?: boolean;
}) {
  return (
    <View style={[styles.metric, divider ? [styles.metricDivider, { borderLeftColor: DARK.hairline }] : null]}>
      <View style={styles.metricValue}>
        <TextV2
          numberOfLines={1}
          style={{ fontSize: size, lineHeight: size * 1.15, fontWeight: '700', letterSpacing: -size * 0.02, color: DARK.text }}
        >
          {value}
        </TextV2>
        {unit ? (
          <TextV2 variant="body" color={DARK.muted}>
            {unit}
          </TextV2>
        ) : null}
      </View>
      <TextV2 variant="meta" color={DARK.muted}>
        {label}
      </TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  head: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 2 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotSmall: { width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(30,28,26,.92)',
  },
  fade: { position: 'absolute', left: 0, right: 0, top: -120, height: 120 },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DARK.bg,
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 14,
  },
  pausedBlock: { gap: 10 },
  pausedTime: { fontSize: 80, lineHeight: 88, fontWeight: '800', letterSpacing: -3, color: DARK.quiet },
  line: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, marginVertical: 6 },
  statsRow: { flexDirection: 'row' },
  metric: { flex: 1, gap: 2 },
  metricDivider: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 18 },
  metricValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  extra: { flexDirection: 'row', gap: 22, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14 },
  extraItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  center: { alignItems: 'center' },
  pauseButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finish: { height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  sheetActions: { flex: 1, flexDirection: 'row', gap: 10 },
});
