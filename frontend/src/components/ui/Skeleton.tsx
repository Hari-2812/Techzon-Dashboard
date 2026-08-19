import React from 'react';
import { cn } from '../../utils/cn';

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--color-border-subtle)]", className)}
      {...props}
    />
  );
};
