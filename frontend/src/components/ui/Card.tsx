import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-[var(--color-surface-card)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] border border-[var(--color-border-subtle)] overflow-hidden",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("p-6 flex flex-col gap-1.5 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-light)]", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn("text-lg font-bold leading-none tracking-tight text-[var(--color-text-primary)]", className)}
        {...props}
      >
        {children}
      </h3>
    );
  }
);
CardTitle.displayName = "CardTitle";

export const CardContent = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("p-6 pt-0", className)} {...props}>
        {children}
      </div>
    );
  }
);
CardContent.displayName = "CardContent";
