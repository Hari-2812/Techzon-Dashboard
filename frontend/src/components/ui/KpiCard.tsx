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
    primary: "border-[var(--color-primary)] text-[var(--color-primary)] bg-indigo-50/50",
    accent: "border-[var(--color-accent)] text-[var(--color-accent)] bg-orange-50/50",
    success: "border-[var(--color-success)] text-[var(--color-success)] bg-green-50/50",
    warning: "border-[var(--color-warning)] text-[var(--color-warning)] bg-yellow-50/50",
    error: "border-[var(--color-error)] text-[var(--color-error)] bg-red-50/50",
    info: "border-[var(--color-info)] text-[var(--color-info)] bg-blue-50/50",
  };

  const activeColor = color ? colorMap[color] : "border-transparent text-[var(--color-text-primary)] bg-transparent";

  return (
    <Card className={cn("relative overflow-hidden p-6 flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-md transition-all duration-200 border-[var(--color-border-subtle)]", color && `border-t-4 ${activeColor.split(' ')[0]}`, className)}>
      <div className="flex justify-between items-start z-10">
        <p className="text-gray-500 font-semibold text-sm tracking-wide uppercase">{label}</p>
        {icon && (
          <div className={cn("p-2.5 rounded-xl", activeColor.split(' ')[1], activeColor.split(' ')[2])}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between mt-4 z-10">
        <h3 className={cn("text-4xl font-extrabold tracking-tight", color ? activeColor.split(' ')[1] : "text-[var(--color-text-primary)]")}>
          {value}
        </h3>
      </div>
    </Card>
  );
};
