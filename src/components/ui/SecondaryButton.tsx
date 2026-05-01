import { Button } from '@app/components/ui/Button';

type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  ghost?: boolean;
};

export function SecondaryButton({
  ghost = false,
  ...props
}: SecondaryButtonProps) {
  return <Button {...props} variant={ghost ? 'ghost' : 'secondary'} />;
}
