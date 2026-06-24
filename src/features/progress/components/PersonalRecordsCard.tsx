import { useMemo } from 'react';
import { ChevronRight, Medal, Trophy } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { formatPRValue, prTypeLabels, type PersonalRecord } from '@app/shared';

type PersonalRecordsCardProps = {
  records: Array<PersonalRecord & { exerciseName: string }>;
  onOpen: (exerciseId?: string, exerciseName?: string) => void;
};

export function PersonalRecordsCard({
  records,
  onOpen,
}: PersonalRecordsCardProps) {
  const { theme } = useAppTheme();

  const summaries = useMemo(() => {
    const groups = new Map<
      string,
      Array<PersonalRecord & { exerciseName: string }>
    >();

    records.forEach(record => {
      const current = groups.get(record.exerciseId) || [];
      current.push(record);
      groups.set(record.exerciseId, current);
    });

    return Array.from(groups.values())
      .map(group => {
        const latest = [...group].sort((left, right) =>
          right.recordedAt.localeCompare(left.recordedAt),
        )[0];

        return {
          exerciseId: latest.exerciseId,
          exerciseName: latest.exerciseName,
          latest,
          total: group.length,
        };
      })
      .sort((left, right) =>
        right.latest.recordedAt.localeCompare(left.latest.recordedAt),
      )
      .slice(0, 4);
  }, [records]);

  const totalPrs = records.length;

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
    });
  }

  const styles = StyleSheet.create({
    card: {
      padding: 16,
      borderRadius: theme.radii.md,
      gap: 14,
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
    summaryPill: {
      minHeight: 28,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryPillText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
      lineHeight: 14,
    },
    list: {
      gap: 8,
    },
    empty: {
      minHeight: 126,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 16,
      justifyContent: 'center',
      gap: 10,
    },
    emptyIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 18,
    },
    row: {
      minHeight: 76,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderRadius: theme.radii.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    rowLast: {
      marginBottom: 0,
    },
    textGroup: {
      flex: 1,
      gap: 6,
    },
    exerciseName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 19,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    badge: {
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    badgeText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.medium,
      lineHeight: 12,
    },
    dateText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      lineHeight: 14,
    },
    rightMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    valueStack: {
      alignItems: 'flex-end',
      gap: 3,
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 19,
    },
    count: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      lineHeight: 14,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Trophy color={theme.colors.textPrimary} size={16} strokeWidth={2} />
          <Text style={styles.title}>Récords personales</Text>
        </View>
        {totalPrs > 0 ? (
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>
              {totalPrs} PR{totalPrs === 1 ? '' : 's'}
            </Text>
          </View>
        ) : null}
      </View>

      {summaries.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Medal color={theme.colors.textSecondary} size={18} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.emptyTitle}>Aún no hay récords guardados</Text>
            <Text style={styles.emptyText}>
              Tus mejores marcas aparecerán aquí cuando registres tus primeros
              PRs.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.list}>
          {summaries.map((summary, index) => {
            const isLast = index === summaries.length - 1;
            return (
              <Pressable
                key={summary.exerciseId}
                onPress={() => onOpen(summary.exerciseId, summary.exerciseName)}
                style={({ pressed }) => [
                  styles.row,
                  isLast ? styles.rowLast : null,
                  pressed ? { opacity: 0.86 } : null,
                ]}
              >
                <View style={styles.textGroup}>
                  <Text style={styles.exerciseName}>
                    {summary.exerciseName}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {prTypeLabels[summary.latest.prType]}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>
                      {formatDate(summary.latest.recordedAt)}
                    </Text>
                  </View>
                </View>
                <View style={styles.rightMeta}>
                  <View style={styles.valueStack}>
                    <Text style={styles.value}>
                      {formatPRValue(summary.latest)}
                    </Text>
                    <Text style={styles.count}>
                      {summary.total} PR{summary.total === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <ChevronRight
                    color={theme.colors.textSecondary}
                    size={16}
                    strokeWidth={2}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}
