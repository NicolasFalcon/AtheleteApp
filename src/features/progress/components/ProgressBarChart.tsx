import {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {ProgressChartTooltip} from '@app/features/progress/components/ProgressChartTooltip';

type ProgressBarChartPoint = {
  id: string;
  label: string;
  tooltipTitle: string;
  tooltipLines: string[];
  primaryValue: number;
  secondaryValue?: number;
};

type ProgressBarChartProps = {
  points: ProgressBarChartPoint[];
  primaryColor: string;
  secondaryColor?: string;
  targetValue?: number;
  maxValue?: number;
  labelInterval?: number;
  compactEmpty?: boolean;
};

const TOOLTIP_HEIGHT = 52;
const TOOLTIP_LANE_HEIGHT = 18;
const BAR_AREA_HEIGHT = 128;
const COMPACT_BAR_AREA_HEIGHT = 42;
const LABEL_ROW_HEIGHT = 18;
const DOMAIN_HEADROOM = 1.18;
const TARGET_DOMAIN_THRESHOLD = 1.35;

export function ProgressBarChart({
  points,
  primaryColor,
  secondaryColor,
  targetValue,
  maxValue,
  labelInterval = 1,
  compactEmpty = false,
}: ProgressBarChartProps) {
  const {theme} = useAppTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tooltipHeight = compactEmpty ? 0 : TOOLTIP_LANE_HEIGHT;
  const barAreaHeight = compactEmpty ? COMPACT_BAR_AREA_HEIGHT : BAR_AREA_HEIGHT;

  const resolvedMax = useMemo(() => {
    const pointMax = Math.max(
      0,
      ...points.map(point =>
        Math.max(point.primaryValue, point.secondaryValue || 0),
      ),
    );
    const explicitMax = Math.max(maxValue || 0, 0);
    const dataMax = Math.max(pointMax, explicitMax);

    if (dataMax <= 0) {
      return Math.max(targetValue || 0, 1);
    }

    const targetFitsDomain =
      targetValue && targetValue <= dataMax * TARGET_DOMAIN_THRESHOLD;
    const domainMax = Math.max(dataMax, targetFitsDomain ? targetValue : 0);

    return Math.max(domainMax * DOMAIN_HEADROOM, 1);
  }, [maxValue, points, targetValue]);
  const compact = points.length > 10;
  const primaryWidth = secondaryColor ? (compact ? 5 : 13) : compact ? 7 : 18;
  const secondaryWidth = compact ? 4 : 12;
  const barGap = compact ? 1 : 5;

  const styles = StyleSheet.create({
    container: {
      gap: 6,
    },
    plotArea: {
      height: tooltipHeight + barAreaHeight,
      position: 'relative',
      overflow: 'visible',
    },
    targetLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      borderTopWidth: 1,
      borderColor: theme.colors.textSecondary,
      borderStyle: 'dashed',
      opacity: 0.55,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: compact ? 2 : 4,
      height: '100%',
    },
    group: {
      flex: 1,
      height: '100%',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 6,
    },
    tooltipSpacer: {
      height: tooltipHeight,
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
    barStage: {
      height: barAreaHeight,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexDirection: 'row',
      gap: barGap,
    },
    tooltipLayer: {
      position: 'absolute',
      top: -TOOLTIP_HEIGHT + tooltipHeight,
      left: -44,
      right: -44,
      zIndex: 2,
      alignItems: 'center',
    },
    barPressable: {
      alignSelf: 'flex-end',
      borderTopLeftRadius: compact ? 4 : 7,
      borderTopRightRadius: compact ? 4 : 7,
    },
    primaryBar: {
      width: primaryWidth,
      backgroundColor: primaryColor,
    },
    secondaryBar: {
      width: secondaryWidth,
      backgroundColor: secondaryColor || theme.colors.surfaceMuted,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      lineHeight: 12,
      textTransform: 'lowercase',
      textAlign: 'center',
      includeFontPadding: false,
      minWidth: 0,
    },
    labelsRow: {
      minHeight: LABEL_ROW_HEIGHT,
      position: 'relative',
    },
    labelWrap: {
      position: 'absolute',
      top: 0,
      width: 32,
      alignItems: 'center',
    },
  });

  const targetBottom =
    targetValue && targetValue > 0
      ? tooltipHeight +
        Math.min(targetValue / resolvedMax, 1) * barAreaHeight
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.plotArea}>
        {typeof targetBottom === 'number' ? (
          <View style={[styles.targetLine, {bottom: targetBottom}]} />
        ) : null}

        <View style={styles.row}>
          {points.map(point => {
            const selected = selectedId === point.id;
            const primaryHeight = Math.max(
              point.primaryValue > 0
                ? (point.primaryValue / resolvedMax) * barAreaHeight
                : 2,
              2,
            );
            const secondaryHeight = point.secondaryValue
              ? Math.max(
                  (point.secondaryValue / resolvedMax) * barAreaHeight,
                  2,
                )
              : 0;
            return (
              <View key={point.id} style={styles.group}>
                <View style={styles.tooltipSpacer}>
                  {selected ? (
                    <View style={styles.tooltipLayer}>
                      <ProgressChartTooltip
                        title={point.tooltipTitle}
                        lines={point.tooltipLines}
                      />
                    </View>
                  ) : null}
                </View>

                <View style={styles.barStage}>
                  {typeof point.secondaryValue === 'number' ? (
                    <Pressable
                      onPress={() =>
                        setSelectedId(current =>
                          current === point.id ? null : point.id,
                        )
                      }
                      style={({pressed}) => [
                        styles.barPressable,
                        styles.secondaryBar,
                        {height: secondaryHeight || 2},
                        pressed ? {opacity: 0.88} : null,
                      ]}
                    />
                  ) : null}
                  <Pressable
                    onPress={() =>
                      setSelectedId(current =>
                        current === point.id ? null : point.id,
                      )
                    }
                    style={({pressed}) => [
                      styles.barPressable,
                      styles.primaryBar,
                      {height: primaryHeight},
                      pressed ? {opacity: 0.88} : null,
                    ]}
                  />
                </View>

              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.labelsRow}>
        {points.map((point, index) => {
          const showLabel =
            labelInterval <= 1 ||
            index === points.length - 1 ||
            index % labelInterval === 0;
          const labelPosition =
            points.length > 1 ? (index / (points.length - 1)) * 100 : 0;
          const labelOffset =
            index === 0 ? 0 : index === points.length - 1 ? -32 : -16;

          return showLabel ? (
            <View
              key={point.id}
              style={[
                styles.labelWrap,
                {left: `${labelPosition}%`, marginLeft: labelOffset},
              ]}
            >
              <Text numberOfLines={1} style={styles.label}>
                {point.label}
              </Text>
            </View>
          ) : null;
        })}
      </View>
    </View>
  );
}
