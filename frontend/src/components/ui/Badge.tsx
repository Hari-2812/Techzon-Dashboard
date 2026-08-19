import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', children, ...props }, ref) => {
    
    const variants = {
      success: "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]", // Accessible green
      warning: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]", // Accessible amber
      error: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]", // Accessible red
      info: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]", // Accessible blue
      primary: "bg-[var(--color-primary-50)] text-[var(--color-primary)] border-[var(--color-primary-200)]",
      neutral: "bg-[var(--color-surface-light)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border tracking-wider uppercase",
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";
