import {Check, X} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type QuizAnswerOptionProps = {
  label: string;
  text: string;
  selected: boolean;
  answered: boolean;
  correct: boolean;
  incorrectSelected: boolean;
  onPress: () => void;
};

export function QuizAnswerOption({
  label,
  text,
  selected,
  answered,
  correct,
  incorrectSelected,
  onPress,
}: QuizAnswerOptionProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    shell: {
      width: '100%',
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    active: {
      borderColor: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceMuted,
    },
    correct: {
      borderColor: '#2f8f4e',
      backgroundColor: '#2f8f4e10',
    },
    incorrect: {
      borderColor: theme.colors.danger,
      backgroundColor: `${theme.colors.danger}10`,
    },
    token: {
      width: 28,
      height: 28,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    tokenActive: {
      backgroundColor: theme.colors.accent,
    },
    tokenCorrect: {
      backgroundColor: '#2f8f4e',
    },
    tokenIncorrect: {
      backgroundColor: theme.colors.danger,
    },
    tokenLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.bold,
    },
    tokenLabelActive: {
      color: theme.colors.accentContrast,
    },
    content: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 20,
    },
  });

  const shellState = answered
    ? correct
      ? styles.correct
      : incorrectSelected
        ? styles.incorrect
        : null
    : selected
      ? styles.active
      : null;

  const tokenState = answered
    ? correct
      ? styles.tokenCorrect
      : incorrectSelected
        ? styles.tokenIncorrect
        : null
    : selected
      ? styles.tokenActive
      : null;

  const tokenLabelState = answered || selected ? styles.tokenLabelActive : null;

  return (
    <Pressable
      disabled={answered}
      onPress={onPress}
      style={({pressed}) => [
        styles.shell,
        shellState,
        pressed && !answered ? {transform: [{scale: 0.99}]} : null,
      ]}>
      <View style={[styles.token, tokenState]}>
        <Text style={[styles.tokenLabel, tokenLabelState]}>{label}</Text>
      </View>
      <Text style={styles.content}>{text}</Text>
      {answered && correct ? (
        <Check color="#2f8f4e" size={16} strokeWidth={2.2} />
      ) : null}
      {answered && incorrectSelected ? (
        <X color={theme.colors.danger} size={16} strokeWidth={2.2} />
      ) : null}
    </Pressable>
  );
}
