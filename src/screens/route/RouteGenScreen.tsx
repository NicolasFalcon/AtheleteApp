import { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bookmark, RefreshCw } from 'lucide-react-native';
import { Button, AuraMark, PressableScale, TextV2, useThemeV2, useToast } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { useLocationAccess } from '@app/features/route/useLocationAccess';
import { RouteMap } from '@app/features/route/RouteMap';
import { KIND_LABEL, SURFACE_LABEL, formatElevation, formatKm } from '@app/features/route/routeFormat';
import {
  ORS_ATTRIBUTION,
  canRetryGenerate,
  generateErrorCopy,
  type GenerateRouteError,
} from '@app/features/route/routeMappers';
import { routeText } from '@app/features/route/routeCopy';
import { routeStore, useRouteSession } from '@app/features/route/routeStore';
import { BigFigure, BottomPanel, RoundButton, StatRow, TopPill } from '@app/features/route/v2/RouteUi';
import { DirectionsButton } from '@app/features/route/v2/DirectionsButton';
import { useGeneratedRoute, useInvalidateRoute } from '@app/features/route/useRouteData';
import type { LatLng, PlannedRoute, RouteGenerationParams } from '@app/features/route/routeTypes';
import { RouteServiceError } from '@app/services/route/routeService';
import { useRouteService } from '@app/services/route/useRouteService';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import type { AppScreenProps } from '@app/types/navigation';

// Generar ruta con ELLIE (ROUTE_15–17): "Generando…" (~1,5 s), then up to
// three options of the batch ("Opción 1 · 2 · 3", the first selected) with
// the server's summary. "Otra opción" asks another batch (another seed);
// "Guardar" saves the selected one (save_planned_route); "Usar esta ruta"
// follows it; "Cómo llegar" opens the maps app to its start. The routes come
// from the generate-route Edge Function through the RouteService, starting
// from where the person is. Its errors have their own message, and the
// routing provider's attribution is shown with every generated route.
const ELEVATION_WORD = { low: 'bajo', balanced: 'medio', any: 'libre' } as const;

