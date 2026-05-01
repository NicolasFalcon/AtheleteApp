import {WorkoutSegmentedControl} from '@app/features/workouts/components/WorkoutSegmentedControl';

type Option<T extends string> = {
  key: T;
  label: string;
};

type ProgressSegmentedControlProps<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  highlighted?: boolean;
};

export function ProgressSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  highlighted = false,
}: ProgressSegmentedControlProps<T>) {
  return (
    <WorkoutSegmentedControl
      value={value}
      options={options}
      onChange={onChange}
      highlighted={highlighted}
    />
  );
}
