import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, MoreHorizontal, Plus } from 'lucide-react-native';
import {
  Button,
  PressableScale,
  Sheet,
  StatusBarV2,
  TextField,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { KIND_LABEL, formatElevation, formatKm } from '@app/features/route/routeFormat';
import { routeStore } from '@app/features/route/routeStore';
import type { PlannedRoute } from '@app/features/route/routeTypes';
import { RoundButton } from '@app/features/route/v2/RouteUi';
import { RouteThumb } from '@app/features/route/v2/RouteThumb';
import { useRouteService } from '@app/services/route/useRouteService';
import type { AppScreenProps } from '@app/types/navigation';

// Tus rutas (ROUTE_21): the planned routes you saved, with "Usar", "Cambiar
// nombre" and "Eliminar". TODO(route-wire): `planned_routes` on the server.
export function RouteSavedScreen({ navigation }: AppScreenProps<'RouteSaved'>) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const service = useRouteService();
  const [items, setItems] = useState<PlannedRoute[] | null>(null);
  const [menu, setMenu] = useState<PlannedRoute | null>(null);
  const [renaming, setRenaming] = useState<PlannedRoute | null>(null);
  const [name, setName] = useState('');

  const load = useCallback(() => {
    service
      .getSavedRoutes()
      .then(setItems)
      .catch(() => setItems([]));
  }, [service]);

  useEffect(load, [load]);

  const use = (item: PlannedRoute) => {
    routeStore.patch({ plan: item, draft: item, mode: 'now', sport: item.sport });
    navigation.popTo(APP_ROUTES.RoutePrep);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <RoundButton icon={ArrowLeft} label="Atrás" onPress={() => navigation.goBack()} />
        <TextV2 variant="bodyStrong" style={styles.headerTitle}>
          Tus rutas
        </TextV2>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Planear ruta"
          onPress={() => {
            routeStore.patch({ mode: 'plan' });
            navigation.popTo(APP_ROUTES.RoutePrep);
          }}
          style={[styles.add, { backgroundColor: colors.cta.primary }]}
        >
          <Plus size={20} color={colors.cta.primaryText} strokeWidth={2.4} />
        </PressableScale>
      </View>
      <View style={styles.private}>
        <Lock size={14} color={colors.text.secondary} strokeWidth={2} />
        <TextV2 variant="meta" tone="secondary">
          Privadas. Solo tú las ves.
        </TextV2>
      </View>

      {items && items.length === 0 ? (
        <View style={styles.empty}>
          <TextV2 variant="title22" style={styles.center}>
            Aún no tienes rutas guardadas
          </TextV2>
          <TextV2 variant="body" tone="secondary" style={styles.center}>
            Planea una y guárdala para salir con ella otro día.
          </TextV2>
          <Button
            label="Planear ruta"
            variant="primary"
            onPress={() => {
              routeStore.patch({ mode: 'plan' });
              navigation.popTo(APP_ROUTES.RoutePrep);
            }}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {(items ?? []).map(item => (
            <PressableScale
              key={item.id}
              accessibilityRole="button"
              onPress={() => {
                routeStore.patch({ draft: item });
                navigation.navigate(APP_ROUTES.RoutePreview);
              }}
              style={[styles.row, { borderTopColor: colors.divider }]}
            >
              <RouteThumb points={item.points} size={64} radius={12} dots />
              <View style={styles.rowText}>
                <TextV2 variant="bodyStrong" numberOfLines={1}>
                  {item.name}
                </TextV2>
                <TextV2 variant="meta" tone="secondary">
                  {formatKm(item.distanceM, 1)} km · {formatElevation(item.elevationGainM)} m · {KIND_LABEL[item.kind]}
                </TextV2>
              </View>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Más opciones"
                onPress={() => setMenu(item)}
                style={styles.more}
              >
                <MoreHorizontal size={20} color={colors.text.secondary} strokeWidth={2} />
              </PressableScale>
            </PressableScale>
          ))}
        </ScrollView>
      )}

      <Sheet open={Boolean(menu)} onClose={() => setMenu(null)} title={menu?.name ?? ''}>
        <View style={styles.menu}>
          <Button
            label="Usar"
            variant="primary"
            fullWidth
            onPress={() => {
              const item = menu;
              setMenu(null);
              if (item) {
                use(item);
              }
            }}
          />
          <Button
            label="Cambiar nombre"
            variant="secondary"
            fullWidth
            onPress={() => {
              setRenaming(menu);
              setName(menu?.name ?? '');
              setMenu(null);
            }}
          />
          <Button
            label="Eliminar"
            variant="text"
            fullWidth
            onPress={() => {
              const item = menu;
              setMenu(null);
              if (item) {
                service
                  .deleteRoute(item.id)
                  .then(() => {
                    load();
                    toast.show('Ruta eliminada');
                  })
                  .catch(() => toast.show('No pudimos eliminar la ruta'));
              }
            }}
          />
        </View>
      </Sheet>

      <Sheet
        open={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        title="Cambiar nombre"
        footer={
          <Button
            label="Guardar"
            style={styles.flex}
            disabled={!name.trim()}
            onPress={() => {
              const item = renaming;
              setRenaming(null);
              if (item) {
                service
                  .renameRoute(item.id, name.trim())
                  .then(load)
                  .catch(() => toast.show('No pudimos cambiar el nombre'));
              }
            }}
          />
        }
      >
        <TextField label="Nombre" value={name} onChangeText={setName} maxLength={40} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { position: 'absolute', left: 0, right: 0, bottom: 24, textAlign: 'center' },
  add: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  private: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 14 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, gap: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  center: { textAlign: 'center' },
  menu: { gap: 8 },
  flex: { flex: 1 },
});
