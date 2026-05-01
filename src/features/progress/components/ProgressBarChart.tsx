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
};

const TOOLTIP_HEIGHT = 52;
const BAR_AREA_HEIGHT = 86;

export function ProgressBarChart({
  points,
  primaryColor,
  secondaryColor,
  targetValue,
  maxValue,
  labelInterval = 1,
}: ProgressBarChartProps) {
  const {theme} = useAppTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const resolvedMax = useMemo(() => {
    const pointMax = Math.max(
      0,
      ...points.map(point =>
        Math.max(point.primaryValue, point.secondaryValue || 0),
      ),
    );

    return Math.max(pointMax, targetValue || 0, maxValue || 0, 1);
  }, [maxValue, points, targetValue]);
  const compact = points.length > 10;
  const primaryWidth = secondaryColor ? (compact ? 6 : 11) : compact ? 8 : 16;
  const secondaryWidth = compact ? 4 : 11;
  const barGap = compact ? 2 : 5;

  const styles = StyleSheet.create({
    container: {
      gap: 10,
    },
    plotArea: {
      height: TOOLTIP_HEIGHT + BAR_AREA_HEIGHT,
      position: 'relative',
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
      gap: 4,
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
      height: TOOLTIP_HEIGHT,
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
    barStage: {
      height: BAR_AREA_HEIGHT,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexDirection: 'row',
      gap: barGap,
    },
    barPressable: {
      alignSelf: 'flex-end',
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
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
      textTransform: 'lowercase',
    },
  });

  const targetBottom =
    targetValue && targetValue > 0
      ? TOOLTIP_HEIGHT + (targetValue / resolvedMax) * BAR_AREA_HEIGHT
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.plotArea}>
        {typeof targetBottom === 'number' ? (
          <View style={[styles.targetLine, {bottom: targetBottom}]} />
        ) : null}

        <View style={styles.row}>
          {points.map((point, index) => {
            const selected = selectedId === point.id;
            const primaryHeight = Math.max(
              point.primaryValue > 0
                ? (point.primaryValue / resolvedMax) * BAR_AREA_HEIGHT
                : 2,
              2,
            );
            const secondaryHeight = point.secondaryValue
              ? Math.max(
                  (point.secondaryValue / resolvedMax) * BAR_AREA_HEIGHT,
                  2,
                )
              : 0;
            const showLabel =
              labelInterval <= 1 ||
              index === points.length - 1 ||
              index % labelInterval === 0;

            return (
              <View key={point.id} style={styles.group}>
                <View style={styles.tooltipSpacer}>
                  {selected ? (
                    <ProgressChartTooltip
                      title={point.tooltipTitle}
                      lines={point.tooltipLines}
                    />
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

                <Text style={styles.label}>{showLabel ? point.label : ''}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
