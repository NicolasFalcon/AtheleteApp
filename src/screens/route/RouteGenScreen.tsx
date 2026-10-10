import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { Button, LivingHalo, TextV2, useThemeV2 } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { getRouteDevConfig } from '@app/dev/routeDevConfig';
import { PLAN_A, PLAN_B, SAMPLE_ORIGIN } from '@app/dev/routeFixtures';
import { RouteMap } from '@app/features/route/RouteMap';
import { KIND_LABEL, SURFACE_LABEL, formatElevation, formatKm } from '@app/features/route/routeFormat';
import { routeStore, useRouteSession } from '@app/features/route/routeStore';
import { BigFigure, BottomPanel, RoundButton, StatRow, TopPill } from '@app/features/route/v2/RouteUi';
import { useRouteService } from '@app/services/route/useRouteService';
import type { AppScreenProps } from '@app/types/navigation';

// Generar ruta con ELLIE (ROUTE_15–17): "Generando…" (~1,5 s), then "Opción N"
// with "Otra opción" / "Usar esta ruta". The routes come from the RouteService
// (samples in 5a). TODO(route-wire): real generation (ELLIE + routing engine).
const ELEVATION_WORD = { low: 'bajo', balanced: 'medio', any: 'libre' } as const;

export function RouteGenScreen({ navigation, route }: AppScreenProps<'RouteGen'>) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const service = useRouteService();
  const session = useRouteSession();
  const dev = __DEV__ ? route?.params?.dev : undefined;
  const [seed, setSeed] = useState(dev === 'alt' ? 1 : 0);
  const [loading, setLoading] = useState(dev !== 'result' && dev !== 'alt');
  const [failed, setFailed] = useState(false);
  const [mapFailed, setMapFailed] = useState(getRouteDevConfig().mapOffline);
  const plan = session.generated;

  const generate = useCallback(
    async (nextSeed: number) => {
      setLoading(true);
      setFailed(false);
      try {
        const result = await service.generateRoute({
          sport: session.sport,
          origin: SAMPLE_ORIGIN,
          targetKm: session.config.km,
          kind: session.config.kind,
          elevation: session.config.elevation,
          surface: session.config.surface,
          seed: nextSeed,
        });
        routeStore.patch({ generated: result, generationSeed: nextSeed });
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [service, session.sport, session.config],
  );

  useEffect(() => {
    if (dev === 'result' || dev === 'alt') {
      routeStore.patch({ generated: dev === 'alt' ? PLAN_B : PLAN_A, generationSeed: dev === 'alt' ? 1 : 0 });
      return;
    }
    if (dev === 'generating') {
      return; // stays on the loading state for the capture
    }
    generate(0).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const use = () => {
    if (!plan) {
      return;
    }
    routeStore.patch({ plan, draft: plan, mode: 'now' });
    navigation.popTo(APP_ROUTES.RoutePrep);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <RouteMap
        style={StyleSheet.absoluteFill}
        center={SAMPLE_ORIGIN}
        zoom={14}
        fit={plan && !loading ? plan.points : undefined}
        padding={{ top: insets.top + 80, bottom: 380, left: 40, right: 40 }}
        route={plan && !loading ? plan.points : undefined}
        here={plan && !loading ? undefined : SAMPLE_ORIGIN}
        endpoints={Boolean(plan) && !loading}
        dim={loading ? 0.6 : 1}
        onLoadFailed={() => setMapFailed(true)}
      />
      <View style={[styles.top, { top: insets.top + 8 }]}>
        <RoundButton icon={ArrowLeft} label="Atrás" onPress={() => navigation.goBack()} />
        <TopPill label={loading ? 'Generando ruta' : 'Ruta generada'} />
        <View style={styles.spacer} />
      </View>
      {mapFailed ? (
        <View style={[styles.offline, { top: insets.top + 72, backgroundColor: colors.surface.raised }]}>
          <TextV2 variant="metaStrong">Sin conexión · no se pudo cargar el mapa</TextV2>
        </View>
      ) : null}

      <BottomPanel style={{ paddingBottom: Math.max(insets.bottom, 16) + 4 }}>
        {loading ? (
          <View style={styles.loading}>
            <LivingHalo size={64} />
            <TextV2 variant="title22">Generando tu ruta…</TextV2>
            <TextV2 variant="body" tone="secondary" style={styles.center}>
              ELLIE busca un recorrido de {session.config.km} km cerca de ti.
            </TextV2>
          </View>
        ) : failed || !plan ? (
          <View style={styles.loading}>
            <TextV2 variant="title22">No pudimos generar la ruta</TextV2>
            <Button label="Reintentar" variant="primary" fullWidth onPress={() => generate(seed).catch(() => {})} />
          </View>
        ) : (
          <View style={styles.body}>
            <View style={styles.headRow}>
              <TextV2 variant="eyebrow" tone="secondary">
                OPCIÓN {seed + 1}
              </TextV2>
              <TextV2 variant="meta" tone="secondary">
                {KIND_LABEL[plan.kind]} · desnivel {ELEVATION_WORD[session.config.elevation]}
              </TextV2>
            </View>
            <BigFigure value={formatKm(plan.distanceM)} unit="km" size={80} />
            <StatRow
              valueSize={22}
              items={[
                { value: formatElevation(plan.elevationGainM), unit: 'm', label: 'Desnivel' },
                { value: KIND_LABEL[plan.kind], label: 'Tipo' },
                { value: SURFACE_LABEL[plan.surface], label: 'Superficie' },
              ]}
            />
            <View style={styles.actions}>
              <Button
                label="Otra opción"
                icon={RefreshCw}
                iconPosition="start"
                variant="outline"
                style={styles.half}
                onPress={() => {
                  const nextSeed = seed + 1;
                  setSeed(nextSeed);
                  generate(nextSeed).catch(() => {});
                }}
              />
              <Button label="Usar esta ruta" variant="primary" style={styles.half} onPress={use} />
            </View>
          </View>
        )}
      </BottomPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spacer: { width: 44 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  offline: { position: 'absolute', alignSelf: 'center', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 },
  loading: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  center: { textAlign: 'center' },
  body: { gap: 14 },
  actions: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
