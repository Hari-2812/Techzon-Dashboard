import React from 'react';
import { cn } from '../../utils/cn';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  fallback: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, fallback, size = 'md', ...props }, ref) => {
    const sizes = {
      sm: "w-8 h-8 text-xs",
      md: "w-10 h-10 text-sm",
      lg: "w-12 h-12 text-base",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full bg-[var(--color-primary-container)] text-white items-center justify-center font-semibold uppercase",
          sizes[size],
          className
        )}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={fallback}
            className="aspect-square h-full w-full object-cover"
          />
        ) : (
          <span>{fallback}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";
