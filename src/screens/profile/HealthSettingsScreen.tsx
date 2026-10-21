import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, Heart, HeartPulse, Moon, type LucideIcon } from 'lucide-react-native';
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
import { HealthInviteSheet } from '@app/features/health/HealthInviteSheet';
import {
  HEALTH_STATUS_TEXT,
  connectHealth,
  openHealthSettings,
  syncHealthSleep,
  useHealthState,
} from '@app/features/health/healthStore';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'HealthSettings'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// What the app reads today (read only).
const TYPES: { icon: LucideIcon; title: string; subtitle: string }[] = [
  { icon: Moon, title: 'Sueño', subtitle: 'Duración, fases y horario · Sueño y Progreso' },
  { icon: HeartPulse, title: 'Frecuencia cardíaca en reposo', subtitle: 'Tu recuperación del día' },
  { icon: Activity, title: 'VFC', subtitle: 'Tu recuperación del día' },
];

// Apple Health (HEALTH_02 / 03): the connection of this device, read only.
// Connecting shows the invitation and then the system sheet; permissions are
// managed in Salud (iOS never tells the app what was denied).
export function HealthSettingsScreen({ navigation }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();
  const health = useHealthState();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const connected = health.status === 'connected' || health.status === 'noData';

  const connect = async () => {
    setBusy(true);
    try {
      const status = await connectHealth(queryClient);
      setInviteOpen(false);
      toast.show(
        status === 'connected' ? 'Apple Health conectado' : 'Salud no compartió noches. Revisa los permisos.',
        status === 'connected' ? undefined : { tone: 'error' },
      );
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    setBusy(true);
    try {
      const status = await syncHealthSleep(queryClient, { minIntervalMs: 0 });
      toast.show(status === 'connected' ? 'Sueño actualizado' : 'Salud no compartió noches', status === 'connected' ? undefined : { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader title="Apple Health" left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />} />
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
            <TextV2 variant="meta" color={connected ? colors.recovery.base : colors.text.secondary}>
              {`${connected ? '●' : '○'} ${HEALTH_STATUS_TEXT[health.status]}`}
            </TextV2>
          </View>
        </View>
        <TextV2 variant="bodyL" tone="secondary">
          ATHELETE solo lee lo que tú autorizas en Salud para mostrar tu descanso, estimar tu recuperación y ajustar tus entrenos.
        </TextV2>
        <View>
          <TextV2 variant="eyebrow" color={colors.text.secondary} style={styles.eyebrow}>
            Lo que ATHELETE lee
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
        {health.status === 'unavailable' ? (
          <TextV2 variant="meta" tone="secondary" align="center">
            Apple Health no está disponible en este dispositivo. Puedes registrar tu sueño a mano en Sueño.
          </TextV2>
        ) : connected ? (
          <View style={styles.cta}>
            {health.status === 'noData' ? (
              <TextV2 variant="meta" tone="secondary">
                Salud no está compartiendo tu sueño. Actívalo en Ajustes › Salud › Acceso a datos y dispositivos › Athelete.
              </TextV2>
            ) : null}
            <Button label="Gestionar permisos en Salud" onPress={() => openHealthSettings()} fullWidth />
            <Button label="Sincronizar ahora" variant="secondary" loading={busy} onPress={syncNow} fullWidth />
          </View>
        ) : (
          <View style={styles.cta}>
            <Button label="Conectar con Apple Health" onPress={() => setInviteOpen(true)} fullWidth />
            <TextV2 variant="meta" tone="secondary" align="center">
              Salud te preguntará qué compartir. Puedes cambiarlo cuando quieras.
            </TextV2>
          </View>
        )}
      </ScrollView>
      <HealthInviteSheet
        open={inviteOpen}
        busy={busy}
        onConnect={() => {
          connect().catch(() => undefined);
        }}
        onClose={() => setInviteOpen(false)}
      />
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
