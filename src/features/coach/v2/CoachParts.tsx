import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Lock, Minus, Plus } from 'lucide-react-native';
import { ProfileAvatar } from '@app/components/profile/ProfileAvatar';
import { Button, PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { Sheet } from '@app/components/v2/Sheet';
import { initialsOf } from '@app/features/social/socialModel';
import { normalizeProfilePhotoReference } from '@app/services/supabase/profile-photo';

// Shared pieces of ATHELETE Coach (handoff v2.20 §30). Scenes (#141312) are
// dark in both modes; everything else follows the theme tokens.

export const SCENE = '#141312';
export const SCENE_RAISED = '#2A2826';
export const SAGE = '#5E8F5A';
export const SAGE_TINT = 'rgba(94,143,90,.16)';
export const EMBER_TINT = 'rgba(255,91,31,.12)';

// Anton figure ("12", "2.450", "75%"). `size` in pt.
export function antonStyle(fontFamily: string, size: number): TextStyle {
  return {
    fontFamily,
    fontSize: size,
    fontWeight: Platform.OS === 'ios' ? '700' : '400',
    lineHeight: Math.round(size * 1.12),
    letterSpacing: 0,
  };
}

// "COACH": Ember pill, black text, 11 pt caps (§30.4 · Tu próxima sesión).
export function CoachTag({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useThemeV2();
  return (
    <View style={[styles.tag, { backgroundColor: colors.ember.base }, style]}>
      <TextV2 variant="eyebrow" color="#141312" style={styles.tagText}>
        {label}
      </TextV2>
    </View>
  );
}

// Avatar of a coach or student: their photo or initials. `ring`: Ember ring
// (needs attention / the coach). `dark`: initials on the ink disc.
export function CoachAvatar({
  name,
  avatar,
  size = 48,
  ring = false,
  dark = false,
  outline = false,
  style,
}: {
  name: string;
  avatar?: string | null;
  size?: number;
  ring?: boolean;
  dark?: boolean;
  outline?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useThemeV2();
  const photo = normalizeProfilePhotoReference(avatar ?? null);
  const inner = photo ? (
    <ProfileAvatar avatarKey={null} profilePhotoUrl={photo} size={size} />
  ) : (
    <View
      style={[
        styles.initials,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: dark ? SCENE : outline ? 'transparent' : colors.surface.muted,
          borderWidth: outline ? 1.5 : 0,
          borderColor: colors.outline.strong,
        },
      ]}
    >
      <TextV2
        color={dark ? '#FFFFFF' : colors.text.primary}
        style={{ fontSize: Math.round(size * 0.34), fontWeight: '600' }}
      >
        {initialsOf(name)}
      </TextV2>
    </View>
  );
  if (!ring) {
    return <View style={style}>{inner}</View>;
  }
  const gap = size >= 64 ? 4 : 3;
  return (
    <View
      style={[
        styles.ring,
        {
          padding: gap,
          borderRadius: size / 2 + gap + 2,
          borderColor: colors.ember.base,
        },
        style,
      ]}
    >
      {inner}
    </View>
  );
}

// "Qué comparte contigo": shared in ink with a check, not shared in
// outline with a lock.
export function ShareChip({ label, on }: { label: string; on: boolean }) {
  const { colors } = useThemeV2();
  const Icon = on ? Check : Lock;
  const fg = on ? colors.cta.primaryText : colors.text.secondary;
  return (
    <View
      style={[
        styles.chip,
        on
          ? { backgroundColor: colors.cta.primary }
          : { borderWidth: 1, borderColor: colors.outline.strong },
      ]}
    >
      <Icon size={15} color={fg} strokeWidth={2.4} />
      <TextV2 variant="bodyStrong" color={fg}>
        {label}
      </TextV2>
    </View>
  );
}

export function StatusChip({ label, tone }: { label: string; tone: 'sage' | 'ember' | 'muted' }) {
  const { colors, mode } = useThemeV2();
  const bg = tone === 'sage' ? SAGE_TINT : tone === 'ember' ? EMBER_TINT : colors.surface.muted;
  const fg =
    tone === 'sage'
      ? mode === 'light'
        ? '#3F6B3B'
        : '#9CC497'
      : tone === 'ember'
      ? mode === 'light'
        ? colors.ember.deep
        : colors.ember.textOnDark
      : colors.text.secondary;
  return (
    <View style={[styles.status, { backgroundColor: bg }]}>
      <TextV2 variant="metaStrong" color={fg}>
        {label}
      </TextV2>
    </View>
  );
}

// Ember dot + text (list notices: "Sin entrenar hace 7 días").
export function Notice({ label, strong = false }: { label: string; strong?: boolean }) {
  const { colors, mode } = useThemeV2();
  return (
    <View style={[styles.notice, { backgroundColor: strong ? EMBER_TINT : colors.surface.muted }]}>
      <View style={[styles.dot, { backgroundColor: colors.ember.base }]} />
      <TextV2
        variant="metaStrong"
        color={strong ? (mode === 'light' ? colors.ember.deep : colors.ember.textOnDark) : colors.text.secondary}
      >
        {label}
      </TextV2>
    </View>
  );
}

// "No compartido por el alumno" block.
export function LockedBlock({ title, body }: { title: string; body: string }) {
  const { colors } = useThemeV2();
  return (
    <View style={[styles.locked, { backgroundColor: colors.surface.muted }]}>
      <View style={[styles.lockDisc, { backgroundColor: colors.bg }]}>
        <Lock size={18} color={colors.text.secondary} strokeWidth={2} />
      </View>
      <View style={styles.flex}>
        <TextV2 variant="bodyStrong">{title}</TextV2>
        <TextV2 variant="meta" tone="secondary">
          {body}
        </TextV2>
      </View>
    </View>
  );
}

// White card (raised surface) of the detail screens.
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useThemeV2();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface.raised, borderColor: colors.border.card }, style]}>
      {children}
    </View>
  );
}

