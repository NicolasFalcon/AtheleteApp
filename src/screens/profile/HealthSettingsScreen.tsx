import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, Flame, Footprints, Heart, Scale, Dumbbell, type LucideIcon } from 'lucide-react-native';
import {
  BackButton,
  Button,
  GlassHeader,
  Row,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { ROOT_ROUTES } from '@app/constants/routes';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'HealthSettings'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

const TYPES: { icon: LucideIcon; title: string; subtitle: string }[] = [
  { icon: Dumbbell, title: 'Entrenamientos', subtitle: 'Se suman a tu semana en Progreso' },
  { icon: Flame, title: 'Energía activa', subtitle: 'Tu día y el resumen de cada sesión' },
  { icon: Footprints, title: 'Pasos', subtitle: 'Tu día y retos de movimiento' },
  { icon: Activity, title: 'Frecuencia cardíaca', subtitle: 'Resumen de cada sesión' },
  { icon: Scale, title: 'Peso', subtitle: 'Progreso · métricas corporales' },
];

// Apple Health (HEALTH_02 / 03): the integration is a future module (no
// HealthKit yet), so this is the reference screen as a placeholder: always
// "Sin conectar" and the connect action only explains it is coming.
export function HealthSettingsScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const connected = __DEV__ ? Boolean(route.params?.devConnected) : false;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Apple Health"
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: insets.bottom + 40, gap: 24, paddingTop: 12 }}
      >
        <View style={styles.identity}>
          <View style={[styles.circle, { backgroundColor: colors.surface.muted }]}>
            <Heart size={28} color={colors.text.primary} strokeWidth={1.8} />
          </View>
          <View style={styles.identityText}>
            <TextV2 variant="title22">Apple Health</TextV2>
            <TextV2 variant="meta" tone="secondary">
              {connected ? 'Configurado · sincronizado hace 5 min' : '○ Sin conectar'}
            </TextV2>
          </View>
        </View>
        <TextV2 variant="bodyL" tone="secondary">
          ATHELETE usa solo lo que tú autorizas en Salud para completar tu día, tus sesiones y tu progreso.
        </TextV2>
        <View>
          <TextV2 variant="eyebrow" color={colors.text.secondary} style={styles.eyebrow}>
            Lo que ATHELETE puede usar
          </TextV2>
          {TYPES.map(item => (
            <Row
              key={item.title}
              title={item.title}
              subtitle={item.subtitle}
              leading={<item.icon size={20} color={colors.text.primary} strokeWidth={1.8} />}
            />
          ))}
        </View>
        <View style={styles.cta}>
          {connected ? (
            <Button label="Gestionar permisos en Salud" variant="outline" onPress={() => {}} fullWidth />
          ) : (
            <Button
              label="Conectar con Apple Health"
              onPress={() => toast.show('Apple Health llegará pronto')}
              fullWidth
            />
          )}
          <TextV2 variant="meta" tone="secondary" align="center">
            {connected
              ? 'Los permisos se cambian en la app Salud de tu iPhone.'
              : 'Salud te preguntará qué compartir. Puedes cambiarlo cuando quieras.'}
          </TextV2>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  circle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  identityText: { gap: 4 },
  eyebrow: { paddingBottom: 4 },
  cta: { gap: 12 },
});