export function RouteGenScreen({ navigation }: AppScreenProps<'RouteGen'>) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const language = useProfileLanguage();
  const service = useRouteService();
  const invalidate = useInvalidateRoute();
  const session = useRouteSession();
  const { access, fix, usable } = useLocationAccess();
  const [seed, setSeed] = useState(session.generationSeed);
  const [mapFailed, setMapFailed] = useState(false);
  // generate-route needs where the person is (the shared location: the
  // last known one is enough). The first origin is kept: the person moving a
  // few metres does not ask for another route.
  const here = fix ? { lat: fix.lat, lon: fix.lon } : null;
  const live = usable ? (here ?? session.origin) : null;
  const [origin, setOrigin] = useState<LatLng | null>(live);
  useEffect(() => {
    if (!origin && live) {
      setOrigin(live);
    }
  }, [live, origin]);
  const noLocation = access !== null && !usable;

  // React Query by rounded origin + parameters (B-13): coming back, or
  // going back to an earlier option, does not call generate-route again.
  const params: RouteGenerationParams | null = useMemo(
    () =>
      origin
        ? {
            sport: session.sport,
            origin,
            targetKm: session.config.km,
            kind: session.config.kind,
            elevation: session.config.elevation,
            surface: session.config.surface,
            seed,
          }
        : null,
    [origin, seed, session.config, session.sport],
  );
  const generated = useGeneratedRoute(params);
  const options = generated.data;
  // A new batch starts on its first (best scored) option.
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    setSelected(0);
  }, [options]);
  // Options saved to Tus rutas in this visit (option id → saved route).
  const [saved, setSaved] = useState<Record<string, PlannedRoute>>({});
  const [saving, setSaving] = useState(false);
  const option = options?.[Math.min(selected, options.length - 1)] ?? null;
  const plan = option ? (saved[option.id] ?? option) : null;
  const loading = !origin || generated.isFetching;
  const failed: GenerateRouteError | null = generated.error
    ? generated.error instanceof RouteServiceError
      ? (generated.error.code as GenerateRouteError)
      : 'unknown'
    : null;
  const generate = (nextSeed: number) => {
    if (nextSeed === seed) {
      generated.refetch().catch(() => undefined);
    } else {
      setSeed(nextSeed);
    }
  };
  useEffect(() => {
    if (plan) {
      routeStore.patch({ generated: plan, generationSeed: seed });
    }
  }, [plan, seed]);

  const save = () => {
    if (!option || saved[option.id] || saving) {
      return;
    }
    const sent = option;
    setSaving(true);
    service
      .saveRoute(sent)
      .then(next => {
        setSaved(current => ({ ...current, [sent.id]: { ...next, summary: sent.summary } }));
        invalidate();
        toast.show(routeText(language, 'route.save.done'));
      })
      .catch(error =>
        toast.show(
          routeText(
            language,
            error instanceof RouteServiceError && error.code === 'limit_reached'
              ? 'route.save.limit'
              : 'route.save.failed',
          ),
        ),
      )
      .finally(() => setSaving(false));
  };

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
        center={origin ?? undefined}
        zoom={14}
        fit={plan && !loading ? plan.points : undefined}
        padding={{ top: insets.top + 80, bottom: 470, left: 40, right: 40 }}
        route={plan && !loading ? plan.points : undefined}
        here={plan && !loading ? undefined : origin}
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
        {noLocation ? (
          <View style={styles.loading}>
            <TextV2 variant="title22" style={styles.center}>
              Ubicación no disponible
            </TextV2>
            <TextV2 variant="body" tone="secondary" style={styles.center}>
              Para generar una ruta cerca de ti necesitamos tu ubicación precisa. Actívala en Ajustes.
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
        ) : loading && !origin ? (
          <View style={styles.loading}>
            <AuraMark size={64} />
            <TextV2 variant="title22">Buscando tu ubicación…</TextV2>
          </View>
        ) : loading ? (
          <View style={styles.loading}>
            <AuraMark size={64} />
            <TextV2 variant="title22">Generando tu ruta…</TextV2>
            <TextV2 variant="body" tone="secondary" style={styles.center}>
              ELLIE busca un recorrido de {session.config.km} km cerca de ti.
            </TextV2>
          </View>
        ) : failed || !plan ? (
          <View style={styles.loading}>
            <TextV2 variant="title22" style={styles.center}>
              No pudimos generar la ruta
            </TextV2>
            <TextV2 variant="body" tone="secondary" style={styles.center}>
              {generateErrorCopy(failed ?? 'unknown')}
            </TextV2>
            {!failed || canRetryGenerate(failed) ? (
              <Button label="Reintentar" variant="primary" fullWidth onPress={() => generate(seed)} />
            ) : (
              <Button label="Cambiar configuración" variant="primary" fullWidth onPress={() => navigation.goBack()} />
            )}
          </View>
        ) : (
          <View style={styles.body}>
            <View style={styles.headRow}>
              {options && options.length > 1 ? (
                <View style={styles.options} accessibilityRole="tablist">
                  {options.map((item, index) => {
                    const on = item.id === option?.id;
                    return (
                      <PressableScale
                        key={item.id}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: on }}
                        onPress={() => setSelected(index)}
                        style={[
                          styles.option,
                          { backgroundColor: on ? colors.cta.primary : colors.surface.muted },
                        ]}
                      >
                        <TextV2 variant="metaStrong" color={on ? colors.cta.primaryText : colors.text.primary}>
                          {routeText(language, 'route.gen.option', { n: index + 1 })}
                        </TextV2>
                      </PressableScale>
                    );
                  })}
                </View>
              ) : (
                <TextV2 variant="eyebrow" tone="secondary">
                  {routeText(language, 'route.gen.option', { n: 1 }).toUpperCase()}
                </TextV2>
              )}
              <TextV2 variant="meta" tone="secondary">
                {KIND_LABEL[plan.kind]}
              </TextV2>
            </View>
            <BigFigure value={formatKm(plan.distanceM)} unit="km" size={72} />
            <StatRow
              valueSize={22}
              items={[
                { value: formatElevation(plan.elevationGainM), unit: 'm', label: 'Desnivel' },
                { value: KIND_LABEL[plan.kind], label: 'Tipo' },
                { value: SURFACE_LABEL[plan.surface], label: 'Superficie' },
              ]}
            />
            {plan.summary ? (
              <TextV2 variant="body" tone="secondary">
                {plan.summary}
              </TextV2>
            ) : (
              <TextV2 variant="meta" tone="secondary">
                Desnivel {ELEVATION_WORD[session.config.elevation]}
              </TextV2>
            )}
            <TextV2 variant="caption" tone="secondary">
              {ORS_ATTRIBUTION}
            </TextV2>
            <View style={styles.actions}>
              <Button
                label={routeText(language, 'route.gen.another')}
                icon={RefreshCw}
                iconPosition="start"
                variant="outline"
                style={styles.half}
                onPress={() => generate(seed + 1)}
              />
              <Button
                label={routeText(language, option && saved[option.id] ? 'route.saved' : 'route.save')}
                icon={Bookmark}
                iconPosition="start"
                variant="secondary"
                disabled={Boolean(option && saved[option.id]) || saving}
                style={styles.half}
                onPress={save}
              />
            </View>
            <Button label={routeText(language, 'route.gen.use')} variant="primary" fullWidth onPress={use} />
            <DirectionsButton points={plan.points} sport={plan.sport} here={here} />
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
  body: { gap: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  options: { flexDirection: 'row', gap: 6 },
  option: { height: 32, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
