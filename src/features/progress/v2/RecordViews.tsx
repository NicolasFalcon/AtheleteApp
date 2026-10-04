import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  ProgressCurve,
  RecordCard,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import {
  curvePoints,
  deltaSinceFirst,
  formatRecord,
  shortDate,
  type ExerciseRecords,
  type RecordHistoryRow,
} from '@app/features/progress/recordsModel';

// Dark plate of the record detail (RECORDS_01): the best mark as a display
// figure, its difference since the first mark and the free curve with every
// mark. Always a scene, in both modes.
export function RecordPlate({
  group,
  top,
  width,
}: {
  group: ExerciseRecords;
  top: number;
  width: number;
}) {
  const { scene } = useThemeV2();
  const best = formatRecord(group.best);
  const points = curvePoints(group);
  const delta = deltaSinceFirst(group);

  return (
    <View style={[styles.plate, { paddingTop: top }]}>
      <Svg style={styles.glow} pointerEvents="none">
        <Defs>
          <RadialGradient id="recGlow" cx="100%" cy="70%" rx="90%" ry="60%">
            <Stop offset="0" stopColor="#FF5B1F" stopOpacity={0.14} />
            <Stop offset="0.6" stopColor="#FF5B1F" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#recGlow)" />
      </Svg>

      <View style={styles.copy}>
        <View style={styles.eyebrowRow}>
          <TextV2 variant="eyebrow" color={scene.onDark.meta}>
            Mejor marca
          </TextV2>
          {group.isNew ? (
            <View style={styles.newBadge}>
              <TextV2 variant="micro" color="#121212" style={styles.newText}>
                NUEVO
              </TextV2>
            </View>
          ) : null}
        </View>
        <TextV2 variant="section" color="#FFFFFF">
          {group.exerciseName}
        </TextV2>
        <View style={styles.valueRow}>
          <TextV2
            variant="displayL"
            color="#FFFFFF"
            style={styles.value}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {best.value}
          </TextV2>
          <TextV2 variant="section" color={scene.onDark.meta}>
            {best.unit}
          </TextV2>
        </View>
        {delta ? (
          <TextV2 variant="bodyStrong" color="#FF8A5C">
            {delta}
          </TextV2>
        ) : null}
      </View>

      {points.length > 0 ? (
        <>
          <View style={styles.curve}>
            <ProgressCurve
              variant="record"
              values={points.map(point => point.value)}
              labels={points.map(point => point.label)}
              width={width}
              height={180}
              gradientId="recordFill"
            />
          </View>
          <View style={styles.dates}>
            {points.map((point, index) => (
              <TextV2 key={index} variant="caption" color={scene.onDark.meta}>
                {point.date}
              </TextV2>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

// Historial: a timeline with the difference over the previous mark and
// whether it came from a session or was registered by hand.
export function RecordHistory({
  rows,
  onLongPress,
}: {
  rows: RecordHistoryRow[];
  onLongPress: (row: RecordHistoryRow) => void;
}) {
  const { colors } = useThemeV2();

  return (
    <View>
      <TextV2 variant="section" style={styles.historyTitle}>
        Historial
      </TextV2>
      {rows.map((row, index) => {
        const value = formatRecord(row.record, true);
        const last = index === rows.length - 1;
        return (
          <Pressable
            key={row.record.id}
            accessibilityRole="text"
            accessibilityLabel={`${value.value} ${value.unit}, ${shortDate(
              row.record.recordedAt,
            )}, ${
              row.source === 'session' ? 'de una sesión' : 'registrado a mano'
            }, ${row.delta.text}`}
            onLongPress={() => onLongPress(row)}
            style={styles.historyRow}
          >
            <View style={styles.timeline}>
              <View
                style={[
                  styles.node,
                  row.isLatest
                    ? {
                        backgroundColor: colors.ember.base,
                        boxShadow: '0 0 0 4px rgba(255,91,31,.18)',
                      }
                    : {
                        backgroundColor: colors.bg,
                        boxShadow: `inset 0 0 0 2px ${colors.outline.strong}`,
                      },
                ]}
              />
              <View
                style={[
                  styles.line,
                  { backgroundColor: colors.divider, opacity: last ? 0 : 1 },
                ]}
              />
            </View>
            <View style={styles.historyText}>
              <View style={styles.valueLine}>
                <TextV2 variant="section" style={styles.historyValue}>
                  {value.value}
                </TextV2>
                <TextV2 variant="meta" color={colors.text.secondary}>
                  {value.unit}
                </TextV2>
              </View>
              <View style={styles.sourceLine}>
                <TextV2 variant="meta" color={colors.text.secondary}>
                  {shortDate(row.record.recordedAt)}
                </TextV2>
                <TextV2 variant="caption" color={colors.text.tertiary}>
                  {row.source === 'session' ? '· De una sesión' : '· Manual'}
                </TextV2>
              </View>
            </View>
            <TextV2
              variant="metaStrong"
              color={
                row.delta.positive && row.isLatest
                  ? colors.ember.base
                  : colors.text.secondary
              }
              style={styles.delta}
            >
              {row.delta.text}
            </TextV2>
          </Pressable>
        );
      })}
    </View>
  );
}

// Every exercise with a mark, as two columns of cards (the "Tus marcas"
// card at list size).
export function RecordsGrid({
  groups,
  cardWidth,
  onOpen,
}: {
  groups: ExerciseRecords[];
  cardWidth: number;
  onOpen: (group: ExerciseRecords) => void;
}) {
  return (
    <View style={styles.grid}>
      {groups.map((group, index) => {
        const formatted = formatRecord(group.best);
        return (
          <View key={group.exerciseId} style={{ width: cardWidth }}>
            <RecordCard
              featured={index === 0}
              title={group.exerciseName}
              value={formatted.value}
              unit={formatted.unit}
              date={group.isNew ? 'Hoy' : shortDate(group.best.recordedAt)}
              isNew={group.isNew}
              onPress={() => onOpen(group)}
              style={styles.gridCard}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  plate: { backgroundColor: '#141312', overflow: 'hidden' },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  copy: { paddingHorizontal: 20, gap: 8 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newBadge: {
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 5,
    backgroundColor: '#FF5B1F',
    justifyContent: 'center',
  },
  newText: { fontWeight: '700', letterSpacing: 0.5 },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 6,
  },
  value: { fontSize: 96, letterSpacing: -4.8, flexShrink: 1 },
  curve: { marginTop: 10 },
  dates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyTitle: { marginBottom: 18 },
  historyRow: { flexDirection: 'row', columnGap: 16 },
  timeline: { width: 14, alignItems: 'center' },
  node: { width: 12, height: 12, borderRadius: 6, marginTop: 8 },
  line: { width: 1.5, flex: 1 },
  historyText: { flex: 1, gap: 2, paddingBottom: 22 },
  valueLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  historyValue: { fontWeight: '600' },
  sourceLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  delta: { paddingTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { width: '100%' },
});
