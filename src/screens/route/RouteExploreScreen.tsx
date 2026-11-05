import { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { AuraMark, Button, PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { RouteMap } from '@app/features/route/RouteMap';
import { badgeText, exploreMetaText, routeText, type RouteCopyKey } from '@app/features/route/routeCopy';
import { formatKm } from '@app/features/route/routeFormat';
import { exploreKey, type ExploreRouteError } from '@app/features/route/routeMappers';
import { routeStore, useRouteSession } from '@app/features/route/routeStore';
import type { ExploreParams, ExploreRoute, LatLng } from '@app/features/route/routeTypes';
import { useLocationAccess } from '@app/features/route/useLocationAccess';
import { useExploreRoutes, usePlannedRoutes } from '@app/features/route/useRouteData';
import { RoundButton, TopPill } from '@app/features/route/v2/RouteUi';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { RouteServiceError } from '@app/services/route/routeService';
import type { AppScreenProps } from '@app/types/navigation';

// Explorar (Ruta · fase 2): known (OpenStreetMap) and popular (community)
// routes within 10 km, from explore-routes, for the sport chosen in Ruta.
// The map on top draws them all (the selected one in Ember, the rest grey);
// the list below filters by distance on the phone (one call per place: the
// daily quota is small). Tapping a route opens its preview (Cómo llegar,
// Usar esta ruta, Guardar).
const RADIUS_KM = 10;

type DistanceFilter = 'all' | 'lt5' | '5to10' | '10to20' | '20plus';
const FILTERS: DistanceFilter[] = ['all', 'lt5', '5to10', '10to20', '20plus'];

function inFilter(filter: DistanceFilter, distanceM: number): boolean {
  const km = distanceM / 1000;
  switch (filter) {
    case 'lt5':
      return km < 5;
    case '5to10':
      return km >= 5 && km < 10;
    case '10to20':
      return km >= 10 && km < 20;
    case '20plus':
      return km >= 20;
    default:
      return true;
  }
}

const ERROR_KEY: Record<ExploreRouteError, RouteCopyKey> = {
  network: 'route.explore.error.network',
  provider_unavailable: 'route.explore.error.provider',
  rate_limited: 'route.explore.error.quota',
  unauthorized: 'route.explore.error.unauthorized',
  invalid_params: 'route.explore.error.unknown',
  unknown: 'route.explore.error.unknown',
};

// Only a hiccup is worth a retry (not the quota or the session).
const canRetry = (error: ExploreRouteError) =>
  error === 'network' || error === 'provider_unavailable' || error === 'unknown';

const km = (m: number) => formatKm(m, 1);

export function RouteExploreScreen({ navigation }: AppScreenProps<'RouteExplore'>) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const language = useProfileLanguage();
  const session = useRouteSession();
  const { access, fix, usable } = useLocationAccess();
  const noLocation = access !== null && !usable;

  // The first known position is kept: walking a few metres does not search
  // again.
  const live = usable ? (fix ? { lat: fix.lat, lon: fix.lon } : session.origin) : null;
  const [origin, setOrigin] = useState<LatLng | null>(live);
  useEffect(() => {
    if (!origin && live) {
      setOrigin(live);
    }
  }, [live, origin]);

  const params: ExploreParams | null = useMemo(
    () => (origin ? { sport: session.sport, origin, radiusKm: RADIUS_KM } : null),
    [origin, session.sport],
  );
  const explore = useExploreRoutes(params);
  const result = explore.data ?? null;
  const failed: ExploreRouteError | null = explore.error
    ? explore.error instanceof RouteServiceError
      ? (explore.error.code as ExploreRouteError)
      : 'unknown'
    : null;
  const loading = !noLocation && (!origin || explore.isFetching);

  const [filter, setFilter] = useState<DistanceFilter>('all');
  const visible = useMemo(
    () => (result?.routes ?? []).filter(item => inFilter(filter, item.route.distanceM)),
    [filter, result],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = visible.find(item => item.route.id === selectedId) ?? visible[0] ?? null;
  const others = useMemo(
    () => visible.filter(item => item !== selected).map(item => item.route.points),
    [selected, visible],
  );

  const saved = usePlannedRoutes();
  const savedKeys = useMemo(
    () => new Set((saved.data ?? []).map(exploreKey).filter((key): key is string => key !== null)),
    [saved.data],
  );

  const open = (item: ExploreRoute) => {
    setSelectedId(item.route.id);
    routeStore.patch({ draft: item.route, exploring: item });
    navigation.navigate(APP_ROUTES.RoutePreview);
  };

  const mapHeight = Math.round(height * 0.42);
  const fit = selected ? (origin ? [...selected.route.points, origin] : selected.route.points) : undefined;

  const message = (title: string, body: string, action?: { label: string; onPress: () => void }) => (
    <View style={styles.state}>
      <TextV2 variant="title22" style={styles.center}>
        {title}
      </TextV2>
      <TextV2 variant="body" tone="secondary" style={styles.center}>
        {body}
      </TextV2>
      {action ? <Button label={action.label} variant="primary" fullWidth onPress={action.onPress} /> : null}
    </View>
  );

  let content: React.ReactNode;
  if (noLocation) {
    content = message(
      routeText(language, 'route.explore.noLocation.title'),
      routeText(language, 'route.explore.noLocation.body'),
      {
        label: routeText(language, 'route.explore.noLocation.cta'),
        onPress: () => {
          Linking.openSettings().catch(() => {});
        },
      },
    );
  } else if (loading) {
    content = (
      <View style={styles.state}>
        <AuraMark size={56} />
        <TextV2 variant="title22">
          {routeText(language, origin ? 'route.explore.loading' : 'route.explore.locating')}
        </TextV2>
      </View>
    );
  } else if (failed || !result) {
    const error = failed ?? 'unknown';
    content = message(
      routeText(language, 'route.explore.error.title'),
      routeText(language, ERROR_KEY[error]),
      canRetry(error)
        ? { label: routeText(language, 'route.explore.retry'), onPress: () => explore.refetch().catch(() => undefined) }
        : error === 'rate_limited'
          ? { label: routeText(language, 'route.explore.empty.cta'), onPress: () => planInstead() }
          : undefined,
    );
  } else if (result.routes.length === 0) {
    content = message(
      routeText(language, 'route.explore.empty.title'),
      routeText(language, 'route.explore.empty.body'),
      { label: routeText(language, 'route.explore.empty.cta'), onPress: () => planInstead() },
    );
  } else {
    content = (
      <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map(key => {
            const on = key === filter;
            return (
              <PressableScale
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setFilter(key)}
                style={[styles.filter, { backgroundColor: on ? colors.cta.primary : colors.surface.muted }]}
              >
                <TextV2 variant="metaStrong" color={on ? colors.cta.primaryText : colors.text.primary}>
                  {routeText(language, `route.explore.filter.${key}`)}
                </TextV2>
              </PressableScale>
            );
          })}
        </ScrollView>
        {result.osmUnavailable ? (
          <TextV2 variant="meta" tone="secondary">
            {routeText(language, 'route.explore.osmDown')}
          </TextV2>
        ) : null}
        <TextV2 variant="eyebrow" tone="secondary">
          {routeText(
            language,
            visible.length === 1 ? 'route.explore.count.one' : 'route.explore.count.other',
            { n: visible.length },
          ).toUpperCase()}
        </TextV2>
        {visible.length === 0 ? (
          <TextV2 variant="body" tone="secondary">
            {routeText(language, 'route.explore.filter.empty')}
          </TextV2>
        ) : (
          visible.map(item => {
            const on = item === selected;
            const key = exploreKey(item.route);
            const isSaved = key !== null && savedKeys.has(key);
            return (
              <PressableScale
                key={item.route.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => open(item)}
                style={[styles.row, { borderTopColor: colors.divider }]}
              >
                <View style={[styles.rowMark, { backgroundColor: on ? colors.ember.strong : colors.divider }]} />
                <View style={styles.rowText}>
                  <View style={styles.rowHead}>
                    <TextV2 variant="bodyStrong" numberOfLines={1} style={styles.rowName}>
                      {item.route.name}
                    </TextV2>
                    <View style={[styles.badge, { backgroundColor: colors.surface.muted }]}>
                      <TextV2 variant="caption">{badgeText(language, item.badge)}</TextV2>
                    </View>
                  </View>
                  <TextV2 variant="meta" tone="secondary" numberOfLines={2}>
                    {exploreMetaText(language, item, km)}
                    {isSaved ? ` · ${routeText(language, 'route.saved')}` : ''}
                  </TextV2>
                </View>
                <ChevronRight size={18} color={colors.text.secondary} strokeWidth={2} />
              </PressableScale>
            );
          })
        )}
        {result.attribution ? (
          <TextV2 variant="caption" tone="secondary" style={styles.attribution}>
            {result.attribution}
          </TextV2>
        ) : null}
      </>
    );
  }

  function planInstead() {
    routeStore.patch({ mode: 'plan' });
    navigation.popTo(APP_ROUTES.RoutePrep);
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={{ height: mapHeight }}>
        <RouteMap
          style={StyleSheet.absoluteFill}
          center={origin ?? undefined}
          zoom={13}
          fit={fit}
          padding={{ top: insets.top + 72, bottom: 28, left: 32, right: 32 }}
          route={selected?.route.points}
          others={others}
          here={origin}
          endpoints={Boolean(selected)}
          dim={loading ? 0.6 : 1}
        />
        <View style={[styles.top, { top: insets.top + 8 }]}>
          <RoundButton icon={ArrowLeft} label={routeText(language, 'route.back')} onPress={() => navigation.goBack()} />
          <TopPill label={routeText(language, 'route.explore.title')} />
          <View style={styles.spacer} />
        </View>
      </View>
      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spacer: { width: 44 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  filters: { gap: 8 },
  filter: { height: 36, paddingHorizontal: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  state: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1 },
  rowMark: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  rowText: { flex: 1, gap: 4 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { flexShrink: 1 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  attribution: { marginTop: 4 },
});
