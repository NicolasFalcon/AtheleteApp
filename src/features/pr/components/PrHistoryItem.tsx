import {Trash2} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {formatPRValue, type PersonalRecord} from '@app/shared';

type PrHistoryItemProps = {
  record: PersonalRecord;
  onDelete?: () => void;
  compact?: boolean;
};

export function PrHistoryItem({
  record,
  onDelete,
  compact = false,
}: PrHistoryItemProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      paddingVertical: compact ? theme.spacing.sm : theme.spacing.md,
    },
    content: {
      flex: 1,
      gap: 4,
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: compact
        ? theme.typography.sizes.bodySm
        : theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    meta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      lineHeight: 18,
    },
    deleteButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
  });

  return (
    <View style={styles.row}>
      <View style={styles.content}>
        <Text style={styles.value}>{formatPRValue(record)}</Text>
        <Text style={styles.meta}>
          {new Date(record.recordedAt).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          {record.notes ? ` · ${record.notes}` : ''}
        </Text>
      </View>
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          style={({pressed}) => [
            styles.deleteButton,
            pressed ? {opacity: 0.86} : null,
          ]}>
          <Trash2 color={theme.colors.textSecondary} size={15} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}
