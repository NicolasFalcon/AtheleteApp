import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Share2, Users } from 'lucide-react-native';
import {
  Button,
  Eyebrow,
  TextV2,
  useThemeV2,
} from '@app/components/v2';

// Group header of the lists: 11 pt eyebrow and the count on the right
// ("SOLICITUDES RECIBIDAS · 2", SOCIAL_05).
export function GroupHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.groupHeader}>
      <Eyebrow>{title}</Eyebrow>
      <TextV2 variant="meta" tone="tertiary">
        {String(count)}
      </TextV2>
    </View>
  );
}

// Three faded portraits (STATE_04). Nobody is a friend yet, so they are plain
// circles with no initials (DA-119: never someone's real photo).
function MutedPortraits() {
  const { colors } = useThemeV2();

  return (
    <View style={styles.portraits} accessibilityElementsHidden>
      {[0, 1, 2].map(index => (
        <View
          key={index}
          style={[
            styles.portrait,
            {
              marginLeft: index === 0 ? 0 : -16,
              backgroundColor: colors.divider,
              borderColor: colors.bg,
            },
          ]}
        />
      ))}
    </View>
  );
}

export function NoFriendsState({
  title,
  body,
  onSearch,
  onInvite,
}: {
  title: string;
  body: string;
  onSearch: () => void;
  onInvite: () => void;
}) {
  return (
    <View style={styles.empty}>
      <MutedPortraits />
      <View style={styles.emptyTexts}>
        <TextV2 variant="section" align="center">
          {title}
        </TextV2>
        <TextV2 variant="body" tone="secondary" align="center">
          {body}
        </TextV2>
      </View>
      <View style={styles.emptyActions}>
        <Button label="Buscar amigos" size="md" onPress={onSearch} />
        <Button
          label="Invitar con un enlace"
          icon={Share2}
          iconPosition="start"
          variant="secondary"
          size="md"
          onPress={onInvite}
        />
      </View>
    </View>
  );
}

// Placeholder of the segments that arrive in a later tanda.
export function SegmentPlaceholder({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.empty}>
      <View style={[styles.iconCircle, { backgroundColor: colors.surface.muted }]}>
        <Users size={28} color={colors.text.secondary} strokeWidth={2} />
      </View>
      <View style={styles.emptyTexts}>
        <TextV2 variant="section" align="center">
          {title}
        </TextV2>
        <TextV2 variant="body" tone="secondary" align="center">
          {body}
        </TextV2>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: 8,
  },
  empty: {
    alignItems: 'center',
    gap: 22,
    paddingTop: 56,
    paddingHorizontal: 12,
  },
  portraits: { flexDirection: 'row' },
  portrait: { width: 64, height: 64, borderRadius: 32, borderWidth: 3 },
  emptyTexts: { gap: 6, alignItems: 'center' },
  emptyActions: { gap: 10, alignItems: 'center' },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
