import {StyleSheet, Text, View} from 'react-native';
import {Chip, HorizontalItemRail} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';

type EllieQuickQuestionChipsProps = {
  chips: Array<{label: string; prompt: string}>;
  onSelect: (prompt: string) => void;
};

export function EllieQuickQuestionChips({
  chips,
  onSelect,
}: EllieQuickQuestionChipsProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.3,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 4,
      marginBottom: 10,
    },
    chip: {
      minHeight: 34,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    label: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
  });

  return (
    <View>
      <Text style={styles.title}>Empieza con una pregunta útil</Text>
      <Text style={styles.subtitle}>
        ELLIE la dejará escrita en el chat para que la revises antes de enviar.
      </Text>
      <HorizontalItemRail>
        {chips.map(chip => (
          <Chip
            key={chip.label}
            onPress={() => onSelect(chip.prompt)}
            style={styles.chip}>
            <Text style={styles.label}>{chip.label}</Text>
          </Chip>
        ))}
      </HorizontalItemRail>
    </View>
  );
}
