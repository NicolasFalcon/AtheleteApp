import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import type { RouteSport } from '@app/features/route/routeTypes';

// Small pieces shared by the Ruta screens. `dark` = the dark scenes of the
// handoff (live, share): fixed tokens that do not change with the theme.

export const DARK = {
  bg: '#0E0D0C',
  text: '#FFFFFF',
  muted: '#A8A6A1',
  quiet: '#8C8A85',
  hairline: 'rgba(255,255,255,.14)',
  chip: 'rgba(255,255,255,.08)',
} as const;

// Round 44 pt control over the map (close, back, privacy, share, undo).
export function RoundButton({
  icon: Icon,
  label,
  onPress,
  dark = false,
  disabled = false,
  style,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  dark?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, shadow } = useThemeV2();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.round,
        dark
          ? { backgroundColor: DARK.chip }
          : { backgroundColor: colors.surface.raised, boxShadow: shadow.subtle },
        disabled ? styles.dim : null,
        style,
      ]}
    >
      <Icon size={20} strokeWidth={2} color={dark ? DARK.text : colors.text.primary} />
    </PressableScale>
  );
}

// Floating label pill at the top centre ("Crear ruta", "Ruta generada").
export function TopPill({ label }: { label: string }) {
  const { colors, shadow } = useThemeV2();
  return (
    <View style={[styles.topPill, { backgroundColor: colors.surface.raised, boxShadow: shadow.subtle }]}>
      <TextV2 variant="bodyStrong">{label}</TextV2>
    </View>
  );
}

// Correr / Ciclismo.
export function SportSegment({
  sport,
  onChange,
}: {
  sport: RouteSport;
  onChange: (sport: RouteSport) => void;
}) {
  const { colors, shadow } = useThemeV2();
  const options: { key: RouteSport; label: string }[] = [
    { key: 'running', label: 'Correr' },
    { key: 'cycling', label: 'Ciclismo' },
  ];
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.segment, { backgroundColor: colors.surface.raised, boxShadow: shadow.subtle }]}
    >
      {options.map(option => {
        const active = option.key === sport;
        return (
          <PressableScale
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.key)}
            style={[styles.segmentItem, active ? { backgroundColor: colors.cta.primary } : null]}
          >
            <TextV2
              variant="bodyStrong"
              color={active ? colors.cta.primaryText : colors.text.secondary}
            >
              {option.label}
            </TextV2>
          </PressableScale>
        );
      })}
    </View>
  );
}

// Bottom panel over the map: radius 28 on top, page colour.
export function BottomPanel({
  children,
  floating = false,
  style,
}: {
  children: ReactNode;
  // Floating card with margins (hand-drawn route) instead of a full-width sheet.
  floating?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, shadow } = useThemeV2();
  return (
    <View
      style={[
        styles.panel,
        floating ? styles.panelFloating : styles.panelFull,
        { backgroundColor: colors.bg, boxShadow: shadow.sheet },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Huge distance: "0,00 km".
export function BigFigure({
  value,
  unit,
  size = 112,
  color,
  unitColor,
  style,
}: {
  value: string;
  unit: string;
  size?: number;
  color?: string;
  unitColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useThemeV2();
  return (
    <View style={[styles.bigRow, style]}>
      <TextV2
        accessibilityLabel={`${value} ${unit}`}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={{
          fontSize: size,
          lineHeight: size * 0.9,
          fontWeight: '800',
          letterSpacing: -size * 0.05,
          color: color ?? colors.text.primary,
          flexShrink: 1,
        }}
      >
        {value}
      </TextV2>
      <TextV2
        style={{
          fontSize: Math.max(18, size * 0.2),
          fontWeight: '600',
          color: unitColor ?? colors.text.secondary,
          paddingBottom: size * 0.08,
        }}
      >
        {unit}
      </TextV2>
    </View>
  );
}

export type StatItem = { value: string; unit?: string; label: string };

// Metrics with vertical dividers (Tiempo | Ritmo, Desnivel | Tipo | Superficie).
export function StatRow({
  items,
  dark = false,
  valueSize = 28,
}: {
  items: StatItem[];
  dark?: boolean;
  valueSize?: number;
}) {
  const { colors } = useThemeV2();
  const ink = dark ? DARK.text : colors.text.primary;
  const sub = dark ? DARK.muted : colors.text.secondary;
  const line = dark ? DARK.hairline : colors.divider;
  return (
    <View style={styles.statRow}>
      {items.map((item, index) => (
        <View
          key={item.label}
          style={[
            styles.statCell,
            index > 0 ? { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: line, paddingLeft: 16 } : null,
          ]}
        >
          <View style={styles.statValueRow}>
            <TextV2
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{ fontSize: valueSize, lineHeight: valueSize * 1.2, fontWeight: '700', letterSpacing: -valueSize * 0.025, color: ink, flexShrink: 1 }}
            >
              {item.value}
            </TextV2>
            {item.unit ? (
              <TextV2 variant="body" color={sub} style={styles.statUnit}>
                {item.unit}
              </TextV2>
            ) : null}
          </View>
          <TextV2 variant="meta" color={sub}>
            {item.label}
          </TextV2>
        </View>
      ))}
    </View>
  );
}

// "GPS listo · ±4 m" / "Buscando GPS…".
export function GpsChip({
  ready,
  accuracyM,
  dark = false,
}: {
  ready: boolean;
  accuracyM?: number;
  dark?: boolean;
}) {
  const { colors } = useThemeV2();
  return (
    <View style={styles.gps}>
      <View style={[styles.gpsDot, { backgroundColor: ready ? colors.ember.base : colors.text.disabled }]} />
      <TextV2 variant="metaStrong" color={dark ? DARK.text : undefined}>
        {ready ? `GPS listo${accuracyM ? ` · ±${accuracyM} m` : ''}` : 'Buscando GPS…'}
      </TextV2>
    </View>
  );
}

// Muted 44 pt pill (Pausa automática, privacy).
export function Chip({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: colors.surface.muted }]}
    >
      <Icon size={15} strokeWidth={2} color={colors.text.primary} />
      <TextV2 variant="metaStrong" numberOfLines={2} style={styles.chipText}>
        {label}
      </TextV2>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  topPill: { height: 40, borderRadius: 20, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.35 },
  segment: { flexDirection: 'row', borderRadius: 24, padding: 4 },
  segmentItem: { height: 36, paddingHorizontal: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  panelFull: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  panelFloating: { left: 12, right: 12, bottom: 24, borderRadius: 28, padding: 16 },
  bigRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  statRow: { flexDirection: 'row' },
  statCell: { flex: 1, gap: 2 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statUnit: { marginBottom: 2 },
  gps: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gpsDot: { width: 9, height: 9, borderRadius: 5 },
  chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chipText: { textAlign: 'center', flexShrink: 1 },
});
