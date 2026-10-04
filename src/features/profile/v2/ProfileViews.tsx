import { Image, ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  HexMedal,
  PressableScale,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { badgeIcon } from '@app/features/gamification/badgeIcons';
import {
  shortBadgeDate,
  type ShelfItem,
} from '@app/features/progress/badgesModel';
import {
  timelineDate,
  type TimelineEntry,
} from '@app/features/profile/profileModel';

export const PORTRAIT_PLACEHOLDER = require('@app/assets/v2/photos/hero-entreno.jpg');

// "23 Sesiones · 6 días Racha · 4.860 Puntos" (three figures, hairlines).
export function StatsTrio({
  sessions,
  streak,
  points,
}: {
  sessions: string;
  streak: string;
  points: string;
}) {
  const { colors } = useThemeV2();
  const cells = [
    { value: sessions, unit: '', label: 'Sesiones' },
    { value: streak, unit: 'días', label: 'Racha' },
    { value: points, unit: '', label: 'Puntos' },
  ];
  return (
    <View style={styles.trio}>
      {cells.map((cell, index) => (
        <View key={cell.label} style={styles.trioRow}>
          {index > 0 ? (
            <View style={[styles.hairline, { backgroundColor: colors.divider }]} />
          ) : null}
          <View style={styles.trioCell}>
            <View style={styles.baseline}>
              <TextV2 variant="title22" style={styles.statValue}>
                {cell.value}
              </TextV2>
              {cell.unit ? (
                <TextV2 variant="meta" tone="secondary">
                  {cell.unit}
                </TextV2>
              ) : null}
            </View>
            <TextV2 variant="meta" tone="secondary">
              {cell.label}
            </TextV2>
          </View>
        </View>
      ))}
    </View>
  );
}

// Vitrina: the latest medals on a shelf, plus the next one in progress.
export function Showcase({
  earned,
  next,
  total,
  earnedCount,
  onOpenAll,
  onOpen,
}: {
  earned: ShelfItem[];
  next: ShelfItem | null;
  total: number;
  earnedCount: number;
  onOpenAll: () => void;
  onOpen: (item: ShelfItem) => void;
}) {
  const { colors } = useThemeV2();
  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <TextV2 variant="section">Vitrina</TextV2>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Ver todos los logros"
          onPress={onOpenAll}
          style={styles.headLink}
        >
          <TextV2 variant="bodyStrong">{`${earnedCount} de ${total}`}</TextV2>
          <TextV2 variant="bodyStrong">›</TextV2>
        </PressableScale>
      </View>
      <View style={[styles.shelf, { borderBottomColor: colors.divider }]}>
        <LinearGradient
          colors={['rgba(239,238,234,0)', colors.surface.muted]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.medals}
        >
          {earned.map(item => (
            <Medal key={item.badge.id} item={item} onPress={() => onOpen(item)} />
          ))}
          {next ? <Medal item={next} onPress={onOpenAll} /> : null}
          {earned.length === 0 && !next ? (
            <TextV2 variant="meta" tone="secondary" style={styles.emptyShelf}>
              Tus medallas aparecerán aquí.
            </TextV2>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

function Medal({ item, onPress }: { item: ShelfItem; onPress: () => void }) {
  const { colors } = useThemeV2();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${item.badge.title}, ${
        item.earned ? 'conseguido' : 'bloqueado'
      }`}
      onPress={onPress}
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
        numberOfLines={2}
        color={item.earned ? colors.text.primary : colors.text.secondary}
      >
        {item.badge.title}
      </TextV2>
      <TextV2 variant="caption" tone="secondary" align="center" numberOfLines={1}>
        {item.earned ? shortBadgeDate(item.earnedAt) : item.sub}
      </TextV2>
    </PressableScale>
  );
}

// Tu trayectoria: date · dot on a vertical line · milestone.
export function Timeline({
  entries,
  now,
}: {
  entries: TimelineEntry[];
  now: Date;
}) {
  const { colors } = useThemeV2();
  if (entries.length === 0) {
    return (
      <TextV2 variant="body" tone="secondary">
        Tus hitos aparecerán aquí a medida que entrenes.
      </TextV2>
    );
  }
  return (
    <View>
      <View style={[styles.line, { backgroundColor: colors.divider }]} />
      {entries.map(entry => (
        <View key={entry.id} style={styles.timeRow}>
          <TextV2 variant="caption" tone="secondary" align="right" style={styles.timeDate}>
            {timelineDate(entry.at, now)}
          </TextV2>
          <View
            style={[
              styles.dot,
              entry.fresh
                ? { backgroundColor: colors.ember.base, boxShadow: `0 0 0 4px rgba(255,91,31,.18)` }
                : { backgroundColor: colors.bg, boxShadow: `inset 0 0 0 2px ${colors.text.primary}` },
            ]}
          />
          <View style={styles.timeText}>
            <TextV2 variant="bodyStrong">{entry.title}</TextV2>
            <TextV2 variant="meta" tone="secondary">
              {entry.subtitle}
            </TextV2>
          </View>
        </View>
      ))}
    </View>
  );
}

// Objetivo · Semana · Nutrición · Core 33 (2 × 2, tappable).
export function PlanGrid({
  items,
}: {
  items: { title: string; value: string; onPress: () => void }[];
}) {
  const { colors } = useThemeV2();
  return (
    <View style={[styles.grid, { borderTopColor: colors.divider }]}>
      {items.map(item => (
        <PressableScale
          key={item.title}
          accessibilityRole="button"
          onPress={item.onPress}
          style={styles.gridCell}
        >
          <TextV2 variant="meta" tone="secondary">
            {item.title}
          </TextV2>
          <TextV2 variant="bodyStrong" numberOfLines={1}>
            {item.value}
          </TextV2>
        </PressableScale>
      ))}
    </View>
  );
}

export function Portrait({ uri }: { uri: string | null }) {
  return (
    <Image
      source={uri ? { uri } : PORTRAIT_PLACEHOLDER}
      resizeMode="cover"
      style={StyleSheet.absoluteFill}
    />
  );
}

const styles = StyleSheet.create({
  trio: { flexDirection: 'row' },
  trioRow: { flex: 1, flexDirection: 'row' },
  trioCell: { flex: 1, gap: 2, paddingLeft: 14 },
  hairline: { width: 1 },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statValue: { fontWeight: '600' },
  block: { gap: 6 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  headLink: { flexDirection: 'row', gap: 4 },
  shelf: { marginHorizontal: -20, borderBottomWidth: 2, paddingTop: 22 },
  medals: { paddingHorizontal: 20, gap: 18 },
  medal: { width: 92, alignItems: 'center', gap: 8, paddingBottom: 16 },
  emptyShelf: { paddingBottom: 20 },
  line: { position: 'absolute', left: 67, top: 10, bottom: 10, width: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 10 },
  timeDate: { width: 56, paddingTop: 2 },
  dot: { width: 14, height: 14, borderRadius: 7, marginTop: 3, marginHorizontal: 5 },
  timeText: { flex: 1, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18, columnGap: 14, paddingVertical: 22, borderTopWidth: 1 },
  gridCell: { width: '47%', gap: 2 },
});
