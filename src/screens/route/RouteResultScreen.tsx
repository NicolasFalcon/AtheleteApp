import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Share2, Trash2, Users, X } from 'lucide-react-native';
import {
  Button,
  LivingHalo,
  PressableScale,
  Sheet,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { RouteMap } from '@app/features/route/RouteMap';
import {
  agoLabel,
  formatDuration,
  formatElevation,
  formatKm,
  formatPace,
  formatSpeed,
} from '@app/features/route/routeFormat';
import { PRIVACY_TRIM_M, paceSecPerKm, speedKmh } from '@app/features/route/routeGeo';
import { routeStore, useRouteSession } from '@app/features/route/routeStore';
import { hiddenEnds } from '@app/features/route/routeSummary';
import type { RouteActivity } from '@app/features/route/routeTypes';
import { BigFigure, RoundButton, StatRow } from '@app/features/route/v2/RouteUi';
import { useInvalidateRoute, useRouteActivity } from '@app/features/route/useRouteData';
import {
  RoutePrivacySheet,
  visibilityLabel,
  type RoutePrivacyValue,
} from '@app/features/route/v2/RoutePrivacySheet';
import { createPostErrorCopy, publishedToast } from '@app/features/social/postModel';
import type { CreatePostError } from '@app/features/social/postTypes';
import { invalidateSocialContent } from '@app/features/social/useSocial';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { RouteServiceError } from '@app/services/route/routeService';
import { useRouteService } from '@app/services/route/useRouteService';
import type { AppScreenProps } from '@app/types/navigation';

// Resultado (ROUTE_10–12): the map with the trail, the metrics, the splits, a
// new best if any, ELLIE's line, and share / post. The owner sees the whole
// track (the 200 m hidden from others dotted grey); a viewer already receives
// the trimmed one. A Route counts as a workout (ring, streak, km for
// challenges) on the server, which says so in `countedAsWorkout`. "Compartir en
// Comunidad" is create_post('route'); privacy and delete go to the server.
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
  const invalidate = useInvalidateRoute();
  const queryClient = useQueryClient();
  const language = useProfileLanguage();
  const activityId = route?.params?.activityId;
  // The one just finished is already in memory; otherwise get_route_activity
  // through React Query (kept: coming back does not ask again, B-13). Privacy
  // edits are applied on top of it.
  const justFinished =
    session.finished && (!activityId || session.finished.id === activityId) ? session.finished : null;
  const activityQuery = useRouteActivity(activityId ?? justFinished?.id, justFinished);
  const [edited, setActivity] = useState<RouteActivity | null>(null);
  const activity: RouteActivity | null = edited ?? activityQuery.data ?? null;
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [pendingPrivacy, setPendingPrivacy] = useState<RoutePrivacyValue | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const unavailable =
    activityQuery.isError || (activityQuery.isSuccess && activityQuery.data === null);
  // Someone else's activity (the param says so before it loads; the server
  // says so after).
  const viewer = Boolean(route?.params?.viewer) || activity?.isOwner === false;


  const shown = useMemo(() => {
    if (!activity) {
      return null;
    }
    // A viewer already gets the track trimmed by the server.
    const line = activity.points;
    return {
      line,
      hidden: !viewer && activity.hideEndpoints ? hiddenEnds(activity.points, PRIVACY_TRIM_M) : [],
    };
  }, [activity, viewer]);

  if (!activity || !shown) {
    return (
      <View style={[styles.screen, styles.unavailable, { backgroundColor: colors.bg }]}>
        <StatusBarV2 />
        {unavailable ? (
          <>
            <TextV2 variant="title22" align="center">
              Esta ruta no está disponible
            </TextV2>
            <TextV2 variant="body" tone="secondary" align="center">
              Puede que se haya borrado o que ya no la compartan contigo.
            </TextV2>
            <Button label="Volver" variant="secondary" onPress={() => navigation.goBack()} />
          </>
        ) : null}
      </View>
    );
  }

  const running = activity.sport === 'running';
  const planned = Boolean(activity.plannedRouteId);
  const planName = activity.plannedName ?? (session.plan?.id === activity.plannedRouteId ? session.plan?.name : null);
  const ofPlan = planned ? (planName ? `Ruta planeada · ${planName}` : 'Ruta planeada') : null;

  // The plan followed belongs to that outing, not to the next one.
  const done = () => {
    routeStore.patch({ plan: null, generated: null, draft: null, mode: 'now' });
    navigation.popToTop();
  };

  const post = () => {
    setPosting(true);
    service
      .shareToCommunity(activity.id)
      .then(result => {
        routeStore.patch({ posted: true });
        // The feed and the own profile show it; the person lands on the post
        // (created:false = it was already shared: that post is opened).
        invalidateSocialContent(queryClient);
        toast.show(publishedToast(result.created, language));
        navigation.navigate(APP_ROUTES.SocialPost, { postId: result.postId });
      })
      .catch(error => {
        const code = error instanceof RouteServiceError ? error.code : 'unknown';
        if (code === 'route_private') {
          // "Solo yo": open the privacy of this activity.
          toast.show(createPostErrorCopy('route_private', language).message);
          setPrivacyOpen(true);
          return;
        }
        // Any ok:false (post_removed too) is an error with its text.
        toast.show(createPostErrorCopy(code as CreatePostError, language).message, { tone: 'error' });
      })
      .finally(() => setPosting(false));
  };

  const applyPrivacy = (next: RoutePrivacyValue) => {
    const previous = activity;
    setSavingPrivacy(true);
    setActivity({ ...activity, visibility: next.visibility, hideEndpoints: next.hideEndpoints });
    service
      .updatePrivacy(activity.id, next.visibility, next.hideEndpoints)
      .then(() => {
        if (next.visibility === 'me') {
          // The server removes its post in Comunidad.
          routeStore.patch({ posted: false });
        }
        invalidate();
      })
      .catch(() => {
        setActivity(previous);
        toast.show('No pudimos cambiar la privacidad. Inténtalo de nuevo.');
      })
      .finally(() => setSavingPrivacy(false));
  };

  // "Solo yo" takes the post down: it is confirmed first when it was shared.
  const changePrivacy = (next: RoutePrivacyValue) => {
    if (next.visibility === 'me' && activity.visibility !== 'me' && session.posted) {
      setPendingPrivacy(next);
      return;
    }
    applyPrivacy(next);
  };

  const remove = () => {
    setDeleting(true);
    service
      .deleteActivity(activity.id)
      .then(() => {
        invalidate();
        setDeleteOpen(false);
        toast.show('Actividad eliminada');
        routeStore.patch({ finished: null, posted: false, plan: null, generated: null, draft: null, mode: 'now' });
        navigation.popToTop();
      })
      .catch(() => {
        toast.show('No pudimos eliminarla. Inténtalo de nuevo.');
      })
      .finally(() => setDeleting(false));
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + (viewer ? 40 : 200) }}>
        <View style={styles.map}>
          {viewer && shown.line.length < 2 ? (
            <View style={[StyleSheet.absoluteFill, styles.unavailable]}>
              <TextV2 variant="bodyStrong" align="center">
                Recorrido oculto
              </TextV2>
              <TextV2 variant="meta" tone="secondary" align="center">
                Es corto y {activity.owner?.name ?? 'quien la compartió'} oculta el inicio y el final.
              </TextV2>
            </View>
          ) : null}
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
              {activity.owner?.name ?? 'Un amigo'}{' '}
              <TextV2 variant="meta" tone="secondary">
                {running ? 'Running' : 'Ciclismo'} · {agoLabel(activity.startedAt, Date.now())}
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

          {activity.pending && !viewer ? (
            <View style={[styles.notice, { backgroundColor: colors.surface.muted }]}>
              <TextV2 variant="metaStrong">Guardada en este dispositivo</TextV2>
              <TextV2 variant="meta" tone="secondary">
                Sin conexión: se subirá sola cuando vuelva la red. Hasta entonces no suma a tu día.
              </TextV2>
            </View>
          ) : activity.countedAsWorkout && !viewer ? (
            <View style={[styles.notice, { backgroundColor: colors.surface.muted }]}>
              <TextV2 variant="metaStrong">
                Cuenta como entreno
                {activity.pointsAwarded ? ` · +${activity.pointsAwarded} pts` : ''}
              </TextV2>
            </View>
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
              <PressableScale
                accessibilityRole="button"
                onPress={() => setDeleteOpen(true)}
                style={styles.deleteRow}
              >
                <Trash2 size={16} strokeWidth={2} color={colors.text.secondary} />
                <TextV2 variant="metaStrong" tone="secondary">
                  Eliminar actividad
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
            disabled={session.posted || posting || activity.visibility === 'me' || Boolean(activity.pending)}
            onPress={post}
          />
          <View style={styles.footerRow}>
            <Button
              label="Compartir"
              icon={Share2}
              iconPosition="start"
              variant="secondary"
              style={styles.flex}
              onPress={() => navigation.navigate(APP_ROUTES.Share, { kind: 'route', activityId: activity.id })}
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
            onPress={() => navigation.navigate(APP_ROUTES.Share, { kind: 'route', activityId: activity.id })}
          />
        ) : null}
      </View>
      <RoutePrivacySheet
        open={privacyOpen && !viewer}
        onClose={() => setPrivacyOpen(false)}
        preview={activity.points}
        value={{ visibility: activity.visibility, hideEndpoints: activity.hideEndpoints }}
        onChange={changePrivacy}
        busy={savingPrivacy || Boolean(activity.pending)}
      />
      <Sheet
        open={pendingPrivacy !== null}
        onClose={() => setPendingPrivacy(null)}
        title="¿Dejarla solo para ti?"
        footer={
          <View style={styles.footerRow}>
            <Button label="Cancelar" variant="secondary" style={styles.flex} onPress={() => setPendingPrivacy(null)} />
            <Button
              label="Solo yo"
              variant="primary"
              style={styles.flex}
              onPress={() => {
                if (pendingPrivacy) {
                  applyPrivacy(pendingPrivacy);
                }
                setPendingPrivacy(null);
              }}
            />
          </View>
        }
      >
        <TextV2 variant="body" tone="secondary">
          Al pasar a "Solo yo" se borra tu publicación de esta ruta en Comunidad.
        </TextV2>
      </Sheet>
      <Sheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="¿Eliminar esta actividad?"
        footer={
          <View style={styles.footerRow}>
            <Button label="Cancelar" variant="secondary" style={styles.flex} onPress={() => setDeleteOpen(false)} />
            <Button label="Eliminar" variant="primary" style={styles.flex} disabled={deleting} onPress={remove} />
          </View>
        }
      >
        <TextV2 variant="body" tone="secondary">
          Se borra el recorrido, su publicación en Comunidad y lo que sumó a tu día, tu racha y tus retos. No se puede deshacer.
        </TextV2>
      </Sheet>
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
  unavailable: { alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  notice: { borderRadius: 16, padding: 14, gap: 2 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
});
