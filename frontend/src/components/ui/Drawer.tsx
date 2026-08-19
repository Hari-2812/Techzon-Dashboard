import React from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}

export const Drawer = ({ isOpen, onClose, title, subtitle, children, width = "w-[400px]" }: DrawerProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div 
        className={cn("h-full bg-[var(--color-surface-bg)] shadow-2xl border-l border-[var(--color-border-subtle)] flex flex-col transform transition-transform duration-300", width)} 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--color-border-subtle)] flex justify-between items-start bg-[var(--color-primary)] text-white">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            {subtitle && <p className="text-white/80 font-medium mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};
