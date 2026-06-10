import { SearchField } from '@app/components/ui';

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
  return (
    <SearchField
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
    />
  );
}
