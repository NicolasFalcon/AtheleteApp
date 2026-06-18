import { MoreHorizontal } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chip, HorizontalItemRail } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

type EllieChatContextChipsProps = {
  chips: Array<{
    label: string;
    prompt: string;
  }>;
  hasHistory?: boolean;
  isClearing?: boolean;
  onSelectPrompt: (prompt: string) => void;
  onClearChat: () => void;
};

export function EllieChatContextChips({
  chips,
  hasHistory = false,
  isClearing = false,
  onSelectPrompt,
  onClearChat,
}: EllieChatContextChipsProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    rail: {
      gap: 8,
      paddingRight: theme.spacing.sm,
    },
    chip: {
      minHeight: 32,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: 'transparent',
    },
    chipLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
    },
    wrapper: {
      gap: 8,
    },
    clearButton: {
      alignSelf: 'flex-end',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    clearLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.medium,
    },
  });

  return (
    <View style={styles.wrapper}>
      <HorizontalItemRail contentStyle={styles.rail}>
        {chips.map(chip => (
          <Chip
            key={chip.label}
            onPress={() => onSelectPrompt(chip.prompt)}
            style={styles.chip}
          >
            <Text style={styles.chipLabel}>{chip.label}</Text>
          </Chip>
        ))}
      </HorizontalItemRail>
      {hasHistory ? (
        <Pressable
          disabled={isClearing}
          onPress={onClearChat}
          style={styles.clearButton}
        >
          <MoreHorizontal color={theme.colors.textSecondary} size={14} />
          <Text style={styles.clearLabel}>
            {isClearing ? 'Borrando historial...' : 'Borrar conversación'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
