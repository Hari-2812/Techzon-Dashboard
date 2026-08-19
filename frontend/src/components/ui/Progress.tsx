import React from 'react';
import { cn } from '../../utils/cn';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  indicatorColor?: string;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, indicatorColor = "bg-[var(--color-primary)]", ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div
        ref={ref}
        className={cn("relative h-2 w-full overflow-hidden rounded-full bg-[var(--color-border-subtle)]", className)}
        {...props}
      >
        <div
          className={cn("h-full w-full flex-1 transition-all", indicatorColor)}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";
