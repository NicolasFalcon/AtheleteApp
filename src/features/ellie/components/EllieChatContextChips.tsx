import {Pressable, StyleSheet, Text} from 'react-native';
import {Chip, HorizontalItemRail} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';

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
  const {theme} = useAppTheme();

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
    clearButton: {
      minHeight: 32,
      paddingHorizontal: 12,
      borderRadius: theme.radii.pill,
      backgroundColor: '#F6E8E6',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#E9C4BE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearLabel: {
      color: '#C3473B',
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
  });

  return (
    <HorizontalItemRail contentStyle={styles.rail}>
      {hasHistory ? (
        <Pressable
          disabled={isClearing}
          onPress={onClearChat}
          style={({pressed}) => [
            styles.clearButton,
            pressed && !isClearing ? {opacity: 0.86} : null,
          ]}>
          <Text style={styles.clearLabel}>
            {isClearing ? 'Borrando...' : 'Borrar'}
          </Text>
        </Pressable>
      ) : null}
      {chips.map(chip => (
        <Chip
          key={chip.label}
          onPress={() => onSelectPrompt(chip.prompt)}
          style={styles.chip}>
          <Text style={styles.chipLabel}>{chip.label}</Text>
        </Chip>
      ))}
    </HorizontalItemRail>
  );
}
