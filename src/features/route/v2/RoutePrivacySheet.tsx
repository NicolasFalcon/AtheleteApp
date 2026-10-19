import { StyleSheet, View } from 'react-native';
import { Check, Lock, Users, type LucideIcon } from 'lucide-react-native';
import { Button, PressableScale, Sheet, TextV2, useThemeV2 } from '@app/components/v2';
import { PRIVACY_TRIM_M, trimEnds } from '@app/features/route/routeGeo';
import { routeStore, useRouteSession } from '@app/features/route/routeStore';
import type { LatLng, RouteVisibility } from '@app/features/route/routeTypes';
import { shownVisibility, visibilityTitle } from '@app/features/route/routeVisibility';
import { RouteThumb } from '@app/features/route/v2/RouteThumb';

// Privacy of a route (ROUTE_04): who sees it and "Ocultar inicio y final".
// What others see is trimmed 200 m at each end **by the server**; the thumbnail
// only previews it. Without `value` it edits the defaults of this and the next
// outings (the session store, saved to social_settings by the caller); with
// `value` + `onChange` it edits one saved activity (update_route_activity_privacy).
// Solo yo / Amigos: no "Público" for now (see routeVisibility).
const OPTIONS: { key: RouteVisibility; title: string; sub: string; icon: LucideIcon }[] = [
  { key: 'me', title: visibilityTitle('me'), sub: 'Nadie más ve tus rutas', icon: Lock },
  { key: 'friends', title: visibilityTitle('friends'), sub: 'Tus amigos en Comunidad', icon: Users },
];

export const visibilityLabel = visibilityTitle;

export type RoutePrivacyValue = { visibility: RouteVisibility; hideEndpoints: boolean };

export function RoutePrivacySheet({
  open,
  onClose,
  preview,
  value,
  onChange,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  // The track for the two thumbnails.
  preview: readonly LatLng[];
  // One activity: its privacy and what to do when the person changes it.
  value?: RoutePrivacyValue;
  onChange?: (next: RoutePrivacyValue) => void;
  busy?: boolean;
}) {
  const { colors } = useThemeV2();
  const session = useRouteSession();
  const current: RoutePrivacyValue = value ?? {
    visibility: session.visibility,
    hideEndpoints: session.hideEndpoints,
  };
  const change = (patch: Partial<RoutePrivacyValue>) => {
    if (busy) {
      return;
    }
    if (onChange) {
      onChange({ ...current, ...patch });
    } else {
      routeStore.patch(patch);
    }
  };
  const others = current.hideEndpoints ? trimEnds(preview, PRIVACY_TRIM_M) : preview;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Tus rutas, a tu manera"
      footer={<Button label="Listo" onPress={onClose} style={styles.footerButton} />}
    >
      <TextV2 variant="body" tone="secondary" style={styles.sub}>
        {value ? 'Se aplica a esta actividad.' : 'Se aplica a esta salida y a las siguientes.'}
      </TextV2>
      <View style={styles.options}>
        {OPTIONS.map(option => {
          const on = option.key === shownVisibility(current.visibility);
          return (
            <PressableScale
              key={option.key}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => change({ visibility: option.key })}
              style={[
                styles.option,
                on ? { backgroundColor: colors.surface.muted } : { boxShadow: `inset 0 0 0 1px ${colors.divider}` },
              ]}
            >
              <option.icon size={20} strokeWidth={1.9} color={colors.text.primary} />
              <View style={styles.optionTexts}>
                <TextV2 variant="bodyStrong">{option.title}</TextV2>
                <TextV2 variant="meta" tone="secondary">
                  {option.sub}
                </TextV2>
              </View>
              {on ? (
                <View style={[styles.check, { backgroundColor: colors.ember.base }]}>
                  <Check size={14} strokeWidth={3} color="#FFFFFF" />
                </View>
              ) : null}
            </PressableScale>
          );
        })}
      </View>

      <PressableScale
        accessibilityRole="switch"
        accessibilityState={{ checked: current.hideEndpoints }}
        onPress={() => change({ hideEndpoints: !current.hideEndpoints })}
        style={styles.toggle}
      >
        <View style={styles.optionTexts}>
          <TextV2 variant="bodyStrong">Ocultar inicio y final</TextV2>
          <TextV2 variant="meta" tone="secondary">
            Los demás ven tu ruta empezar y terminar a unos 200 m de donde sales.
          </TextV2>
        </View>
        <View
          style={[
            styles.track,
            { backgroundColor: current.hideEndpoints ? colors.cta.primary : colors.divider },
          ]}
        >
          <View style={[styles.knob, current.hideEndpoints ? styles.knobOn : null]} />
        </View>
      </PressableScale>

      <View style={styles.previews}>
        <View style={styles.preview}>
          <RouteThumb points={preview} size={132} radius={18} dots />
          <TextV2 variant="caption" tone="secondary" align="center">
            Tú · recorrido completo
          </TextV2>
        </View>
        <View style={styles.preview}>
          <RouteThumb points={others.length > 1 ? others : preview} size={132} radius={18} dim={others.length < 2} />
          <TextV2 variant="caption" tone="secondary" align="center">
            {current.hideEndpoints ? 'Los demás · extremos ocultos' : 'Los demás · recorrido completo'}
          </TextV2>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  footerButton: { flex: 1 },
  sub: { marginTop: -6, marginBottom: 14 },
  options: { gap: 8 },
  option: {
    minHeight: 64,
    borderRadius: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionTexts: { flex: 1, gap: 2 },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 18 },
  track: { width: 48, height: 28, borderRadius: 14, padding: 2 },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' },
  knobOn: { marginLeft: 20 },
  previews: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8 },
  preview: { gap: 8, alignItems: 'center' },
});
