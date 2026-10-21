import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Activity, HeartPulse, Moon, type LucideIcon } from 'lucide-react-native';
import { Button, Sheet, TextV2, useThemeV2 } from '@app/components/v2';

// Apple Health · invitación (HEALTH_01, v2.15 reading): what ATHELETE reads
// and why, before the system sheet. The system sheet is the one that asks.
const ROWS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Moon, title: 'Sueño', text: 'Duración, fases y horario de cada noche.' },
  { icon: HeartPulse, title: 'Corazón', text: 'Frecuencia cardíaca en reposo y VFC.' },
  { icon: Activity, title: 'Entrenamientos', text: 'Para estimar tu recuperación del día.' },
];

export function HealthInviteSheet({
  open,
  busy,
  onConnect,
  onClose,
}: {
  open: boolean;
  busy: boolean;
  onConnect: () => void;
  onClose: () => void;
}) {
  const { colors } = useThemeV2();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      footer={
        <View style={styles.footer}>
          <Button
            label="Conectar con Apple Health"
            loading={busy}
            loadingLabel="Conectando…"
            onPress={onConnect}
            fullWidth
          />
          <Button label="Ahora no" variant="text" onPress={onClose} fullWidth />
        </View>
      }
    >
      <View style={styles.body}>
        <Svg width={72} height={72} viewBox="0 0 72 72">
          <Circle cx={36} cy={36} r={31} stroke={colors.ember.base} strokeWidth={7} fill="none" strokeDasharray="160 60" strokeLinecap="round" rotation={-90} origin="36,36" />
          <Circle cx={36} cy={36} r={21} stroke={colors.recovery.base} strokeWidth={7} fill="none" strokeDasharray="100 40" strokeLinecap="round" rotation={-90} origin="36,36" />
          <Circle cx={36} cy={36} r={11} stroke={colors.text.primary} strokeWidth={6} fill="none" strokeDasharray="45 30" strokeLinecap="round" rotation={-90} origin="36,36" />
        </Svg>
        <View style={styles.gap8}>
          <TextV2 variant="title26" accessibilityRole="header">
            Conecta tus datos de salud
          </TextV2>
          <TextV2 variant="body" tone="secondary">
            Tu sueño y tu corazón ayudan a ELLIE a saber cómo llegas a entrenar hoy.
          </TextV2>
        </View>
        <View>
          {ROWS.map((row, index) => (
            <View
              key={row.title}
              style={[styles.row, index > 0 ? { borderTopColor: colors.divider, borderTopWidth: 1 } : null]}
            >
              <View style={[styles.icon, { backgroundColor: colors.surface.muted }]}>
                <row.icon size={18} color={colors.text.primary} strokeWidth={1.8} />
              </View>
              <View style={styles.rowTexts}>
                <TextV2 variant="bodyStrong">{row.title}</TextV2>
                <TextV2 variant="meta" tone="secondary">
                  {row.text}
                </TextV2>
              </View>
            </View>
          ))}
        </View>
        <TextV2 variant="meta" tone="secondary">
          Tú eliges qué compartir en Salud. Puedes cambiarlo cuando quieras. ATHELETE solo lee: nunca escribe en Salud desde aquí.
        </TextV2>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 20 },
  gap8: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowTexts: { flex: 1, gap: 2 },
  footer: { flex: 1, gap: 4 },
});
