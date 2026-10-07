import { StyleSheet, View } from 'react-native';
import {
  Award,
  ChevronsUp,
  Dumbbell,
  ListChecks,
  Trophy,
  type LucideIcon,
} from 'lucide-react-native';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import type {
  AttachmentKind,
  AttachmentSource,
} from '@app/features/social/postTypes';

export const ATTACHMENT_ICONS: Record<AttachmentKind, LucideIcon> = {
  workout: Dumbbell,
  routine: ListChecks,
  record: Trophy,
  achievement: Award,
  challenge: ChevronsUp,
};

// Athelete attachment of the composer: the figures come from the app and are
// not editable ("Los datos se añaden solos", SOCIAL_02).
export function AttachmentPreview({ source }: { source: AttachmentSource }) {
  const { colors, shadow } = useThemeV2();
  const Icon = ATTACHMENT_ICONS[source.kind];

  return (
    <View
      accessibilityLabel={`${source.over}. ${source.title}`}
      style={[
        styles.card,
        { backgroundColor: colors.surface.raised, boxShadow: shadow.subtle },
      ]}
    >
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: colors.surface.muted }]}>
          <Icon size={18} strokeWidth={1.9} color={colors.text.primary} />
        </View>
        <View style={styles.texts}>
          <TextV2 variant="eyebrow" tone="secondary">
            {source.over}
          </TextV2>
          <TextV2 variant="cta" numberOfLines={2}>
            {source.title}
          </TextV2>
        </View>
      </View>
      <View style={[styles.stats, { borderTopColor: colors.divider }]}>
        {source.stats.map(stat => (
          <View key={stat.label} style={styles.stat}>
            <TextV2 variant="cta">{stat.value}</TextV2>
            <TextV2 variant="caption" tone="secondary">
              {stat.label}
            </TextV2>
          </View>
        ))}
      </View>
      {source.record ? (
        <View style={styles.record}>
          <View style={[styles.tag, { backgroundColor: colors.ember.base }]}>
            <TextV2 variant="eyebrow" color={colors.ember.onText}>
              Nuevo récord
            </TextV2>
          </View>
          <TextV2 variant="meta">
            {`${source.record.exercise} · ${source.record.value} ${source.record.unit}`}
          </TextV2>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 18, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 1 },
  stats: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1 },
  stat: { flex: 1, gap: 1 },
  record: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tag: { height: 20, paddingHorizontal: 7, borderRadius: 6, justifyContent: 'center' },
});
