import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Share2, Users, X } from 'lucide-react-native';
import {
  Button,
  LivingHalo,
  PressableScale,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { RouteMap } from '@app/features/route/RouteMap';
import {
  formatDuration,
  formatElevation,
  formatKm,
  formatPace,
  formatSpeed,
} from '@app/features/route/routeFormat';
import { PRIVACY_TRIM_M, paceSecPerKm, speedKmh, trimEnds } from '@app/features/route/routeGeo';
import { routeStore, useRouteSession } from '@app/features/route/routeStore';
import { hiddenEnds } from '@app/features/route/routeSummary';
import type { RouteActivity } from '@app/features/route/routeTypes';
import { BigFigure, RoundButton, StatRow } from '@app/features/route/v2/RouteUi';
import { RoutePrivacySheet, visibilityLabel } from '@app/features/route/v2/RoutePrivacySheet';
import { useRouteService } from '@app/services/route/useRouteService';
import type { AppScreenProps } from '@app/types/navigation';

// Resultado (ROUTE_10–12): the map with the trail, the metrics, the splits, a
// new best if any, ELLIE's line, and share / post. The owner sees the whole
// track (the 200 m hidden from others dotted grey); a viewer already receives
// the trimmed one. A Route counts as a workout (ring, streak, km for
// challenges) on the server. TODO(route-wire): `route` post in Comunidad
// (Fase 3 composition) and the external share sheet.
function hhmm(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function dayLabel(ms: number): string {
  return new Date(ms).toDateString() === new Date().toDateString() ? 'HOY' : 'AYER';
}

export function RouteResultScreen({ navigation, route }: AppScreenProps<'RouteResult'>) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useRouteService();
  const session = useRouteSession();
  const viewer = Boolean(route?.params?.viewer);
  const activityId = route?.params?.activityId;
  const [activity, setActivity] = useState<RouteActivity | null>(
    session.finished && (!activityId || session.finished.id === activityId) ? session.finished : null,
  );
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (activity || !activityId) {
      return;
    }
    service
      .getActivity(activityId)
      .then(setActivity)
      .catch(() => {});
  }, [activity, activityId, service]);

  const shown = useMemo(() => {
    if (!activity) {
      return null;
    }
    // The viewer only gets the trimmed track.
    const visible =
      viewer || activity.hideEndpoints ? trimEnds(activity.points, PRIVACY_TRIM_M) : activity.points;
    return {
      line: viewer ? visible : activity.points,
      hidden: !viewer && activity.hideEndpoints ? hiddenEnds(activity.points, PRIVACY_TRIM_M) : [],
    };
  }, [activity, viewer]);

  if (!activity || !shown) {
    return <View style={[styles.screen, { backgroundColor: colors.bg }]} />;
  }

  const running = activity.sport === 'running';
  const planned = Boolean(activity.plannedRouteId);
  const ofPlan = planned ? (session.plan ? `Ruta planeada · ${session.plan.name}` : 'Ruta planeada') : null;

  // The plan followed belongs to that outing, not to the next one.
  const done = () => {
    routeStore.patch({ plan: null, generated: null, draft: null, mode: 'now' });
    navigation.popToTop();
  };

  const post = () => {
    setPosting(true);
    service
      .shareToCommunity(activity.id)
      .then(() => {
        routeStore.patch({ posted: true });
        toast.show('Publicada en Comunidad');
      })
      .catch(() => toast.show('No pudimos publicar. Inténtalo de nuevo.'))
      .finally(() => setPosting(false));
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + (viewer ? 40 : 200) }}>
        <View style={styles.map}>
          <RouteMap
            style={StyleSheet.absoluteFill}
            fit={shown.line}
            padding={{ top: insets.top + 70, bottom: 40, left: 40, right: 40 }}
            route={shown.line}
            plan={planned ? session.plan?.points : undefined}
            hiddenParts={shown.hidden.length ? shown.hidden : undefined}
            endpoints
            interactive={false}
          />
        </View>
        <View style={styles.body}>
          {viewer ? (
            <TextV2 variant="bodyStrong">
              Carlos{' '}
              <TextV2 variant="meta" tone="secondary">
                {running ? 'Running' : 'Ciclismo'} · hace 3 h
              </TextV2>
            </TextV2>
          ) : null}
          <View>
            <TextV2 variant="eyebrow" tone="secondary">
              {`${dayLabel(activity.startedAt)} · ${hhmm(activity.startedAt)}`}
            </TextV2>
            <TextV2 variant="title22">{activity.title}</TextV2>
            {ofPlan ? (
              <TextV2 variant="meta" tone="secondary">
                {ofPlan}
              </TextV2>
            ) : null}
          </View>
          <BigFigure value={formatKm(activity.distanceM)} unit="km" size={88} />
          <StatRow
            items={[
              { value: formatDuration(activity.movingSec), label: 'Tiempo' },
              running
                ? { value: formatPace(paceSecPerKm(activity.distanceM, activity.movingSec)), unit: '/km', label: 'Ritmo' }
                : { value: formatSpeed(speedKmh(activity.distanceM, activity.movingSec)), unit: 'km/h', label: 'Velocidad' },
              { value: formatElevation(activity.elevationGainM), unit: 'm', label: 'Desnivel' },
            ]}
          />
          {activity.avgHr !== null || activity.calories !== null ? (
            <StatRow
              valueSize={22}
              items={[
                ...(activity.avgHr !== null ? [{ value: `${activity.avgHr}`, unit: 'lpm', label: 'Pulso medio' }] : []),
                ...(activity.calories !== null ? [{ value: `${activity.calories}`, unit: 'kcal', label: 'Calorías' }] : []),
              ]}
            />
          ) : null}

          {activity.newBest && !viewer ? (
            <View style={[styles.best, { backgroundColor: colors.surface.muted }]}>
              <TextV2 variant="eyebrow" color={colors.ember.strong}>
                NUEVO RÉCORD
              </TextV2>
              <View style={styles.bestRow}>
                <TextV2 style={styles.bestValue}>{activity.newBest.title}</TextV2>
                <TextV2 variant="bodyStrong" tone="secondary">
                  {activity.newBest.unit}
                </TextV2>
              </View>
              <TextV2 variant="meta" tone="secondary">
                {activity.newBest.detail}
              </TextV2>
            </View>
          ) : null}

          {activity.splits.length ? (
            <View style={styles.splits}>
              <TextV2 variant="eyebrow" tone="secondary">
                {running ? 'PARCIALES · KM' : 'PARCIALES · CADA 10 KM'}
              </TextV2>
              {activity.splits.map(split => (
                <View key={split.label} style={styles.splitRow}>
                  <TextV2 variant="metaStrong" tone="secondary" style={styles.splitLabel}>
                    {split.label}
                  </TextV2>
                  <View style={[styles.splitTrack, { backgroundColor: colors.surface.muted }]}>
                    <View
                      style={[
                        styles.splitFill,
                        {
                          width: `${split.fill}%`,
                          backgroundColor: split.best ? colors.ember.base : colors.text.disabled,
                        },
                      ]}
                    />
                  </View>
                  <TextV2 variant="metaStrong" style={styles.splitValue}>
                    {split.value}
                  </TextV2>
                </View>
              ))}
            </View>
          ) : null}

          {activity.ellieLine && !viewer ? (
            <View style={styles.ellie}>
              <LivingHalo size={28} />
              <TextV2 variant="body" style={styles.flex}>
                {activity.ellieLine}
              </TextV2>
            </View>
          ) : null}

          {!viewer ? (
            <>
              <PressableScale
                accessibilityRole="button"
                onPress={() => setPrivacyOpen(true)}
                style={[styles.privacy, { backgroundColor: colors.surface.muted }]}
              >
                <TextV2 variant="body" style={styles.flex}>
                  Visible para: {visibilityLabel(activity.visibility === session.visibility ? session.visibility : activity.visibility)}
                  {activity.hideEndpoints ? ' · inicio y final ocultos' : ''}
                </TextV2>
                <TextV2 variant="metaStrong" color={colors.ember.strong}>
                  Cambiar
                </TextV2>
              </PressableScale>
            </>
          ) : null}
        </View>
      </ScrollView>
      {!viewer ? (
        <View style={[styles.footer, { backgroundColor: colors.bg, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Button
            label={session.posted ? 'Compartida en Comunidad' : 'Compartir en Comunidad'}
            icon={Users}
            iconPosition="start"
            variant="primary"
            fullWidth
            disabled={session.posted || posting || activity.visibility === 'me'}
            onPress={post}
          />
          <View style={styles.footerRow}>
            <Button
              label="Compartir"
              icon={Share2}
              iconPosition="start"
              variant="secondary"
              style={styles.flex}
              onPress={() => navigation.navigate(APP_ROUTES.RouteShare, { activityId: activity.id })}
            />
            <Button label="Listo" variant="outline" style={styles.flex} onPress={done} />
          </View>
        </View>
      ) : null}
      <View style={[styles.top, { top: insets.top + 8 }]}>
        <RoundButton icon={X} label="Cerrar" onPress={() => (viewer ? navigation.goBack() : done())} />
        {!viewer ? (
          <RoundButton
            icon={Share2}
            label="Compartir"
            onPress={() => navigation.navigate(APP_ROUTES.RouteShare, { activityId: activity.id })}
          />
        ) : null}
      </View>
      <RoutePrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} preview={activity.points} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { height: 460 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  footerRow: { flexDirection: 'row', gap: 8 },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  body: { padding: 20, gap: 18 },
  best: { borderRadius: 20, padding: 16, gap: 4 },
  bestRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  bestValue: { fontSize: 40, lineHeight: 46, fontWeight: '800', letterSpacing: -1.2 },
  splits: { gap: 10 },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  splitLabel: { width: 44 },
  splitTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  splitFill: { height: 10, borderRadius: 5 },
  splitValue: { width: 54, textAlign: 'right' },
  ellie: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 14 },
  flex: { flex: 1 },
});
