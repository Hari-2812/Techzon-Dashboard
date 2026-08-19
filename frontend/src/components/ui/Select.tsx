import React from 'react';
import { cn } from '../../utils/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-[var(--radius-md)] border bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          error 
            ? "border-[var(--color-error)] focus:ring-[var(--color-error)]" 
            : "border-[var(--color-border-subtle)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";
