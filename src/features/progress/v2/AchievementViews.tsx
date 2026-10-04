import { ScrollView, StyleSheet, View } from 'react-native';
import {
  HexMedal,
  PressableScale,
  Sheet,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { badgeIcon } from '@app/features/gamification/badgeIcons';
import {
  shortBadgeDate,
  type Shelf,
  type ShelfItem,
} from '@app/features/progress/badgesModel';

// "7 / 12" and the collection bar of Logros (ACHIEVEMENTS_01).
export function CollectionHeader({
  earned,
  total,
}: {
  earned: number;
  total: number;
}) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.header}>
      <View style={styles.count}>
        <TextV2
          variant="displayM"
          style={styles.earned}
          accessibilityLabel={`${earned} de ${total} logros`}
        >
          {String(earned)}
        </TextV2>
        <TextV2 variant="sub" tone="tertiary" style={styles.total}>
          {`/ ${total}`}
        </TextV2>
      </View>
      <TextV2 variant="voice" tone="secondary">
        Tu colección. Cada medalla cuenta algo que hiciste.
      </TextV2>
      <View style={[styles.track, { backgroundColor: colors.surface.track }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${total > 0 ? (earned / total) * 100 : 0}%`,
              backgroundColor: colors.ember.base,
            },
          ]}
        />
      </View>
    </View>
  );
}

// One shelf: category title, "3 de 6" and the medals in a row.
export function ShelfRow({
  shelf,
  onOpen,
}: {
  shelf: Shelf;
  onOpen: (item: ShelfItem) => void;
}) {
  const { colors } = useThemeV2();

  return (
    <View style={[styles.shelf, { borderBottomColor: colors.divider }]}>
      <View style={styles.shelfHead}>
        <TextV2 variant="section">{shelf.title}</TextV2>
        <TextV2 variant="meta" tone="secondary">
          {`${shelf.earnedCount} de ${shelf.items.length}`}
        </TextV2>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.medals}
      >
        {shelf.items.map(item => (
          <PressableScale
            key={item.badge.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.badge.title}, ${
              item.earned
                ? `conseguido ${item.sub}`
                : item.progress
                ? `bloqueado, ${item.sub}`
                : 'bloqueado'
            }`}
            onPress={() => onOpen(item)}
            style={styles.medal}
          >
            <HexMedal
              icon={badgeIcon(item.badge.icon)}
              state={item.earned ? 'earned' : 'locked'}
              progress={item.progress?.ratio}
              size={82}
            />
            <TextV2
              variant="metaStrong"
              align="center"
              color={item.earned ? colors.text.primary : colors.text.secondary}
              numberOfLines={2}
            >
              {item.badge.title}
            </TextV2>
            {item.sub ? (
              <TextV2
                variant="caption"
                tone="secondary"
                align="center"
                numberOfLines={1}
              >
                {item.sub}
              </TextV2>
            ) : null}
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

// Detail of a medal (ACHIEVEMENTS_02): earned or locked, with what it asks
// and, when locked, how far along the user is.
export function BadgeSheet({
  item,
  onClose,
}: {
  item: ShelfItem | null;
  onClose: () => void;
}) {
  const { colors } = useThemeV2();

  return (
    <Sheet
      open={Boolean(item)}
      onClose={onClose}
      eyebrow={item?.earned ? 'Logro desbloqueado' : 'Logro bloqueado'}
      title={item?.badge.title}
    >
      {item ? (
        <View style={styles.sheetBody}>
          <HexMedal
            icon={badgeIcon(item.badge.icon)}
            state={item.earned ? 'earned' : 'locked'}
            progress={item.progress?.ratio}
            size={106}
          />
          <TextV2
            variant="voice"
            tone="secondary"
            align="center"
            style={styles.description}
          >
            {item.badge.description}
          </TextV2>
          <View
            style={[styles.pill, { backgroundColor: colors.surface.muted }]}
          >
            <TextV2 variant="metaStrong">
              {item.earned
                ? `Conseguido · ${shortBadgeDate(item.earnedAt)}`
                : item.progress
                ? `${item.progress.current} de ${item.progress.target}`
                : 'Aún por conseguir'}
            </TextV2>
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { gap: 10, paddingTop: 8 },
  count: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  earned: { fontSize: 88 },
  total: { paddingBottom: 18, fontSize: 24 },
  track: { height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: 2 },
  shelf: {
    gap: 18,
    paddingBottom: 26,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shelfHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  bleed: { marginHorizontal: -20 },
  medals: { gap: 14, paddingHorizontal: 20 },
  medal: { width: 94, alignItems: 'center', gap: 6 },
  sheetBody: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  description: { maxWidth: 280 },
  pill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    justifyContent: 'center',
  },
});
