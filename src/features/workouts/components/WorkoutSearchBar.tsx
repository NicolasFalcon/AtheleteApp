import {Search} from 'lucide-react-native';
import {StyleSheet, TextInput, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type WorkoutSearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
};

export function WorkoutSearchBar({
  value,
  onChangeText,
  placeholder,
}: WorkoutSearchBarProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      minHeight: 44,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    input: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      paddingVertical: 10,
    },
  });

  return (
    <View style={styles.container}>
      <Search color={theme.colors.textSecondary} size={18} strokeWidth={2} />
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
