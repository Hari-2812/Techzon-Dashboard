import React from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export const Modal = ({ isOpen, onClose, title, children, width = "max-w-md" }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity p-4">
      <div 
        className={cn("bg-[var(--color-surface-card)] rounded-[var(--radius-2xl)] shadow-2xl w-full flex flex-col transform transition-transform duration-300 max-h-[90vh] overflow-hidden", width)} 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--color-border-subtle)] flex justify-between items-center bg-[var(--color-surface-light)] flex-shrink-0">
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">{title}</h2>
          <button onClick={onClose} className="p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-border-subtle)] rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
