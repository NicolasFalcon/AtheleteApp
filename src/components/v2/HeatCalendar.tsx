import { StyleSheet, View } from 'react-native';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type HeatCell = {
  day: number | null; // null: blank before the 1st
  level: 0 | 1 | 2 | 3;
  future: boolean;
  isToday: boolean;
};

export type HeatCalendarProps = {
  cells: HeatCell[];
  weekdays: string[];
  lessLabel?: string;
  moreLabel?: string;
};

// Month of day circles (7 columns, Monday first) whose Ember intensity is the
// minutes trained, with the Menos … Más legend (Progreso · Mes).
export function HeatCalendar({
  cells,
  weekdays,
  lessLabel = 'Menos',
  moreLabel = 'Más',
}: HeatCalendarProps) {
  const { colors } = useThemeV2();
  const fills = [
    colors.surface.muted,
    'rgba(255,91,31,.28)',
    'rgba(255,91,31,.6)',
    colors.ember.base,
  ];

  // Explicit rows of seven: percentage widths round and wrap at six.
  const rows: HeatCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const row = cells.slice(i, i + 7);
    while (row.length < 7) {
      row.push({ day: null, level: 0, future: false, isToday: false });
    }
    rows.push(row);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {weekdays.map((letter, index) => (
          <TextV2
            key={`w${index}`}
            variant="micro"
            color={colors.text.tertiary}
            align="center"
            style={styles.cell}
          >
            {letter}
          </TextV2>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.grid}>
          {row.map((cell, index) => (
            <View key={index} style={styles.cell}>
              {cell.day !== null ? (
                <View
                  style={[
                    styles.day,
                    {
                      backgroundColor: cell.future
                        ? 'transparent'
                        : fills[cell.level],
                      boxShadow: cell.future
                        ? `inset 0 0 0 1px ${colors.divider}`
                        : cell.isToday && cell.level === 0
                        ? `inset 0 0 0 1.5px ${colors.text.primary}`
                        : undefined,
                    },
                  ]}
                >
                  <TextV2
                    variant="micro"
                    color={
                      cell.level >= 2 && !cell.future
                        ? '#121212'
                        : colors.text.secondary
                    }
                    style={cell.isToday ? styles.today : styles.regular}
                  >
                    {cell.day}
                  </TextV2>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ))}
      <View style={styles.legend}>
        <TextV2 variant="micro" color={colors.text.secondary}>
          {lessLabel}
        </TextV2>
        {fills.map((fill, index) => (
          <View
            key={index}
            style={[styles.swatch, { backgroundColor: fill }]}
          />
        ))}
        <TextV2 variant="micro" color={colors.text.secondary}>
          {moreLabel}
        </TextV2>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  grid: { flexDirection: 'row' },
  cell: { flex: 1, padding: 3 },
  day: {
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: { fontWeight: '700' },
  regular: { fontWeight: '400' },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  swatch: { width: 12, height: 12, borderRadius: 6 },
});
