'use client';
import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full px-4 py-2.5 border rounded-lg transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[#FF9AA2] focus:border-transparent',
          error
            ? 'border-[#EF4444] focus:ring-[#EF4444]'
            : 'border-neutral-300 hover:border-[#FF9AA2]/50',
          'placeholder:text-neutral-400',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-[#EF4444]">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-neutral-500">{helperText}</p>
      )}
    </div>
  );
};

export default Input;

