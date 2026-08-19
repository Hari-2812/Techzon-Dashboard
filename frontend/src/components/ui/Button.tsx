import React from 'react';
import { cn } from '../../utils/cn'; // Assuming tailwind-merge is set up

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth = false, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none radius-md";
    
    const variants = {
      primary: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-container)] focus:ring-[var(--color-primary)] shadow-sm",
      secondary: "bg-[var(--color-surface-light)] text-[var(--color-text-primary)] hover:bg-[var(--color-border-subtle)] focus:ring-[var(--color-border-subtle)]",
      accent: "bg-[var(--color-accent)] text-white hover:bg-[#FF8A3A] focus:ring-[var(--color-accent)] shadow-sm",
      danger: "bg-[var(--color-error)] text-white hover:bg-red-700 focus:ring-[var(--color-error)] shadow-sm",
      outline: "border-2 border-[var(--color-border-subtle)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-light)] focus:ring-[var(--color-border-subtle)]",
      ghost: "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-light)] hover:text-[var(--color-text-primary)]",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 py-2 text-sm",
      lg: "h-12 px-8 text-base",
      icon: "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
