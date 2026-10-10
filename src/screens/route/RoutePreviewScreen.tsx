import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bookmark, Pencil } from 'lucide-react-native';
import { Button, TextV2, useThemeV2, useToast } from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { RouteMap } from '@app/features/route/RouteMap';
import { KIND_LABEL, SURFACE_LABEL, formatElevation, formatKm } from '@app/features/route/routeFormat';
import { routeStore, useRouteSession } from '@app/features/route/routeStore';
import { BigFigure, BottomPanel, RoundButton, StatRow } from '@app/features/route/v2/RouteUi';
import { useRouteService } from '@app/services/route/useRouteService';
import type { AppScreenProps } from '@app/types/navigation';

// Vista previa de una ruta (ROUTE_20): "Usar esta ruta", "Editar" and
// "Guardar" (to Tus rutas). Also opened from Tus rutas.
export function RoutePreviewScreen({ navigation }: AppScreenProps<'RoutePreview'>) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useRouteService();
  const { draft } = useRouteSession();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(Boolean(draft?.id.startsWith('saved-')));
  }, [draft]);

  if (!draft) {
    return <View style={[styles.screen, { backgroundColor: colors.bg }]} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <RouteMap
        style={StyleSheet.absoluteFill}
        fit={draft.points}
        padding={{ top: insets.top + 80, bottom: 380, left: 40, right: 40 }}
        route={draft.points}
        endpoints
      />
      <View style={[styles.top, { top: insets.top + 8 }]}>
        <RoundButton icon={ArrowLeft} label="Atrás" onPress={() => navigation.goBack()} />
      </View>
      <BottomPanel style={{ paddingBottom: Math.max(insets.bottom, 16) + 4 }}>
        <View style={styles.body}>
          <View>
            <TextV2 variant="eyebrow" tone="secondary">
              {draft.sport === 'running' ? 'RUNNING' : 'CYCLING'} · RUTA PLANEADA
            </TextV2>
            <TextV2 variant="title22">
              {KIND_LABEL[draft.kind]} · {Math.round(draft.distanceM / 1000)}K
            </TextV2>
          </View>
          <BigFigure value={formatKm(draft.distanceM)} unit="km" size={88} />
          <StatRow
            valueSize={22}
            items={[
              { value: formatElevation(draft.elevationGainM), unit: 'm', label: 'Desnivel' },
              { value: KIND_LABEL[draft.kind], label: 'Tipo' },
              { value: SURFACE_LABEL[draft.surface], label: 'Superficie' },
            ]}
          />
          <Button
            label="Usar esta ruta"
            variant="primary"
            fullWidth
            onPress={() => {
              routeStore.patch({ plan: draft, mode: 'now' });
              navigation.popTo(APP_ROUTES.RoutePrep);
            }}
          />
          <View style={styles.actions}>
            {draft.origin === 'manual' ? (
              <Button
                label="Editar"
                icon={Pencil}
                iconPosition="start"
                variant="secondary"
                style={styles.flex}
                onPress={() => {
                  routeStore.patch({ manualPoints: draft.points, manualEditing: true, manualSelected: null });
                  navigation.goBack();
                }}
              />
            ) : null}
            <Button
              label={saved ? 'Guardada' : 'Guardar'}
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
                    setSaved(true);
                    toast.show('Ruta guardada en Tus rutas');
                  })
                  .catch(() => toast.show('No pudimos guardar la ruta'));
              }}
            />
          </View>
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
