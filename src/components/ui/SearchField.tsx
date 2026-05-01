import {Search} from 'lucide-react-native';
import {StyleSheet, TextInput, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
};

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: SearchFieldProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      minHeight: 48,
      borderRadius: theme.radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    input: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      paddingVertical: theme.spacing.sm,
    },
  });

  return (
    <View style={styles.container}>
      <Search color={theme.colors.textSecondary} size={17} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.input}
      />
    </View>
  );
}
