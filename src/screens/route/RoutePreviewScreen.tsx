import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bookmark } from 'lucide-react-native';
import { Button, TextV2, useThemeV2, useToast } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { RouteMap } from '@app/features/route/RouteMap';
import { badgeText, exploreMetaText, routeText } from '@app/features/route/routeCopy';
import { useLocationAccess } from '@app/features/route/useLocationAccess';
import { DirectionsButton } from '@app/features/route/v2/DirectionsButton';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { KIND_LABEL, SURFACE_LABEL, formatElevation, formatKm } from '@app/features/route/routeFormat';
import { routeStore, useRouteSession } from '@app/features/route/routeStore';
import { BigFigure, BottomPanel, RoundButton, StatRow } from '@app/features/route/v2/RouteUi';
import { ORS_ATTRIBUTION, OSM_ATTRIBUTION, exploreKey, isSavedRoute } from '@app/features/route/routeMappers';
import { RouteServiceError } from '@app/services/route/routeService';
import { useInvalidateRoute, usePlannedRoutes } from '@app/features/route/useRouteData';
import { useRouteService } from '@app/services/route/useRouteService';
import type { AppScreenProps } from '@app/types/navigation';

// Vista previa de una ruta (ROUTE_20): "Usar esta ruta", "Guardar" (to Tus
// rutas) and "Cómo llegar" (maps app to its start). Opened from Tus rutas and
// from Explorar: an Explorar route shows its badge and meta, saves with
// origin 'explore' (+ source/ref) and is "Guardada" when Tus rutas already has
// the same source + ref.
export function RoutePreviewScreen({ navigation }: AppScreenProps<'RoutePreview'>) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useRouteService();
  const invalidate = useInvalidateRoute();
  const language = useProfileLanguage();
  const { fix, usable } = useLocationAccess();
  const here = usable && fix ? { lat: fix.lat, lon: fix.lon } : null;
  const { draft, exploring } = useRouteSession();
  const [saved, setSaved] = useState(false);
  const planned = usePlannedRoutes();
  const key = draft ? exploreKey(draft) : null;
  // The same Explorar route already in Tus rutas (saved another day).
  const savedMatch = useMemo(
    () => (key ? ((planned.data ?? []).find(route => exploreKey(route) === key) ?? null) : null),
    [key, planned.data],
  );
  const meta = exploring && key && exploreKey(exploring.route) === key ? exploring : null;

  useEffect(() => {
    setSaved(Boolean(draft && (isSavedRoute(draft.id) || savedMatch)));
  }, [draft, savedMatch]);

  if (!draft) {
    return <View style={[styles.screen, { backgroundColor: colors.bg }]} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <RouteMap
        style={StyleSheet.absoluteFill}
        fit={draft.points}
        padding={{ top: insets.top + 80, bottom: 420, left: 40, right: 40 }}
        route={draft.points}
        endpoints
      />
      <View style={[styles.top, { top: insets.top + 8 }]}>
        <RoundButton icon={ArrowLeft} label={routeText(language, 'route.back')} onPress={() => navigation.goBack()} />
      </View>
      <BottomPanel style={{ paddingBottom: Math.max(insets.bottom, 16) + 4 }}>
        <View style={styles.body}>
          <View>
            <TextV2 variant="eyebrow" tone="secondary">
              {draft.sport === 'running' ? 'RUNNING' : 'CYCLING'} ·{' '}
              {meta ? badgeText(language, meta.badge).toUpperCase() : 'RUTA PLANEADA'}
            </TextV2>
            <TextV2 variant="title22" numberOfLines={2}>
              {draft.origin === 'explore'
                ? draft.name
                : `${KIND_LABEL[draft.kind]} · ${Math.round(draft.distanceM / 1000)}K`}
            </TextV2>
            {meta ? (
              <TextV2 variant="meta" tone="secondary">
                {exploreMetaText(language, meta, m => formatKm(m, 1))}
              </TextV2>
            ) : null}
          </View>
          <BigFigure value={formatKm(draft.distanceM)} unit="km" size={88} />
          <StatRow
            valueSize={22}
            items={[
              meta && meta.elevationGainM === null
                ? { value: '—', label: 'Desnivel' }
                : { value: formatElevation(draft.elevationGainM), unit: 'm', label: 'Desnivel' },
              { value: KIND_LABEL[draft.kind], label: 'Tipo' },
              { value: SURFACE_LABEL[draft.surface], label: 'Superficie' },
            ]}
          />
          {draft.origin === 'ellie' || draft.exploreSource === 'osm' ? (
            <TextV2 variant="caption" tone="secondary">
              {draft.origin === 'ellie' ? ORS_ATTRIBUTION : OSM_ATTRIBUTION}
            </TextV2>
          ) : null}
          <Button
            label={routeText(language, 'route.gen.use')}
            variant="primary"
            fullWidth
            onPress={() => {
              // The saved copy when there is one (the outing links to it).
              routeStore.patch({ plan: savedMatch ?? draft, mode: 'now' });
              navigation.popTo(APP_ROUTES.RoutePrep);
            }}
          />
          <View style={styles.actions}>
            <Button
              label={routeText(language, saved ? 'route.saved' : 'route.save')}
              icon={Bookmark}
              iconPosition="start"
              variant="secondary"
              disabled={saved}
              style={styles.flex}
              onPress={() => {
                service
                  .saveRoute(draft)
                  .then(next => {
                    routeStore.patch({ draft: next });
                    invalidate();
                    setSaved(true);
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
                  );
              }}
            />
          </View>
          <DirectionsButton points={draft.points} sport={draft.sport} here={here} />
        </View>
      </BottomPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { position: 'absolute', left: 16 },
  body: { gap: 14 },
  actions: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
