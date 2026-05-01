import {WorkoutSegmentedControl} from '@app/features/workouts/components/WorkoutSegmentedControl';

type EllieSegmentedControlProps = {
  value: 'analysis' | 'chat';
  onChange: (value: 'analysis' | 'chat') => void;
};

export function EllieSegmentedControl({
  value,
  onChange,
}: EllieSegmentedControlProps) {
  return (
    <WorkoutSegmentedControl
      value={value}
      highlighted
      options={[
        {key: 'analysis', label: 'Análisis'},
        {key: 'chat', label: 'Habla con ELLIE'},
      ]}
      onChange={onChange}
    />
  );
}