// Session rating in 5 bars (Ember up to the value).
export function RatingBars({ value }: { value: number }) {
  const { colors } = useThemeV2();
  return (
    <View style={styles.bars}>
      {[1, 2, 3, 4, 5].map(step => (
        <View
          key={step}
          style={[styles.bar, { backgroundColor: step <= value ? colors.ember.base : colors.surface.muted }]}
        />
      ))}
    </View>
  );
}

// Round ± button (counters of Asignar nutrición).
export function StepButton({
  kind,
  onPress,
  disabled,
  onScene = false,
  accessibilityLabel,
  size = 44,
}: {
  kind: 'minus' | 'plus';
  onPress: () => void;
  disabled?: boolean;
  onScene?: boolean;
  accessibilityLabel: string;
  size?: number;
}) {
  const { colors } = useThemeV2();
  const Icon = kind === 'minus' ? Minus : Plus;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.step,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: onScene ? SCENE_RAISED : colors.surface.muted,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Icon size={20} color={onScene ? '#FFFFFF' : colors.text.primary} strokeWidth={2} />
    </PressableScale>
  );
}

// Day circles L–D (Pills of "Programa" and of the assigned routine).
export function DayPill({
  label,
  on,
  onPress,
  size = 44,
  accessibilityLabel,
}: {
  label: string;
  on: boolean;
  onPress?: () => void;
  size?: number;
  accessibilityLabel?: string;
}) {
  const { colors } = useThemeV2();
  const content = (
    <TextV2 variant="bodyStrong" color={on ? colors.cta.primaryText : colors.text.secondary}>
      {label}
    </TextV2>
  );
  const style = [
    styles.dayPill,
    { width: size, height: size, borderRadius: size / 2, backgroundColor: on ? colors.cta.primary : colors.surface.muted },
  ];
  if (!onPress) {
    return <View style={style}>{content}</View>;
  }
  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={style}
    >
      {content}
    </PressableScale>
  );
}

// Choice pill ("Lun 9 nov", "6 semanas").
export function ChoicePill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { colors } = useThemeV2();
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.choice, { backgroundColor: on ? colors.cta.primary : colors.surface.muted }]}
    >
      <TextV2 variant="bodyStrong" color={on ? colors.cta.primaryText : colors.text.primary}>
        {label}
      </TextV2>
    </PressableScale>
  );
}

// Confirmation sheet: title, body, Ember action and "Cancelar".
export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Sheet open={open} onClose={onClose} hideHeader>
      <View style={[styles.confirm, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TextV2 variant="title24" accessibilityRole="header">
          {title}
        </TextV2>
        <TextV2 variant="bodyL" tone="secondary">
          {body}
        </TextV2>
        <Button label={confirmLabel} variant="commit" loading={loading} onPress={onConfirm} style={styles.confirmCta} />
        <Button label={cancelLabel} variant="text" onPress={onClose} />
      </View>
    </Sheet>
  );
}

// Section heading with an optional trailing element.
export function SectionTitle({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <View style={styles.section}>
      <TextV2 variant="section" accessibilityRole="header" style={styles.flex}>
        {title}
      </TextV2>
      {trailing}
    </View>
  );
}

// Progress line (sessions of the week).
export function ProgressLine({ ratio, ember = false }: { ratio: number; ember?: boolean }) {
  const { colors } = useThemeV2();
  const pct = Math.max(0, Math.min(1, ratio));
  return (
    <View style={[styles.track, { backgroundColor: colors.surface.muted }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.max(pct * 100, ember ? 4 : 0)}%`,
            backgroundColor: ember ? colors.ember.base : colors.text.primary,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tag: { height: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: 'center', alignSelf: 'flex-start' },
  tagText: { letterSpacing: 0.6 },
  initials: { alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: 2, alignSelf: 'flex-start' },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  status: { height: 30, paddingHorizontal: 12, borderRadius: 15, justifyContent: 'center' },
  notice: {
    alignSelf: 'flex-start',
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  locked: { flexDirection: 'row', gap: 14, padding: 16, borderRadius: 20, alignItems: 'center' },
  lockDisc: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 22, padding: 18, borderWidth: StyleSheet.hairlineWidth, gap: 14 },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { width: 12, height: 22, borderRadius: 4 },
  step: { alignItems: 'center', justifyContent: 'center' },
  dayPill: { alignItems: 'center', justifyContent: 'center' },
  choice: { height: 48, paddingHorizontal: 18, borderRadius: 24, justifyContent: 'center' },
  confirm: { gap: 14, paddingTop: 8 },
  confirmCta: { marginTop: 8 },
  section: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', flex: 1 },
  fill: { height: 4, borderRadius: 2 },
});
