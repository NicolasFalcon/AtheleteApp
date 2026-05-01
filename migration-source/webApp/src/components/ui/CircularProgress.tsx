import { cn } from '@/lib/utils';

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  strokeWidth?: number;
  showValue?: boolean;
  valueLabel?: string;
  subLabel?: string;
  className?: string;
  progressColor?: string;
  trackColor?: string;
}

const sizes = {
  sm: 48,
  md: 64,
  lg: 96,
  xl: 120,
};

export function CircularProgress({
  value,
  max = 100,
  size = 'md',
  strokeWidth,
  showValue = true,
  valueLabel,
  subLabel,
  className,
  progressColor = 'stroke-primary',
  trackColor = 'stroke-border',
}: CircularProgressProps) {
  const diameter = sizes[size];
  const defaultStrokeWidth = size === 'sm' ? 4 : size === 'md' ? 5 : size === 'lg' ? 6 : 8;
  const stroke = strokeWidth ?? defaultStrokeWidth;
  const radius = (diameter - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={diameter}
        height={diameter}
        className="progress-ring"
      >
        {/* Track */}
        <circle
          className={trackColor}
          strokeWidth={stroke}
          fill="transparent"
          r={radius}
          cx={diameter / 2}
          cy={diameter / 2}
        />
        {/* Progress */}
        <circle
          className={cn(progressColor, 'transition-all duration-500 ease-out')}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={diameter / 2}
          cy={diameter / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            'font-bold text-foreground',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-xl',
            size === 'xl' && 'text-2xl',
          )}>
            {valueLabel ?? `${Math.round(percentage)}%`}
          </span>
          {subLabel && (
            <span className="text-xs text-muted-foreground">{subLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
