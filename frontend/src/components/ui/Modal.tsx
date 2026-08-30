import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Add escape key listener for accessibility
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Optional: Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className={cn("bg-[var(--color-surface-card)] rounded-[var(--radius-2xl)] shadow-2xl w-full flex flex-col transform transition-transform duration-300 max-h-[90vh] overflow-hidden", width)} 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--color-border-subtle)] flex justify-between items-center bg-[var(--color-surface-light)] flex-shrink-0">
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-border-subtle)] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            aria-label="Close modal"
          >
            <X size={20}/>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
