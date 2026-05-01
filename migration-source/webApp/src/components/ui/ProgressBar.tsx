import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  size = 'md',
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-full bg-secondary',
        size === 'sm' && 'h-1.5',
        size === 'md' && 'h-2',
        size === 'lg' && 'h-3',
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500 ease-out bg-primary',
          barClassName
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
