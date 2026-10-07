import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clock, UserCheck, UserPlus, X } from 'lucide-react-native';
import { PersonAvatar } from '@app/components/v2/PersonAvatar';
import type { PersonAvatarProps } from '@app/components/v2/PersonAvatar';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type PersonRowProps = {
  name: string;
  // Second line: last activity, "@usuario", "Solicitud enviada hace 2 días".
  subtitle?: string;
  // Ember dot before the subtitle ("Entrenó hoy").
  today?: boolean;
  avatar: Pick<
    PersonAvatarProps,
    'avatarKey' | 'profilePhotoUrl' | 'relationship'
  >;
  onPress?: () => void;
  // PersonStateButton or PersonRequestActions.
  trailing?: ReactNode;
};

// Friend Row (handoff §5): avatar + name + last activity + state action.
// Human, not a settings row.
export function PersonRow({
  name,
  subtitle,
  today = false,
  avatar,
  onPress,
  trailing,
}: PersonRowProps) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.row}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${name}. ${subtitle}` : name}
        disabled={!onPress}
        onPress={onPress}
        style={styles.main}
      >
        <PersonAvatar name={name} size={48} {...avatar} />
        <View style={styles.texts}>
          <TextV2 variant="cta" numberOfLines={1}>
            {name}
          </TextV2>
          {subtitle ? (
            <View style={styles.sub}>
              {today ? (
                <View
                  style={[styles.dot, { backgroundColor: colors.ember.base }]}
                />
              ) : null}
              <TextV2
                variant="meta"
                tone="secondary"
                numberOfLines={1}
                style={styles.subText}
              >
                {subtitle}
              </TextV2>
            </View>
          ) : null}
        </View>
      </PressableScale>
      {trailing}
    </View>
  );
}

export type PersonState = 'add' | 'sent' | 'friends' | 'unblock';

const STATE_COPY: Record<PersonState, string> = {
  add: 'Agregar',
  sent: 'Solicitado',
  friends: 'Amigos',
  unblock: 'Desbloquear',
};

// Agregar (small primary) · Solicitado (neutral) · Amigos (outline, check).
export function PersonStateButton({
  state,
  onPress,
  disabled = false,
}: {
  state: PersonState;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { colors } = useThemeV2();
  const filled = state === 'add';
  const Icon =
    state === 'add' ? UserPlus : state === 'sent' ? Clock : UserCheck;
  const color = filled ? colors.cta.primaryText : colors.text.primary;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={STATE_COPY[state]}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={[
        styles.pill,
        filled
          ? { backgroundColor: colors.cta.primary }
          : { borderWidth: 1, borderColor: colors.outline.strong },
      ]}
    >
      {state === 'unblock' ? null : (
        <Icon size={14} color={color} strokeWidth={2} />
      )}
      <TextV2 variant="metaStrong" color={color}>
        {STATE_COPY[state]}
      </TextV2>
    </PressableScale>
  );
}

// Aceptar (primary) + ignorar (round, muted).
export function PersonRequestActions({
  onAccept,
  onIgnore,
  busy = false,
}: {
  onAccept: () => void;
  onIgnore: () => void;
  busy?: boolean;
}) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.actions}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Aceptar"
        disabled={busy}
        onPress={onAccept}
        style={[styles.pill, { backgroundColor: colors.cta.primary }]}
      >
        <TextV2 variant="metaStrong" color={colors.cta.primaryText}>
          Aceptar
        </TextV2>
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Ignorar"
        disabled={busy}
        onPress={onIgnore}
        style={[styles.ignore, { backgroundColor: colors.surface.muted }]}
      >
        <X size={14} color={colors.text.primary} strokeWidth={2} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minWidth: 0 },
  texts: { flex: 1, gap: 2, minWidth: 0 },
  sub: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subText: { flexShrink: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ignore: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
