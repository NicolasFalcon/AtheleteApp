import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ColorValue,
} from 'react-native';
import { BarChart, type barDataItem } from 'react-native-gifted-charts';
import { Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

type ProgressRange = 'week' | 'month';

export type ProgressChartPoint = {
  id: string;
  label: string;
  value: number;
  tooltipLabel: string;
  tooltipValue: string;
};

export type ProgressLegendItem = {
  label: string;
  color?: ColorValue;
  dashed?: boolean;
  active?: boolean;
  onPress?: () => void;
};

export type ProgressMetricItem = {
  label: string;
  value: string;
};

type ProgressChartCardProps = {
  icon: ReactNode;
  title: string;
  summary?: string;
  range: ProgressRange;
  points: ProgressChartPoint[];
  primaryColor: string;
  legendItems: ProgressLegendItem[];
  hasData: boolean;
  emptyMessage: string;
  metrics?: ProgressMetricItem[];
  footer?: ReactNode;
  targetValue?: number;
  chartHeightOverride?: number;
};

const CHART_HEIGHT = 132;
const MONTH_CHART_HEIGHT = 124;
const EMPTY_CHART_HEIGHT = 44;
const LABEL_AREA_HEIGHT = 24;
const DOMAIN_HEADROOM = 1.16;

export function ProgressChartCard({
  icon,
  title,
  summary,
  range,
  points,
  primaryColor,
  legendItems,
  hasData,
  emptyMessage,
  metrics,
  footer,
  targetValue,
  chartHeightOverride,
}: ProgressChartCardProps) {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const isMonth = range === 'month';
  const chartWidth = Math.max(280, width - theme.spacing.md * 2 - 32);
  const chartHeight =
    chartHeightOverride || (isMonth ? MONTH_CHART_HEIGHT : CHART_HEIGHT);
  const slotWidth = chartWidth / Math.max(points.length, 1);
  const barWidth = Math.max(
    isMonth ? 5 : 18,
    Math.min(isMonth ? 7 : 22, slotWidth * (isMonth ? 0.62 : 0.48)),
  );
  const barSpacing = Math.max(0, slotWidth - barWidth);
  const edgeSpacing = barSpacing / 2;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedPoint = points.find(point => point.id === selectedId);

  const maxValue = useMemo(() => {
    const dataMax = Math.max(0, ...points.map(point => point.value));
    const targetFitsDomain =
      targetValue && dataMax > 0 && targetValue <= dataMax * 1.35;
    const domainMax = Math.max(dataMax, targetFitsDomain ? targetValue : 0);

    return Math.max(1, Math.ceil(domainMax * DOMAIN_HEADROOM));
  }, [points, targetValue]);

  const chartData = useMemo<barDataItem[]>(
    () =>
      points.map(point => ({
        value: point.value,
        label: '',
        frontColor: primaryColor,
        onPress: () =>
          setSelectedId(current => (current === point.id ? null : point.id)),
      })),
    [points, primaryColor],
  );

  const getAxisLabel = (point: ProgressChartPoint, index: number) => {
    if (!isMonth) {
      return point.label;
    }

    const day = Number(point.label);
    const isLastDay = index === points.length - 1;
    const shouldShowDay =
      day === 1 || day === 5 || day % 5 === 0 || isLastDay;

    return shouldShowDay ? point.label : '';
  };

  const targetPosition =
    hasData && targetValue && targetValue > 0
      ? Math.min(targetValue / maxValue, 1) * chartHeight
      : null;

  const styles = StyleSheet.create({
    card: {
      padding: 16,
      borderRadius: theme.radii.md,
      gap: hasData ? 12 : 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    titleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.bold,
    },
    summary: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      lineHeight: 14,
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      columnGap: 14,
      rowGap: 6,
    },
    monthLegend: {
      marginBottom: 2,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 24,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 2,
    },
    legendItemActive: {
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: 8,
    },
    swatch: {
      width: 8,
      height: 8,
      borderRadius: 999,
    },
    dash: {
      width: 13,
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.textSecondary,
      opacity: 0.55,
    },
    legendLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      lineHeight: 14,
    },
    chartShell: {
      overflow: 'hidden',
      position: 'relative',
    },
    monthChartShell: {
      paddingTop: 2,
    },
    selectedInfo: {
      alignSelf: 'flex-start',
      minHeight: 30,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    selectedDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: primaryColor,
    },
    selectedText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
      lineHeight: 14,
    },
    targetLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderStyle: 'dashed',
      borderColor: theme.colors.textSecondary,
      opacity: 0.34,
      zIndex: 1,
    },
    monthTargetLine: {
      opacity: 0.26,
    },
    emptyShell: {
      height: EMPTY_CHART_HEIGHT,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    emptyCell: {
      flex: 1,
      alignItems: 'center',
    },
    emptyTick: {
      width: isMonth ? 8 : 22,
      height: 3,
      borderRadius: 999,
      backgroundColor: primaryColor,
      opacity: 0.18,
    },
    labelRow: {
      minHeight: 18,
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 6,
    },
    labelCell: {
      flex: 1,
      alignItems: 'center',
      minWidth: 0,
    },
    monthLabelCell: {
      overflow: 'visible',
    },
    label: {
      width: '100%',
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      lineHeight: 12,
      textAlign: 'center',
      includeFontPadding: false,
      textTransform: 'lowercase',
    },
    monthLabel: {
      width: 26,
    },
    monthFirstLabel: {
      transform: [{ translateX: 8 }],
    },
    emptyNote: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 16,
      marginTop: -2,
    },
    metrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: 8,
      rowGap: 8,
      paddingTop: hasData ? 4 : 2,
    },
    monthMetrics: {
      paddingTop: hasData ? 8 : 2,
    },
    metric: {
      width: '48%',
      minHeight: 52,
      gap: 4,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 9,
      justifyContent: 'center',
    },
    metricLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      lineHeight: 14,
    },
    metricValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 18,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon}
          <Text style={styles.title}>{title}</Text>
        </View>
        {summary ? <Text style={styles.summary}>{summary}</Text> : null}
      </View>

      <View style={[styles.legend, isMonth ? styles.monthLegend : null]}>
        {legendItems.map(item => (
          <Pressable
            key={item.label}
            disabled={!item.onPress}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.legendItem,
              item.active ? styles.legendItemActive : null,
              pressed && item.onPress ? { opacity: 0.84 } : null,
            ]}
          >
            {item.dashed ? (
              <View style={styles.dash} />
            ) : (
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: item.color || primaryColor },
                ]}
              />
            )}
            <Text style={styles.legendLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {selectedPoint ? (
        <View style={styles.selectedInfo}>
          <View style={styles.selectedDot} />
          <Text style={styles.selectedText}>
            {selectedPoint.tooltipLabel} · {selectedPoint.tooltipValue}
          </Text>
        </View>
      ) : null}

      <View
        style={[styles.chartShell, isMonth ? styles.monthChartShell : null]}
      >
        {hasData ? (
          <>
            {typeof targetPosition === 'number' ? (
              <View
                style={[
                  styles.targetLine,
                  isMonth ? styles.monthTargetLine : null,
                  { bottom: LABEL_AREA_HEIGHT + targetPosition },
                ]}
              />
            ) : null}
            <BarChart
              data={chartData}
              height={chartHeight}
              width={chartWidth}
              maxValue={maxValue}
              noOfSections={3}
              barWidth={barWidth}
              spacing={barSpacing}
              initialSpacing={edgeSpacing}
              endSpacing={edgeSpacing}
              disableScroll
              isAnimated
              animationDuration={450}
              roundedTop
              roundedBottom={false}
              barBorderTopLeftRadius={isMonth ? 4 : 8}
              barBorderTopRightRadius={isMonth ? 4 : 8}
              hideYAxisText
              yAxisThickness={0}
              xAxisThickness={0}
              hideRules
              hideOrigin
              yAxisLabelWidth={0}
              xAxisLabelsHeight={0}
              labelsDistanceFromXaxis={0}
              xAxisLabelTextStyle={styles.label}
              backgroundColor="transparent"
              activeOpacity={0.82}
            />
            <View style={styles.labelRow}>
              {points.map((point, index) => (
                <View
                  key={point.id}
                  style={[
                    styles.labelCell,
                    isMonth ? styles.monthLabelCell : null,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.label,
                      isMonth ? styles.monthLabel : null,
                      isMonth && index === 0 ? styles.monthFirstLabel : null,
                    ]}
                  >
                    {getAxisLabel(point, index)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.emptyShell}>
              {points.map(point => (
                <View key={point.id} style={styles.emptyCell}>
                  <View style={styles.emptyTick} />
                </View>
              ))}
            </View>
            <View style={styles.labelRow}>
              {points.map((point, index) => (
                <View
                  key={point.id}
                  style={[
                    styles.labelCell,
                    isMonth ? styles.monthLabelCell : null,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.label,
                      isMonth ? styles.monthLabel : null,
                      isMonth && index === 0 ? styles.monthFirstLabel : null,
                    ]}
                  >
                    {getAxisLabel(point, index)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {!hasData ? <Text style={styles.emptyNote}>{emptyMessage}</Text> : null}

      {metrics?.length ? (
        <View style={[styles.metrics, isMonth ? styles.monthMetrics : null]}>
          {metrics.map(metric => (
            <View key={metric.label} style={styles.metric}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {footer}
    </Card>
  );
}
