'use client';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { FaTimes } from 'react-icons/fa';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-white rounded-2xl shadow-2xl w-full',
          sizeClasses[size],
          'max-h-[90vh]',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className={cn('p-6', !title && 'pt-6')}>{children}</div>
      </div>
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm -z-10"
        onClick={onClose}
      />
    </div>
  );

  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
};

export default Modal;

