import {StyleSheet, Text, View} from 'react-native';
import {Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {type PersonalRecord} from '@app/shared';
import {PrHistoryItem} from './PrHistoryItem';

type PrHistoryListProps = {
  title: string;
  records: PersonalRecord[];
  onDelete?: (recordId: string) => void;
};

export function PrHistoryList({
  title,
  records,
  onDelete,
}: PrHistoryListProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      gap: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    empty: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 21,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
  });

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>
        {title} ({records.length})
      </Text>
      {records.length === 0 ? (
        <Text style={styles.empty}>Todavía no hay registros para este filtro.</Text>
      ) : (
        <View>
          {records.map((record, index) => (
            <View key={record.id}>
              <PrHistoryItem
                record={record}
                onDelete={onDelete ? () => onDelete(record.id) : undefined}
              />
              {index < records.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
