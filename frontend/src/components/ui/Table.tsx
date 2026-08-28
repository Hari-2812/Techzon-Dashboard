import React from 'react';
import { cn } from '../../utils/cn';

export const TableContainer = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("w-full overflow-auto bg-[var(--color-surface-card)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] border border-[var(--color-border-subtle)]", className)} {...props}>
    {children}
  </div>
);

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <table ref={ref} className={cn("w-full caption-bottom text-sm text-left", className)} {...props} />
  )
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("bg-[var(--color-surface-light)] border-b border-[var(--color-border-subtle)]", className)} {...props} />
  )
);
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("divide-y divide-[var(--color-border-subtle)] bg-[var(--color-surface-card)]", className)} {...props} />
  )
);
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "transition-colors hover:bg-[var(--color-surface-light)]/50 data-[state=selected]:bg-[var(--color-surface-light)]",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-6 align-middle font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider text-xs whitespace-nowrap",
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-6 py-4 align-middle text-[var(--color-text-primary)] whitespace-nowrap", className)} {...props} />
  )
);
TableCell.displayName = "TableCell";
