import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, EyeOff, Image as ImageIcon, MessageCircle, MoreHorizontal, X } from 'lucide-react-native';
import { PressableScale, TextV2, useToast } from '@app/components/v2';
import { RouteMap } from '@app/features/route/RouteMap';
import { formatDuration, formatKm, formatPace, formatSpeed } from '@app/features/route/routeFormat';
import { PRIVACY_TRIM_M, paceSecPerKm, speedKmh, trimEnds } from '@app/features/route/routeGeo';
import { useRouteSession } from '@app/features/route/routeStore';
import type { RouteActivity } from '@app/features/route/routeTypes';
import { BigFigure, DARK, RoundButton } from '@app/features/route/v2/RouteUi';
import { RouteThumb } from '@app/features/route/v2/RouteThumb';
import { useRouteService } from '@app/services/route/useRouteService';
import type { AppScreenProps } from '@app/types/navigation';

type Template = 'map' | 'photo' | 'minimal';
const TEMPLATES: { key: Template; label: string }[] = [
  { key: 'map', label: 'Mapa' },
  { key: 'photo', label: 'Foto' },
  { key: 'minimal', label: 'Minimal' },
];
const TARGETS = [
  { label: 'Historia', icon: Camera },
  { label: 'WhatsApp', icon: MessageCircle },
  { label: 'Guardar', icon: ImageIcon },
  { label: 'Más', icon: MoreHorizontal },
] as const;

// Compartir (ROUTE_22): a dark card in three templates and the places to send
// it. What is shared never includes the hidden start/end. TODO(route-wire):
// render the card to an image and open the system share sheet / Stories
// (needs a view-capture dependency that 5a does not add).
export function RouteShareScreen({ navigation, route }: AppScreenProps<'RouteShare'>) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useRouteService();
  const session = useRouteSession();
  const [template, setTemplate] = useState<Template>('map');
  const [activity, setActivity] = useState<RouteActivity | null>(session.finished);

  useEffect(() => {
    const id = route?.params?.activityId;
    if (!activity && id) {
      service
        .getActivity(id)
        .then(setActivity)
        .catch(() => {});
    }
  }, [activity, route?.params?.activityId, service]);

  if (!activity) {
    return <View style={[styles.screen, { backgroundColor: DARK.bg }]} />;
  }
  const line = activity.hideEndpoints ? trimEnds(activity.points, PRIVACY_TRIM_M) : activity.points;
  const running = activity.sport === 'running';

  return (
    <View style={[styles.screen, { backgroundColor: DARK.bg, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <RoundButton icon={X} label="Cerrar" dark onPress={() => navigation.goBack()} />
        <TextV2 variant="bodyStrong" color="#FFFFFF" style={styles.title}>
          Compartir
        </TextV2>
        <View style={styles.spacer} />
      </View>

      <View style={styles.cardWrap}>
        <View style={styles.card}>
          {template === 'map' ? (
            <RouteMap
              style={StyleSheet.absoluteFill}
              mode="dark"
              fit={line}
              padding={{ top: 60, bottom: 170, left: 24, right: 24 }}
              route={line}
              interactive={false}
            />
          ) : template === 'photo' ? (
            <View style={[StyleSheet.absoluteFill, styles.photo]}>
              <RouteThumb points={line} size={200} radius={0} strokeWidth={5} />
            </View>
          ) : null}
          <TextV2 variant="eyebrow" color="#FFFFFF" style={styles.brand}>
            ATHELETE
          </TextV2>
          <View style={styles.overlay}>
            <TextV2 variant="eyebrow" color={DARK.muted}>
              {activity.title.toUpperCase()}
            </TextV2>
            <BigFigure value={formatKm(activity.distanceM, 1)} unit="km" size={64} color={DARK.text} unitColor={DARK.muted} />
            <TextV2 variant="meta" color={DARK.text}>
              {formatDuration(activity.movingSec)} ·{' '}
              {running
                ? `${formatPace(paceSecPerKm(activity.distanceM, activity.movingSec))} /km`
                : `${formatSpeed(speedKmh(activity.distanceM, activity.movingSec))} km/h`}
            </TextV2>
          </View>
        </View>
      </View>

      <View style={[styles.segment, { backgroundColor: DARK.chip }]}>
        {TEMPLATES.map(item => {
          const on = item.key === template;
          return (
            <PressableScale
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setTemplate(item.key)}
              style={[styles.segItem, on ? { backgroundColor: '#FFFFFF' } : null]}
            >
              <TextV2 variant="metaStrong" color={on ? '#0E0D0C' : DARK.muted}>
                {item.label}
              </TextV2>
            </PressableScale>
          );
        })}
      </View>
      {activity.hideEndpoints ? (
        <View style={styles.hint}>
          <EyeOff size={14} color={DARK.muted} strokeWidth={2} />
          <TextV2 variant="meta" color={DARK.muted}>
            Inicio y final ocultos
          </TextV2>
        </View>
      ) : null}

      <View style={[styles.targets, { paddingBottom: insets.bottom + 16 }]}>
        {TARGETS.map(({ label, icon: Icon }) => (
          <PressableScale
            key={label}
            accessibilityRole="button"
            onPress={() => toast.show(label === 'Guardar' ? 'Pronto podrás guardar la imagen' : 'Pronto podrás compartir desde aquí')}
            style={styles.target}
          >
            <View style={styles.targetIcon}>
              <Icon size={22} color="#FFFFFF" strokeWidth={1.8} />
            </View>
            <TextV2 variant="meta" color={DARK.text}>
              {label}
            </TextV2>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  title: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  spacer: { width: 44 },
  cardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  card: { height: '100%', aspectRatio: 9 / 16, borderRadius: 24, overflow: 'hidden', backgroundColor: '#171513' },
  photo: { alignItems: 'center', justifyContent: 'center', paddingBottom: 120, backgroundColor: '#24201C' },
  brand: { position: 'absolute', top: 16, left: 18, letterSpacing: 1.5 },
  overlay: { position: 'absolute', left: 18, right: 18, bottom: 18, gap: 4 },
  segment: { alignSelf: 'center', flexDirection: 'row', borderRadius: 22, padding: 3 },
  segItem: { height: 32, paddingHorizontal: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hint: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6, marginTop: 10 },
  targets: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingTop: 14 },
  target: { alignItems: 'center', gap: 6, minWidth: 64 },
  targetIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: DARK.chip, alignItems: 'center', justifyContent: 'center' },
});
