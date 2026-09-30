import { Fragment } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { HealthTag } from '@app/components/v2/HealthTag';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type Metric = {
  value: string;
  unit?: string;
  label: string;
  source?: 'health';
};

export type MetricTrioProps = {
  items: Metric[];
  style?: StyleProp<ViewStyle>;
};

// Three metrics in equal columns split by 1 pt vertical dividers
// (Resumen, Core 33 activo, detalle de reto, hero de Progreso).
export function MetricTrio({ items, style }: MetricTrioProps) {
  const { colors, mode } = useThemeV2();
  const dividerColor =
    mode === 'scene' ? colors.border.onDarkStrong : colors.divider;

  return (
    <View style={[styles.row, style]}>
      {items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          {index > 0 ? (
            <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          ) : null}
          <View
            style={[
              styles.cell,
              index === 0 ? styles.first : null,
              index === items.length - 1 ? styles.last : null,
            ]}
          >
            <View style={styles.valueRow}>
              <TextV2 variant="title24" numberOfLines={1}>
                {item.value}
              </TextV2>
              {item.unit ? (
                <TextV2 variant="meta" tone="secondary">
                  {item.unit}
                </TextV2>
              ) : null}
            </View>
            <TextV2 variant="caption" tone="secondary" numberOfLines={1}>
              {item.label}
            </TextV2>
            {item.source === 'health' ? <HealthTag /> : null}
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cell: {
    flex: 1,
    gap: 2,
    paddingHorizontal: 12,
  },
  // Outer columns align with the 20 pt screen gutter.
  first: {
    paddingLeft: 0,
  },
  last: {
    paddingRight: 0,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  divider: {
    width: 1,
  },
});
