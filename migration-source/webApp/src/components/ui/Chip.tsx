import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'accent' | 'outline' | 'selected';
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

export function Chip({
  children,
  variant = 'default',
  size = 'md',
  onClick,
  className,
}: ChipProps) {
  const baseStyles = 'inline-flex items-center rounded-full font-medium transition-all duration-200';
  
  const variantStyles = {
    default: 'bg-secondary text-secondary-foreground',
    primary: 'bg-primary text-primary-foreground',
    accent: 'bg-secondary text-foreground',
    outline: 'border border-border bg-transparent text-muted-foreground',
    selected: 'border border-foreground bg-foreground text-background shadow-sm',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-sm',
  };

  return (
    <span
      onClick={onClick}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        onClick && 'cursor-pointer hover:opacity-90 active:scale-95',
        className
      )}
    >
      {children}
    </span>
  );
}
