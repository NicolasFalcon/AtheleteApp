import { cn } from '@/lib/utils';

interface Core33StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export function Core33StepIndicator({ currentStep, totalSteps = 4 }: Core33StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: totalSteps }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            i + 1 === currentStep
              ? 'bg-primary w-5'
              : i + 1 < currentStep
                ? 'bg-primary w-1.5'
                : 'bg-border w-1.5'
          )}
        />
      ))}
    </div>
  );
}
