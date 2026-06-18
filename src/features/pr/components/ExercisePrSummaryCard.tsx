import { ChevronRight, Trophy } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';
import {
  formatPRValue,
  getBestPR,
  prTypeLabels,
  type PersonalRecord,
  type PRType,
} from '@app/shared';

type ExercisePrSummaryCardProps = {
  records: PersonalRecord[];
  onRegisterPr: () => void;
  onViewHistory: () => void;
};

export function ExercisePrSummaryCard({
  records,
  onRegisterPr,
  onViewHistory,
}: ExercisePrSummaryCardProps) {
  const { theme } = useAppTheme();
  const recordTypes = [
    ...new Set(records.map(record => record.prType)),
  ] as PRType[];
  const bests = recordTypes
    .map(type => getBestPR(records, type))
    .filter(Boolean) as PersonalRecord[];

  const styles = StyleSheet.create({
    card: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    historyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    historyButtonLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 20,
    },
    emptyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    emptyCopy: {
      flex: 1,
      gap: 2,
    },
    compactButton: {
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.pill,
      width: undefined,
      flexShrink: 0,
    },
    compactButtonLabel: {
      fontSize: theme.typography.sizes.bodySm,
    },
    bestPanel: {
      marginTop: theme.spacing.xs,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    bestHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    bestLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    bestValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.titleSm,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.3,
    },
    bestDate: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    extraCount: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
      textAlign: 'right',
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Trophy color={theme.colors.textPrimary} size={16} strokeWidth={2} />
          <Text style={styles.title}>Tus mejores marcas</Text>
        </View>
        {records.length > 0 ? (
          <Pressable
            onPress={onViewHistory}
            style={({ pressed }) => [
              styles.historyButton,
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Text style={styles.historyButtonLabel}>Ver progreso</Text>
            <ChevronRight
              color={theme.colors.textSecondary}
              size={14}
              strokeWidth={2}
            />
          </Pressable>
        ) : null}
      </View>

      {bests.length === 0 ? (
        <View style={styles.emptyRow}>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyText}>
              Aún no tienes PRs para este ejercicio.
            </Text>
            <Text style={styles.bestDate}>Registra tu primera marca.</Text>
          </View>
          <Button
            label="Registrar PR"
            variant="outline"
            onPress={onRegisterPr}
            fullWidth={false}
            style={styles.compactButton}
            textStyle={styles.compactButtonLabel}
          />
        </View>
      ) : (
        <>
          <View style={styles.bestPanel}>
            <View style={styles.bestHeader}>
              <View>
                <Text style={styles.bestLabel}>
                  {prTypeLabels[bests[0].prType]}
                </Text>
                <Text style={styles.bestValue}>{formatPRValue(bests[0])}</Text>
                <Text style={styles.bestDate}>
                  {new Date(bests[0].recordedAt).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
              {bests.length > 1 ? (
                <Text style={styles.extraCount}>
                  +{bests.length - 1} marcas
                </Text>
              ) : null}
            </View>
          </View>
          <Button
            label="Nuevo PR"
            variant="outline"
            onPress={onRegisterPr}
            fullWidth={false}
            style={styles.compactButton}
            textStyle={styles.compactButtonLabel}
          />
        </>
      )}
    </Card>
  );
}
