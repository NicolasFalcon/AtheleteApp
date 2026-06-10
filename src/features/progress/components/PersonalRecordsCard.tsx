import { useMemo } from 'react';
import { ChevronRight, Trophy } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { formatPRValue, type PersonalRecord } from '@app/shared';

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

  const styles = StyleSheet.create({
    card: {
      padding: 16,
      borderRadius: theme.radii.md,
      gap: 12,
    },
    header: {
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
    list: {
      gap: 2,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 20,
    },
    row: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    rowLast: {
      borderBottomWidth: 0,
      paddingBottom: 4,
    },
    textGroup: {
      flex: 1,
      gap: 3,
    },
    exerciseName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.medium,
    },
    value: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
    },
    rightMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    count: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Trophy color={theme.colors.textPrimary} size={16} strokeWidth={2} />
        <Text style={styles.title}>Récords personales</Text>
      </View>

      {summaries.length === 0 ? (
        <Text style={styles.emptyText}>
          Cuando registres tus primeros PRs, aparecerán aquí con sus mejores
          marcas y accesos rápidos al historial.
        </Text>
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
                  <Text style={styles.value}>
                    {formatPRValue(summary.latest)}
                  </Text>
                </View>
                <View style={styles.rightMeta}>
                  <Text style={styles.count}>
                    {summary.total} PR{summary.total === 1 ? '' : 's'}
                  </Text>
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
