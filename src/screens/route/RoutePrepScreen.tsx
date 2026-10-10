import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, EyeOff, Lock, Minus, Pause, Play, Plus, X } from 'lucide-react-native';
import {
  Button,
  EllieActionButton,
  PressableScale,
  Sheet,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { getRouteDevConfig } from '@app/dev/routeDevConfig';
import { SAMPLE_ORIGIN } from '@app/dev/routeFixtures';
import { RouteThumb } from '@app/features/route/v2/RouteThumb';
import { createLocationSource } from '@app/features/route/locationSourceFactory';
import { RouteMap } from '@app/features/route/RouteMap';
import { KIND_LABEL, formatElevation, formatKm } from '@app/features/route/routeFormat';
import { routeStore, useRouteSession } from '@app/features/route/routeStore';
import type {
  LatLng,
  PlannedRoute,
  RouteElevationPref,
  RouteKind,
  RouteSurfacePref,
} from '@app/features/route/routeTypes';
import {
  BigFigure,
  BottomPanel,
  Chip,
  GpsChip,
  RoundButton,
  SportSegment,
} from '@app/features/route/v2/RouteUi';
import { RoutePrivacySheet, visibilityLabel } from '@app/features/route/v2/RoutePrivacySheet';
import { SAMPLE_TRACKS } from '@app/dev/routeFixtures';
import { APP_ROUTES } from '@app/constants/routes';
import { useRouteService } from '@app/services/route/useRouteService';
import type { AppScreenProps } from '@app/types/navigation';

const KM_PILLS = { running: [3, 5, 10, 21], cycling: [20, 40, 60, 100] } as const;

const KIND_OPTIONS: { key: RouteKind; label: string }[] = [
  { key: 'loop', label: 'Circuito' },
  { key: 'out_and_back', label: 'Ida y vuelta' },
  { key: 'point_to_point', label: 'Punto a punto' },
];
const ELEVATION_OPTIONS: { key: RouteElevationPref; label: string }[] = [
  { key: 'low', label: 'Poco' },
  { key: 'balanced', label: 'Medio' },
  { key: 'any', label: 'Sin preferencia' },
];
const SURFACE_OPTIONS: { key: RouteSurfacePref; label: string }[] = [
  { key: 'any', label: 'Cualquiera' },
  { key: 'asphalt', label: 'Asfalto' },
  { key: 'trail', label: 'Tierra' },
];

function next<T extends { key: string }>(options: T[], key: string): T['key'] {
  const index = options.findIndex(option => option.key === key);
  return options[(index + 1) % options.length].key;
}

// Salir ahora / Planear ruta (ROUTE_01–04, 13, 22): the map with the start
// point, the sport, the target configuration and "Comenzar". The location comes
// from the LocationSource (simulated in 5a).
export function RoutePrepScreen({ navigation, route }: AppScreenProps<'RoutePrep'>) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const session = useRouteSession();
  const service = useRouteService();
  const dev = getRouteDevConfig();
  const { sport, mode, config, plan } = session;
  const [privacyOpen, setPrivacyOpen] = useState(__DEV__ && route?.params?.dev === 'privacy');
  const [otherOpen, setOtherOpen] = useState(false);
  const [mapFailed, setMapFailed] = useState(dev.mapOffline);
  const [mapKey, setMapKey] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [permission, setPermission] = useState(dev.permission);
  const [origin, setOrigin] = useState<LatLng | null>(dev.noSignal ? null : SAMPLE_ORIGIN);
  const source = useMemo(() => createLocationSource(sport, plan?.points ?? null), [sport, plan]);

  useEffect(() => {
    let alive = true;
    service
      .getSavedRoutes()
      .then(list => alive && setSavedCount(list.length))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [service, route?.params]);

  useEffect(() => {
    let alive = true;
    source
      .getPermission()
      .then(value => alive && setPermission(value))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [source]);

  useEffect(() => {
    if (permission !== 'granted' || dev.noSignal) {
      setOrigin(null);
      return undefined;
    }
    let alive = true;
    source
      .getCurrent()
      .then(fix => alive && setOrigin(fix ? { lat: fix.lat, lon: fix.lon } : null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [source, permission, dev.noSignal]);

  const start = useCallback(async () => {
    let value = permission;
    if (value !== 'granted') {
      value = await source.requestPermission();
      setPermission(value);
    }
    if (value === 'granted') {
      navigation.navigate(APP_ROUTES.RouteActive);
    }
  }, [navigation, permission, source]);

  const close = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const denied = permission === 'denied';
  const searching = !denied && !origin;
  const km = config.km;
  const ringRadius = (km * 1000) / (2 * Math.PI);
  const privacyPreview = plan?.points ?? SAMPLE_TRACKS.parque5k;
  const sportWord = sport === 'running' ? 'CORRER' : 'CICLISMO';
  const pills = KM_PILLS[sport];
  const isOther = !(pills as readonly number[]).includes(km);

  const mapCenter = origin ?? SAMPLE_ORIGIN;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <RouteMap
        key={mapKey}
        style={StyleSheet.absoluteFill}
        mode="auto"
        center={mapCenter}
        zoom={mode === 'plan' && !plan ? zoomForKm(km) : 15}
        fit={plan ? plan.points : undefined}
        padding={{ top: insets.top + 90, bottom: 360, left: 40, right: 40 }}
        route={undefined}
        plan={plan?.points}
        planStyle="grey"
        here={origin}
        ring={mode === 'plan' && !plan && origin ? { center: origin, radiusM: ringRadius } : null}
        onLoadFailed={() => setMapFailed(true)}
        onLoaded={() => setMapFailed(dev.mapOffline)}
      />

      <View style={[styles.top, { top: insets.top + 8 }]}>
        <RoundButton icon={X} label="Cerrar" onPress={close} />
        <SportSegment sport={sport} onChange={routeStore.setSport} />
        <RoundButton icon={Lock} label="Privacidad" onPress={() => setPrivacyOpen(true)} />
      </View>

      {mapFailed ? (
        <View style={[styles.offline, { top: insets.top + 72, backgroundColor: colors.surface.raised }]}>
          <TextV2 variant="metaStrong">Sin conexión · no se pudo cargar el mapa</TextV2>
          <PressableScale
            accessibilityRole="button"
            onPress={() => {
              setMapFailed(false);
              setMapKey(value => value + 1);
            }}
          >
            <TextV2 variant="metaStrong" color={colors.ember.strong}>
              Reintentar
            </TextV2>
          </PressableScale>
        </View>
      ) : null}

      <BottomPanel style={{ paddingBottom: Math.max(insets.bottom, 16) + 4 }}>
        <View style={styles.tabs}>
          {(['now', 'plan'] as const).map(key => {
            const active = mode === key;
            return (
              <PressableScale
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => routeStore.patch({ mode: key })}
                style={styles.tab}
              >
                <View
                  style={[
                    styles.tabBar,
                    { backgroundColor: active ? colors.text.primary : colors.divider },
                  ]}
                />
                <TextV2 variant="bodyStrong" color={active ? colors.text.primary : colors.text.secondary}>
                  {key === 'now' ? 'Salir ahora' : 'Planear ruta'}
                </TextV2>
                <TextV2 variant="meta" tone="secondary" numberOfLines={2}>
                  {key === 'now'
                    ? 'Comienza y deja que GPS registre tu recorrido.'
                    : 'Define tu recorrido antes de salir.'}
                </TextV2>
              </PressableScale>
            );
          })}
        </View>

        {mode === 'now' ? (
          <View style={styles.body}>
            {denied ? (
              <View style={styles.state}>
                <TextV2 variant="title22">Necesitamos tu ubicación</TextV2>
                <TextV2 variant="body" tone="secondary">
                  Para registrar tu ruta usamos tu ubicación solo mientras tienes la app abierta.
                  Actívala en Ajustes.
                </TextV2>
                <Button
                  label="Abrir Ajustes"
                  variant="primary"
                  fullWidth
                  onPress={() => {
                    Linking.openSettings().catch(() => {});
                  }}
                />
              </View>
            ) : (
              <>
                {plan ? (
                  <View style={[styles.planCard, { backgroundColor: colors.surface.muted }]}>
                    <RouteThumb points={plan.points} size={48} radius={12} />
                    <View style={styles.flex}>
                      <TextV2 variant="eyebrow" tone="secondary">
                        RUTA PLANEADA
                      </TextV2>
                      <TextV2 variant="bodyStrong" numberOfLines={1}>
                        {planTitle(plan)}
                      </TextV2>
                      <TextV2 variant="meta" tone="secondary" numberOfLines={1}>
                        {formatKm(plan.distanceM)} km · {formatElevation(plan.elevationGainM)} m · {KIND_LABEL[plan.kind]}
                      </TextV2>
                    </View>
                    <RoundButton
                      icon={X}
                      label="Quitar ruta"
                      onPress={() => routeStore.patch({ plan: null })}
                      style={styles.planX}
                    />
                  </View>
                ) : null}
                <View style={styles.headRow}>
                  <TextV2 variant="eyebrow" tone="secondary">
                    {sportWord}
                  </TextV2>
                  <GpsChip ready={!searching} accuracyM={searching ? undefined : 4} />
                </View>
                <BigFigure value="0,00" unit="km" size={plan ? 80 : 88} />
                <View style={[styles.statLine, { borderTopColor: colors.divider }]}>
                  <View style={styles.statHalf}>
                    <TextV2 style={[styles.statValue, { color: colors.text.disabled }]}>—</TextV2>
                    <TextV2 variant="meta" tone="secondary">
                      {sport === 'running' ? 'Ritmo /km' : 'Velocidad km/h'}
                    </TextV2>
                  </View>
                  <View style={[styles.statHalf, styles.statDivider, { borderLeftColor: colors.divider }]}>
                    <TextV2 style={styles.statValue}>00:00</TextV2>
                    <TextV2 variant="meta" tone="secondary">
                      Tiempo
                    </TextV2>
                  </View>
                </View>
                <View style={styles.chips}>
                  <Chip
                    icon={Pause}
                    label={session.autoPause ? 'Pausa automática' : 'Pausa manual'}
                    onPress={() => routeStore.patch({ autoPause: !session.autoPause })}
                  />
                  <Chip
                    icon={session.hideEndpoints ? EyeOff : Lock}
                    label={`${visibilityLabel(session.visibility)}${session.hideEndpoints ? ' · extremos ocultos' : ''}`}
                    onPress={() => setPrivacyOpen(true)}
                  />
                </View>
                <Button
                  label={searching ? 'Buscando GPS…' : 'Comenzar'}
                  icon={Play}
                  iconPosition="start"
                  variant="commit"
                  fullWidth
                  disabled={searching}
                  onPress={() => {
                    start().catch(() => {});
                  }}
                />
              </>
            )}
          </View>
        ) : (
          <View style={styles.body}>
            <View style={styles.headRow}>
              <TextV2 variant="eyebrow" tone="secondary">
                DISTANCIA OBJETIVO
              </TextV2>
              <PressableScale
                accessibilityRole="button"
                onPress={() => navigation.navigate(APP_ROUTES.RouteSaved)}
                style={styles.savedLink}
              >
                <TextV2 variant="metaStrong">Tus rutas · {savedCount}</TextV2>
                <ChevronRight size={14} color={colors.text.primary} strokeWidth={2.2} />
              </PressableScale>
            </View>
            <BigFigure value={`${km}`} unit="km" size={64} />
            <View style={styles.pills}>
              {pills.map(value => {
                const on = value === km;
                return (
                  <PressableScale
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => routeStore.patch({ config: { ...config, km: value } })}
                    style={[styles.pill, { backgroundColor: on ? colors.cta.primary : colors.surface.muted }]}
                  >
                    <TextV2 variant="bodyStrong" color={on ? colors.cta.primaryText : colors.text.primary}>
                      {value}
                    </TextV2>
                  </PressableScale>
                );
              })}
              <PressableScale
                accessibilityRole="button"
                onPress={() => setOtherOpen(true)}
                style={[styles.pill, styles.pillWide, { backgroundColor: isOther ? colors.cta.primary : colors.surface.muted }]}
              >
                <TextV2 variant="bodyStrong" color={isOther ? colors.cta.primaryText : colors.text.primary}>
                  {isOther ? `${km}` : 'Otra'}
                </TextV2>
              </PressableScale>
            </View>
            <View style={styles.cells}>
              <Cell
                label="Recorrido"
                options={KIND_OPTIONS}
                value={config.kind}
                onPress={() => routeStore.patch({ config: { ...config, kind: next(KIND_OPTIONS, config.kind) } })}
              />
              <Cell
                label="Desnivel"
                options={ELEVATION_OPTIONS}
                value={config.elevation}
                onPress={() =>
                  routeStore.patch({ config: { ...config, elevation: next(ELEVATION_OPTIONS, config.elevation) } })
                }
              />
              <Cell
                label="Superficie"
                options={SURFACE_OPTIONS}
                value={config.surface}
                onPress={() =>
                  routeStore.patch({ config: { ...config, surface: next(SURFACE_OPTIONS, config.surface) } })
                }
              />
            </View>
            <View style={styles.actions}>
              <Button
                label="Crear a mano"
                variant="outline"
                onPress={() => {
                  routeStore.patch({ manualPoints: [], manualSelected: null, manualEditing: false });
                  navigation.navigate(APP_ROUTES.RouteManual);
                }}
                style={styles.actionHalf}
              />
              <EllieActionButton
                label="Generar ruta"
                size="lg"
                onPress={() => {
                  routeStore.patch({ generated: null, generationSeed: 0 });
                  navigation.navigate(APP_ROUTES.RouteGen);
                }}
                style={styles.actionHalf}
              />
            </View>
          </View>
        )}
      </BottomPanel>

      <RoutePrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} preview={privacyPreview} />
      <Sheet
        open={otherOpen}
        onClose={() => setOtherOpen(false)}
        title="Otra distancia"
        footer={<Button label="Listo" onPress={() => setOtherOpen(false)} style={styles.flex} />}
      >
        <View style={styles.stepper}>
          <RoundButton
            icon={Minus}
            label="Menos"
            onPress={() => routeStore.patch({ config: { ...config, km: Math.max(1, km - 1) } })}
          />
          <BigFigure value={`${km}`} unit="km" size={64} />
          <RoundButton
            icon={Plus}
            label="Más"
            onPress={() => routeStore.patch({ config: { ...config, km: Math.min(200, km + 1) } })}
          />
        </View>
      </Sheet>
    </View>
  );
}

function planTitle(plan: PlannedRoute): string {
  return `${KIND_LABEL[plan.kind]} · ${Math.round(plan.distanceM / 1000)}K`;
}

function zoomForKm(km: number): number {
  // The target ring must fit above the panel.
  const radiusM = (km * 1000) / (2 * Math.PI);
  return Math.max(10, Math.min(15, 14.5 - Math.log2(Math.max(radiusM, 150) / 250)));
}

function Cell<T extends string>({
  label,
  options,
  value,
  onPress,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();
  const index = options.findIndex(option => option.key === value);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${options[index]?.label}`}
      onPress={onPress}
      style={[styles.cell, { backgroundColor: colors.surface.muted }]}
    >
      <TextV2 variant="meta" tone="secondary">
        {label}
      </TextV2>
      <TextV2 variant="bodyStrong" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {options[index]?.label}
      </TextV2>
      <View style={styles.dots}>
        {options.map((option, dot) => (
          <View
            key={option.key}
            style={[
              styles.dot,
              { backgroundColor: dot === index ? colors.ember.base : colors.divider },
            ]}
          />
        ))}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offline: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  tabs: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  tab: { flex: 1, gap: 4 },
  tabBar: { height: 2, borderRadius: 1, marginBottom: 6 },
  planCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 10 },
  planX: { width: 32, height: 32, borderRadius: 16, boxShadow: undefined, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  statLine: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  statHalf: { flex: 1, gap: 2 },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 16 },
  statValue: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  savedLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pillWide: { flex: 0, paddingHorizontal: 18 },
  body: { gap: 14 },
  state: { gap: 12, paddingVertical: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', gap: 10 },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cells: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, borderRadius: 16, padding: 12, gap: 2 },
  dots: { flexDirection: 'row', gap: 4, marginTop: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  actions: { flexDirection: 'row', gap: 10 },
  actionHalf: { flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
});

