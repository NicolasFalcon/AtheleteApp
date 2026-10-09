import { StyleSheet, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, StatusBarV2, TextV2, useThemeV2 } from '@app/components/v2';
import { safeGoBack, tabFallback } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

// Placeholder behind the Inicio "Tu ruta" card. TODO(ruta): replaced by the
// Ruta flow (Preparar → En curso → Resultado, Fase 5).
export function RouteSoonScreen({ navigation }: AppScreenProps<'RouteSoon'>) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.fill, { backgroundColor: '#141312' }]}>
      <StatusBarV2 style="light" />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: layout.gutter }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => safeGoBack(navigation, [tabFallback('Home')])}
          style={styles.back}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
        </PressableScale>
      </View>
      <View style={styles.center}>
        <TextV2 variant="eyebrow" color="#A8A6A1">
          Ruta
        </TextV2>
        <TextV2 style={styles.title}>Próximamente</TextV2>
        <TextV2 variant="body" color="#D8D6D1" align="center">
          Running y Ciclismo con GPS llegan pronto.
        </TextV2>
        <View style={[styles.dot, { backgroundColor: colors.ember.base }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -0.7, color: '#FFFFFF' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
});
