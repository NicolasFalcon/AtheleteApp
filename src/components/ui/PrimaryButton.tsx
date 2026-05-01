import { Button } from '@app/components/ui/Button';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function PrimaryButton(props: PrimaryButtonProps) {
  return <Button {...props} variant="primary" />;
}
