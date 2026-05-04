import {ChevronRight, Trophy} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Button, Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
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
  const {theme} = useAppTheme();
  const recordTypes = [...new Set(records.map(record => record.prType))] as PRType[];
  const bests = recordTypes
    .map(type => getBestPR(records, type))
    .filter(Boolean) as PersonalRecord[];

  const styles = StyleSheet.create({
    card: {
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
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
      lineHeight: 21,
    },
    bestRow: {
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      gap: 4,
    },
    bestRowLast: {
      paddingBottom: 0,
      borderBottomWidth: 0,
    },
    bestLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    bestValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    bestDate: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
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
            style={({pressed}) => [
              styles.historyButton,
              pressed ? {opacity: 0.85} : null,
            ]}>
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
        <>
          <Text style={styles.emptyText}>
            Aún no tienes PRs para este ejercicio. Registra tu primera marca para empezar a seguir tu progreso.
          </Text>
          <Button
            label="Registrar PR"
            variant="outline"
            onPress={onRegisterPr}
          />
        </>
      ) : (
        <>
          <View>
            {bests.map((record, index) => {
              const isLast = index === bests.length - 1;
              return (
                <View
                  key={record.id}
                  style={[styles.bestRow, isLast ? styles.bestRowLast : null]}>
                  <Text style={styles.bestLabel}>{prTypeLabels[record.prType]}</Text>
                  <Text style={styles.bestValue}>{formatPRValue(record)}</Text>
                  <Text style={styles.bestDate}>
                    {new Date(record.recordedAt).toLocaleDateString('es-CL', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
              );
            })}
          </View>
          <Button
            label="Nuevo PR"
            variant="outline"
            onPress={onRegisterPr}
          />
        </>
      )}
    </Card>
  );
}
