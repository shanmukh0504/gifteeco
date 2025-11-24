'use client';
import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[var(--color-button)] text-white hover:bg-[var(--color-button-hover)] focus:ring-[var(--color-button)] shadow-sm hover:shadow-md',
    secondary: 'bg-[var(--color-button-secondary)] text-neutral-700 hover:bg-[var(--color-button-secondary-hover)] focus:ring-[var(--color-button-secondary)] shadow-sm hover:shadow-md',
    outline: 'border-2 border-[var(--color-button)] text-[var(--color-button)] hover:bg-[var(--color-primary-soft)] focus:ring-[var(--color-button)]',
    ghost: 'text-[var(--color-button)] hover:bg-[var(--color-primary-soft)] focus:ring-[var(--color-button)]',
    danger: 'bg-[#EF4444] text-white hover:bg-[#DC2626] focus:ring-[#EF4444] shadow-sm hover:shadow-md',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
