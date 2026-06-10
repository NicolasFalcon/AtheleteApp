import { SegmentedControl } from '@app/components/ui';

type Option<T extends string> = {
  key: T;
  label: string;
};

type WorkoutSegmentedControlProps<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  highlighted?: boolean;
};

export function WorkoutSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  highlighted = false,
}: WorkoutSegmentedControlProps<T>) {
  return (
    <SegmentedControl
      value={value}
      options={options}
      onChange={onChange}
      highlighted={highlighted}
    />
  );
}
