import React from 'react';
import { Card } from './Card';
import { cn } from '../../utils/cn';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export const KpiCard = ({ label, value, icon, color, className }: KpiCardProps) => {
  const colorMap = {
    primary: "border-[var(--color-primary)] text-[var(--color-primary)]",
    accent: "border-[var(--color-accent)] text-[var(--color-accent)]",
    success: "border-[var(--color-success)] text-[var(--color-success)]",
    warning: "border-[var(--color-warning)] text-[var(--color-warning)]",
    error: "border-[var(--color-error)] text-[var(--color-error)]",
    info: "border-[var(--color-info)] text-[var(--color-info)]",
  };

  const activeColor = color ? colorMap[color] : "border-transparent text-[var(--color-text-primary)]";

  return (
    <Card className={cn("p-5 flex flex-col justify-between min-h-[120px]", color && `border-t-4 ${activeColor.split(' ')[0]}`, className)}>
      <div className="flex justify-between items-start">
        <p className="text-[var(--color-text-secondary)] font-medium text-sm tracking-tight">{label}</p>
        {icon && (
          <div className={cn("p-2 bg-[var(--color-surface-light)] rounded-[var(--radius-lg)]", activeColor.split(' ')[1])}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between mt-4">
        <h3 className={cn("text-3xl font-black font-mono", color ? activeColor.split(' ')[1] : "text-[var(--color-text-primary)]")}>
          {value}
        </h3>
      </div>
    </Card>
  );
};
